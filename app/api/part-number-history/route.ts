import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase client for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch part number modification history for an inventory item
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const inventoryId = searchParams.get('inventory_id')
    const repairOrderId = searchParams.get('repair_order_id')

    if (!inventoryId && !repairOrderId) {
      return NextResponse.json(
        { error: 'Either inventory_id or repair_order_id is required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('part_number_history')
      .select(`
        *,
        original_pn:original_pn_id(pn, description),
        modified_pn:modified_pn_id(pn, description),
        inventory:inventory_id(serial_number, condition),
        repair_order:repair_order_id(repair_order_number)
      `)
      .eq('is_active', true)
      .order('modification_date', { ascending: false })

    if (inventoryId) {
      query = query.eq('inventory_id', inventoryId)
    }
    
    if (repairOrderId) {
      query = query.eq('repair_order_id', repairOrderId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching part number history:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching part number history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new part number modification
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      inventory_id,
      repair_order_id,
      original_pn_id,
      modified_pn_id,
      modification_reason,
      traceability_notes,
      business_value_adjustment
    } = body

    // Validate required fields
    if (!inventory_id || !original_pn_id || !modified_pn_id || !modification_reason) {
      return NextResponse.json(
        { error: 'Missing required fields: inventory_id, original_pn_id, modified_pn_id, modification_reason' },
        { status: 400 }
      )
    }

    // Prevent self-referential modifications
    if (original_pn_id === modified_pn_id) {
      return NextResponse.json(
        { error: 'Original and modified part numbers cannot be the same' },
        { status: 400 }
      )
    }

    // For now, we'll use a placeholder user ID since we're using service role
    // In production, you might want to implement proper user authentication
    const userId = '00000000-0000-0000-0000-000000000000'

    // Verify the inventory item exists and belongs to the repair order (if specified)
    let inventoryQuery = supabase
      .from('inventory')
      .select('inventory_id, pn_id, serial_number, condition')
      .eq('inventory_id', inventory_id)
      .single()

    const { data: inventoryItem, error: inventoryError } = await inventoryQuery

    if (inventoryError || !inventoryItem) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })
    }

    // Verify original part number matches current inventory
    if (inventoryItem.pn_id !== original_pn_id) {
      return NextResponse.json(
        { error: 'Original part number does not match inventory item' },
        { status: 400 }
      )
    }

    // Verify repair order if specified
    if (repair_order_id) {
      const { data: repairOrderItem, error: repairOrderError } = await supabase
        .from('repair_order_items')
        .select('repair_order_item_id')
        .eq('repair_order_id', repair_order_id)
        .eq('inventory_id', inventory_id)
        .single()

      if (repairOrderError || !repairOrderItem) {
        return NextResponse.json(
          { error: 'Inventory item not found in specified repair order' },
          { status: 400 }
        )
      }
    }

    // Verify the modified part number exists
    const { data: modifiedPn, error: modifiedPnError } = await supabase
      .from('pn_master_table')
      .select('pn_id, pn, description')
      .eq('pn_id', modified_pn_id)
      .single()

    if (modifiedPnError || !modifiedPn) {
      return NextResponse.json({ error: 'Modified part number not found' }, { status: 404 })
    }

    // Create part number modification record
    const { data: partHistory, error: historyError } = await supabase
      .from('part_number_history')
      .insert({
        inventory_id,
        repair_order_id: repair_order_id || null,
        original_pn_id,
        modified_pn_id,
        modification_reason,
        modification_date: new Date().toISOString(),
        modified_by_user_id: userId,
        traceability_notes: traceability_notes || null,
        business_value_adjustment: business_value_adjustment || null,
        is_active: true
      })
      .select(`
        *,
        original_pn:original_pn_id(pn, description),
        modified_pn:modified_pn_id(pn, description),
        inventory:inventory_id(serial_number, condition),
        repair_order:repair_order_id(repair_order_number)
      `)
      .single()

    if (historyError) {
      console.error('Error creating part number history:', historyError)
      return NextResponse.json({ error: historyError.message }, { status: 500 })
    }

    // Update inventory record with new part number
    const { error: updateError } = await supabase
      .from('inventory')
      .update({ 
        pn_id: modified_pn_id,
        updated_at: new Date().toISOString()
      })
      .eq('inventory_id', inventory_id)

    if (updateError) {
      console.error('Error updating inventory:', updateError)
      // Rollback the part number history record
      await supabase
        .from('part_number_history')
        .update({ is_active: false })
        .eq('history_id', partHistory.history_id)
      
      return NextResponse.json({ error: 'Failed to update inventory' }, { status: 500 })
    }

    return NextResponse.json({
      data: partHistory,
      message: `Part number successfully modified from ${inventoryItem.pn_id} to ${modifiedPn.pn}`
    })
  } catch (error) {
    console.error('Error creating part number modification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update/approve part number modification
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { history_id, approved, approval_notes } = body

    if (!history_id) {
      return NextResponse.json({ error: 'history_id is required' }, { status: 400 })
    }

    // For now, we'll use a placeholder user ID since we're using service role
    const userId = '00000000-0000-0000-0000-000000000000'

    // Get the modification record
    const { data: modification, error: modificationError } = await supabase
      .from('part_number_history')
      .select('*')
      .eq('history_id', history_id)
      .eq('is_active', true)
      .single()

    if (modificationError || !modification) {
      return NextResponse.json({ error: 'Part number modification not found' }, { status: 404 })
    }

    // Update approval status
    const updates: any = {}
    
    if (typeof approved === 'boolean') {
      if (approved) {
        updates.approved_by_user_id = userId
        updates.approval_date = new Date().toISOString()
      } else {
        updates.approved_by_user_id = null
        updates.approval_date = null
      }
    }

    if (approval_notes) {
      updates.traceability_notes = approval_notes
    }

    updates.updated_at = new Date().toISOString()

    const { data, error: updateError } = await supabase
      .from('part_number_history')
      .update(updates)
      .eq('history_id', history_id)
      .select(`
        *,
        original_pn:original_pn_id(pn, description),
        modified_pn:modified_pn_id(pn, description)
      `)
      .single()

    if (updateError) {
      console.error('Error updating part number modification:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      data,
      message: approved ? 'Part number modification approved' : 'Approval removed'
    })
  } catch (error) {
    console.error('Error updating part number modification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}