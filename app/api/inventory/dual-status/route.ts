import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase client for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET endpoint - Return inventory items with both physical and business status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const inventoryId = searchParams.get('inventory_id')
    const physicalStatus = searchParams.get('physical_status')
    const businessStatus = searchParams.get('business_status')

    let query = supabase
      .from('inventory')
      .select(`
        inventory_id,
        pn_id,
        sn,
        location,
        po_price,
        remarks,
        status,
        physical_status,
        business_status,
        status_updated_at,
        status_updated_by,
        created_at,
        updated_at,
        pn_master_table(
          pn,
          description
        ),
        accounts:status_updated_by(
          name
        )
      `)

    // Apply filters
    if (inventoryId) {
      query = query.eq('inventory_id', inventoryId)
    }
    
    if (physicalStatus) {
      query = query.eq('physical_status', physicalStatus)
    }
    
    if (businessStatus) {
      query = query.eq('business_status', businessStatus)
    }

    const { data, error } = await query.order('updated_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch inventory data', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    })

  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// PUT endpoint - Update physical and/or business status independently
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      inventory_id,
      physical_status,
      business_status,
      status_updated_by,
      notes
    } = body

    // Validation
    if (!inventory_id) {
      return NextResponse.json(
        { error: 'inventory_id is required' },
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

    // First, get current status for validation and history
    const { data: currentItem, error: fetchError } = await supabase
      .from('inventory')
      .select('inventory_id, physical_status, business_status, status')
      .eq('inventory_id', inventory_id)
      .single()

    if (fetchError) {
      console.error('Error fetching current item:', fetchError)
      return NextResponse.json(
        { error: 'Inventory item not found', details: fetchError.message },
        { status: 404 }
      )
    }

    // Business rules validation
    const validationResult = validateStatusTransition(
      { 
        physical_status: currentItem.physical_status, 
        business_status: currentItem.business_status 
      },
      { 
        physical_status: physical_status || currentItem.physical_status, 
        business_status: business_status || currentItem.business_status 
      }
    )

    if (!validationResult.valid) {
      return NextResponse.json(
        { error: 'Invalid status transition', details: validationResult.reason },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: any = {}

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
      updateData.remarks = notes
    }

    // If any status changed, stamp status_updated_at and updated_at
    if (
      (physical_status && physical_status !== currentItem.physical_status) ||
      (business_status && business_status !== currentItem.business_status)
    ) {
      updateData.status_updated_at = new Date().toISOString()
    }
    updateData.updated_at = new Date().toISOString()

    // Update the inventory item
    const { data: updatedItem, error: updateError } = await supabase
      .from('inventory')
      .update(updateData)
      .eq('inventory_id', inventory_id)
      .select('inventory_id, physical_status, business_status, status_updated_at, status_updated_by, updated_at')
      .single()

    if (updateError) {
      console.error('Error updating inventory:', updateError)
      return NextResponse.json(
        { error: 'Failed to update inventory status', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Inventory status updated successfully',
      data: updatedItem,
      changes: {
        physical_status_changed: physical_status && physical_status !== currentItem.physical_status,
        business_status_changed: business_status && business_status !== currentItem.business_status,
        previous_physical_status: currentItem.physical_status,
        previous_business_status: currentItem.business_status,
        new_physical_status: physical_status || currentItem.physical_status,
        new_business_status: business_status || currentItem.business_status
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

// Status transition validation logic
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
