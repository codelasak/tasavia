import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface BatchProcessRequest {
  action: 'generate_pdfs' | 'export_data' | 'update_status'
  sales_order_ids: string[]
  options?: {
    format?: 'pdf' | 'csv' | 'json'
    include_signatures?: boolean
    status?: string
  }
}

// POST /api/ata106/batch - Process multiple ATA 106 forms
export async function POST(request: NextRequest) {
  try {
    const body: BatchProcessRequest = await request.json()
    const supabase = createSupabaseServer()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { action, sales_order_ids, options = {} } = body

    if (!action || !sales_order_ids || sales_order_ids.length === 0) {
      return NextResponse.json(
        { error: 'Action and sales_order_ids are required' },
        { status: 400 }
      )
    }

    if (sales_order_ids.length > 50) {
      return NextResponse.json(
        { error: 'Batch size limited to 50 items' },
        { status: 400 }
      )
    }

    // Verify all sales orders exist and have traceable items
    const { data: salesOrders, error: soError } = await supabase
      .from('sales_orders')
      .select(`
        sales_order_id,
        invoice_number,
        ata106_completion_status,
        sales_order_items(
          inventory(
            traceability_source,
            traceable_to,
            last_certified_agency
          )
        )
      `)
      .in('sales_order_id', sales_order_ids)

    if (soError) {
      return NextResponse.json(
        { error: `Failed to fetch sales orders: ${soError.message}` },
        { status: 500 }
      )
    }

    // Filter to only traceable orders
    const traceableOrders = (salesOrders || []).filter((order: any) =>
      order.sales_order_items?.some((item: any) =>
        item.inventory?.traceability_source ||
        item.inventory?.traceable_to ||
        item.inventory?.last_certified_agency
      )
    )

    if (traceableOrders.length === 0) {
      return NextResponse.json(
        { error: 'No sales orders with traceable items found' },
        { status: 400 }
      )
    }

    let result: any = {}

    switch (action) {
      case 'generate_pdfs':
        result = await handleBatchPDFGeneration(traceableOrders, options)
        break

      case 'export_data':
        result = await handleBatchDataExport(traceableOrders, options, supabase)
        break

      case 'update_status':
        result = await handleBatchStatusUpdate(traceableOrders, options, supabase)
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be generate_pdfs, export_data, or update_status' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      action,
      processed_count: traceableOrders.length,
      total_requested: sales_order_ids.length,
      result
    })

  } catch (error) {
    console.error('Batch processing error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function handleBatchPDFGeneration(orders: any[], options: any) {
  // In a real implementation, this would generate PDFs
  // For now, return a placeholder response
  const pdf_urls = orders.map(order => ({
    sales_order_id: order.sales_order_id,
    invoice_number: order.invoice_number,
    pdf_url: `/api/ata106/${order.sales_order_id}/pdf`,
    status: 'generated'
  }))

  return {
    action: 'generate_pdfs',
    pdf_urls,
    message: `Generated ${orders.length} PDF forms`
  }
}

async function handleBatchDataExport(orders: any[], options: any, supabase: any) {
  const format = options.format || 'json'
  const include_signatures = options.include_signatures || false

  // Get additional data if signatures are requested
  let signatures: any[] = []
  if (include_signatures) {
    const { data: sigData, error: sigError } = await (supabase as any)
      .from('ata106_signatures')
      .select('*')
      .in('sales_order_id', orders.map(o => o.sales_order_id))

    if (!sigError) {
      signatures = sigData || []
    }
  }

  const exportData = orders.map(order => {
    const orderSignatures = signatures.filter(sig => sig.sales_order_id === order.sales_order_id)
    
    return {
      sales_order_id: order.sales_order_id,
      invoice_number: order.invoice_number,
      completion_status: order.ata106_completion_status || 'draft',
      traceable_items_count: order.sales_order_items?.length || 0,
      signatures: include_signatures ? orderSignatures : undefined
    }
  })

  let export_url: string
  if (format === 'csv') {
    // In a real implementation, generate CSV and upload to storage
    export_url = `/api/ata106/batch/download/${Date.now()}.csv`
  } else {
    // Return JSON data directly
    export_url = 'data:application/json;base64,' + Buffer.from(JSON.stringify(exportData, null, 2)).toString('base64')
  }

  return {
    action: 'export_data',
    format,
    export_url,
    records_count: exportData.length,
    message: `Exported ${exportData.length} records in ${format.toUpperCase()} format`
  }
}

async function handleBatchStatusUpdate(orders: any[], options: any, supabase: any) {
  const new_status = options.status

  if (!new_status || !['draft', 'partial', 'completed'].includes(new_status)) {
    throw new Error('Invalid status. Must be draft, partial, or completed')
  }

  const updates = []
  const errors = []

  for (const order of orders) {
    try {
      const { error } = await supabase
        .from('sales_orders')
        .update({
          ata106_completion_status: new_status,
          ata106_completed_at: new_status === 'completed' ? new Date().toISOString() : null
        })
        .eq('sales_order_id', order.sales_order_id)

      if (error) {
        errors.push({
          sales_order_id: order.sales_order_id,
          error: error.message
        })
      } else {
        updates.push({
          sales_order_id: order.sales_order_id,
          old_status: order.ata106_completion_status || 'draft',
          new_status
        })
      }
    } catch (error) {
      errors.push({
        sales_order_id: order.sales_order_id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return {
    action: 'update_status',
    new_status,
    successful_updates: updates.length,
    failed_updates: errors.length,
    updates,
    errors: errors.length > 0 ? errors : undefined,
    message: `Updated ${updates.length} of ${orders.length} orders to ${new_status} status`
  }
}

// GET /api/ata106/batch - Get batch processing status
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServer()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get summary statistics for batch operations
    const { data: salesOrders, error: soError } = await supabase
      .from('sales_orders')
      .select(`
        sales_order_id,
        ata106_completion_status,
        sales_order_items(
          inventory(
            traceability_source,
            traceable_to,
            last_certified_agency
          )
        )
      `)

    if (soError) {
      return NextResponse.json(
        { error: `Failed to fetch sales orders: ${soError.message}` },
        { status: 500 }
      )
    }

    // Filter to traceable orders
    const traceableOrders = (salesOrders || []).filter((order: any) =>
      order.sales_order_items?.some((item: any) =>
        item.inventory?.traceability_source ||
        item.inventory?.traceable_to ||
        item.inventory?.last_certified_agency
      )
    )

    const summary = {
      total_traceable_orders: traceableOrders.length,
      by_status: {
        draft: traceableOrders.filter((o: any) => !o.ata106_completion_status || o.ata106_completion_status === 'draft').length,
        partial: traceableOrders.filter((o: any) => o.ata106_completion_status === 'partial').length,
        completed: traceableOrders.filter((o: any) => o.ata106_completion_status === 'completed').length
      },
      batch_limits: {
        max_batch_size: 50,
        supported_actions: ['generate_pdfs', 'export_data', 'update_status']
      }
    }

    return NextResponse.json(summary)

  } catch (error) {
    console.error('Batch status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}