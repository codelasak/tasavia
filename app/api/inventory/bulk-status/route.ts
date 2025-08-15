import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase client for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// PUT endpoint - Update multiple inventory items' status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      inventory_ids,
      physical_status,
      business_status,
      status_updated_by,
      notes
    } = body

    // Validation
    if (!inventory_ids || !Array.isArray(inventory_ids) || inventory_ids.length === 0) {
      return NextResponse.json(
        { error: 'inventory_ids array is required and cannot be empty' },
        { status: 400 }
      )
    }

    if (!physical_status && !business_status) {
      return NextResponse.json(
        { error: 'At least one status field (physical_status or business_status) is required' },
        { status: 400 }
      )
    }

    // Validate enum values
    const validPhysicalStatuses = ['depot', 'in_repair', 'in_transit']
    const validBusinessStatuses = ['available', 'reserved', 'sold']

    if (physical_status && !validPhysicalStatuses.includes(physical_status)) {
      return NextResponse.json(
        { error: `Invalid physical_status. Must be one of: ${validPhysicalStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    if (business_status && !validBusinessStatuses.includes(business_status)) {
      return NextResponse.json(
        { error: `Invalid business_status. Must be one of: ${validBusinessStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Limit bulk operations to prevent performance issues
    if (inventory_ids.length > 100) {
      return NextResponse.json(
        { error: 'Bulk operations are limited to 100 items at a time' },
        { status: 400 }
      )
    }

    // First, get current status for all items for validation
    const { data: currentItems, error: fetchError } = await supabase
      .from('inventory')
      .select(`
        inventory_id,
        physical_status,
        business_status,
        status,
        pn_master_table!inner(pn)
      `)
      .in('inventory_id', inventory_ids)

    if (fetchError) {
      console.error('Error fetching current items:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch inventory items', details: fetchError.message },
        { status: 500 }
      )
    }

    if (!currentItems || currentItems.length === 0) {
      return NextResponse.json(
        { error: 'No inventory items found with provided IDs' },
        { status: 404 }
      )
    }

    // Validate all items can have their status changed
    const validationErrors: Array<{ inventory_id: string; part_number: string; error: string }> = []
    
    for (const item of currentItems) {
      const validationResult = validateStatusTransition(
        { 
          physical_status: item.physical_status, 
          business_status: item.business_status 
        },
        { 
          physical_status: physical_status || item.physical_status, 
          business_status: business_status || item.business_status 
        }
      )

      if (!validationResult.valid) {
        validationErrors.push({
          inventory_id: item.inventory_id,
          part_number: (item as any).pn_master_table?.pn || 'Unknown',
          error: validationResult.reason || 'Invalid transition'
        })
      }
    }

    // If any validations failed, return errors without making changes
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Status transition validation failed for some items',
          validation_errors: validationErrors,
          valid_items: currentItems.length - validationErrors.length,
          total_items: currentItems.length
        },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (physical_status) {
      updateData.physical_status = physical_status
    }

    if (business_status) {
      updateData.business_status = business_status
    }

    if (status_updated_by) {
      updateData.status_updated_by = status_updated_by
    }

    if (notes) {
      updateData.notes = notes
    }

    // Perform bulk update
    const { data: updatedItems, error: updateError } = await supabase
      .from('inventory')
      .update(updateData)
      .in('inventory_id', inventory_ids)
      .select(`
        inventory_id,
        physical_status,
        business_status,
        status_updated_at,
        updated_at,
        pn_master_table(pn)
      `)

    if (updateError) {
      console.error('Error updating inventory items:', updateError)
      return NextResponse.json(
        { error: 'Failed to update inventory status', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updatedItems?.length || 0} inventory items`,
      data: {
        updated_items: updatedItems || [],
        update_summary: {
          total_requested: inventory_ids.length,
          total_updated: updatedItems?.length || 0,
          physical_status_applied: physical_status,
          business_status_applied: business_status,
          updated_by: status_updated_by,
          timestamp: new Date().toISOString()
        }
      }
    })

  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// Status transition validation logic (same as single update)
function validateStatusTransition(
  currentStatus: { physical_status: string; business_status: string },
  newStatus: { physical_status: string; business_status: string }
): { valid: boolean; reason?: string } {
  
  // Business rule: Can't sell items that are in repair
  if (newStatus.business_status === 'sold' && newStatus.physical_status === 'in_repair') {
    return {
      valid: false,
      reason: 'Cannot mark items as sold while they are in repair'
    }
  }

  // Business rule: Can't move sold items physically
  if (currentStatus.business_status === 'sold' && 
      newStatus.physical_status !== currentStatus.physical_status) {
    return {
      valid: false,
      reason: 'Cannot change physical status of sold items'
    }
  }

  // Business rule: Reserved items should generally be at depot or in transit
  if (newStatus.business_status === 'reserved' && newStatus.physical_status === 'in_repair') {
    return {
      valid: false,
      reason: 'Reserved items should not be in repair status'
    }
  }

  // All validations passed
  return { valid: true }
}