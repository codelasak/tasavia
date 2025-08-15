import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase client for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET endpoint - Return status change history for inventory items
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const inventoryId = searchParams.get('inventory_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!inventoryId) {
      return NextResponse.json(
        { error: 'inventory_id parameter is required' },
        { status: 400 }
      )
    }

    // Get status change history from part_number_history table
    // This table tracks modifications which often involve status changes
    const { data: historyData, error: historyError } = await supabase
      .from('part_number_history')
      .select(`
        history_id,
        inventory_id,
        modification_date,
        modification_reason,
        traceability_notes,
        business_value_adjustment,
        is_active,
        created_at,
        modified_by_user_id,
        approved_by_user_id,
        approval_date,
        repair_order_id,
        modified_by:modified_by_user_id(name),
        approved_by:approved_by_user_id(name),
        original_pn:original_pn_id(pn, description),
        modified_pn:modified_pn_id(pn, description),
        repair_orders(repair_order_number, status)
      `)
      .eq('inventory_id', inventoryId)
      .order('modification_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (historyError) {
      console.error('Error fetching history:', historyError)
    }

    // Also get current inventory item details for context
    const { data: currentItem, error: itemError } = await supabase
      .from('inventory')
      .select(`
        inventory_id,
        physical_status,
        business_status,
        status,
        status_updated_at,
        status_updated_by,
        created_at,
        updated_at,
        pn_master_table(pn, description),
        accounts:status_updated_by(name)
      `)
      .eq('inventory_id', inventoryId)
      .single()

    if (itemError) {
      console.error('Error fetching current item:', itemError)
      return NextResponse.json(
        { error: 'Inventory item not found', details: itemError.message },
        { status: 404 }
      )
    }

    // Format the response to include both current status and history
    const response = {
      success: true,
      current_item: currentItem,
      status_history: historyData || [],
      pagination: {
        limit,
        offset,
        total: historyData?.length || 0,
        has_more: (historyData?.length || 0) === limit
      }
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// POST endpoint - Create a status change record (for explicit tracking)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      inventory_id,
      original_pn_id,
      modified_pn_id,
      modification_reason,
      traceability_notes,
      business_value_adjustment,
      modified_by_user_id,
      repair_order_id
    } = body

    // Validation
    if (!inventory_id || !original_pn_id || !modified_pn_id || !modification_reason) {
      return NextResponse.json(
        { error: 'Required fields: inventory_id, original_pn_id, modified_pn_id, modification_reason' },
        { status: 400 }
      )
    }

    // Verify inventory item exists
    const { data: inventoryItem, error: inventoryError } = await supabase
      .from('inventory')
      .select('inventory_id, pn_id')
      .eq('inventory_id', inventory_id)
      .single()

    if (inventoryError) {
      return NextResponse.json(
        { error: 'Inventory item not found', details: inventoryError.message },
        { status: 404 }
      )
    }

    // Verify part numbers exist
    const { data: partNumbers, error: partError } = await supabase
      .from('pn_master_table')
      .select('pn_id, pn')
      .in('pn_id', [original_pn_id, modified_pn_id])

    if (partError || !partNumbers || partNumbers.length !== 2) {
      return NextResponse.json(
        { error: 'Invalid part number IDs provided' },
        { status: 400 }
      )
    }

    // Create history record
    const historyData = {
      inventory_id,
      original_pn_id,
      modified_pn_id,
      modification_reason,
      modification_date: new Date().toISOString(),
      traceability_notes,
      business_value_adjustment,
      modified_by_user_id,
      repair_order_id,
      is_active: true
    }

    const { data: newHistory, error: insertError } = await supabase
      .from('part_number_history')
      .insert(historyData)
      .select(`
        history_id,
        modification_date,
        modification_reason,
        traceability_notes,
        business_value_adjustment,
        modified_by:modified_by_user_id(name),
        original_pn:original_pn_id(pn, description),
        modified_pn:modified_pn_id(pn, description)
      `)
      .single()

    if (insertError) {
      console.error('Error creating history record:', insertError)
      return NextResponse.json(
        { error: 'Failed to create status history record', details: insertError.message },
        { status: 500 }
      )
    }

    // Update inventory item's part number if this represents a current change
    if (inventoryItem.pn_id === original_pn_id) {
      const { error: updateError } = await supabase
        .from('inventory')
        .update({ 
          pn_id: modified_pn_id,
          updated_at: new Date().toISOString()
        })
        .eq('inventory_id', inventory_id)

      if (updateError) {
        console.error('Error updating inventory part number:', updateError)
        // Note: We don't fail the request here as history was created successfully
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Part number modification history created successfully',
      data: newHistory
    })

  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}