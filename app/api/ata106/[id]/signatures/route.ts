import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: {
    id: string
  }
}

interface SignatureRequestBody {
  signature_type: 'transferor' | 'transferee'
  signature_data: string
  signer_name: string
  signer_title: string
  certificate_number?: string
}

// GET /api/ata106/[id]/signatures - Get all signatures for a sales order
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params
    const supabase = createSupabaseServer()

    // Verify sales order exists and has traceable items
    const { data: salesOrder, error: soError } = await supabase
      .from('sales_orders')
      .select(`
        sales_order_id,
        invoice_number,
        ata106_completion_status,
        ata106_completed_at,
        ata106_completed_by,
        sales_order_items(
          inventory(
            traceability_source,
            traceable_to,
            last_certified_agency
          )
        )
      `)
      .eq('sales_order_id', id)
      .single()

    if (soError || !salesOrder) {
      return NextResponse.json(
        { error: 'Sales order not found' },
        { status: 404 }
      )
    }

    // Check if sales order has traceable items
    const hasTraceableItems = (salesOrder as any).sales_order_items?.some((item: any) =>
      item.inventory?.traceability_source || 
      item.inventory?.traceable_to || 
      item.inventory?.last_certified_agency
    ) || false

    if (!hasTraceableItems) {
      return NextResponse.json(
        { error: 'Sales order has no traceable items requiring ATA 106 certification' },
        { status: 400 }
      )
    }

    // Get signatures
    const { data: signatures, error: sigError } = await (supabase as any)
      .from('ata106_signatures')
      .select(`
        signature_id,
        signature_type,
        signature_data,
        signer_name,
        signer_title,
        certificate_number,
        signed_at,
        signed_by,
        ip_address
      `)
      .eq('sales_order_id', id)
      .order('signed_at', { ascending: true })

    if (sigError) {
      console.error('Error fetching signatures:', sigError)
      return NextResponse.json(
        { error: 'Failed to fetch signatures' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      sales_order_id: (salesOrder as any).sales_order_id,
      invoice_number: (salesOrder as any).invoice_number,
      completion_status: (salesOrder as any).ata106_completion_status || 'draft',
      completed_at: (salesOrder as any).ata106_completed_at || null,
      signatures: signatures || [],
      signature_count: signatures?.length || 0,
      transferor_signed: signatures?.some((s: any) => s.signature_type === 'transferor') || false,
      transferee_signed: signatures?.some((s: any) => s.signature_type === 'transferee') || false,
    })

  } catch (error) {
    console.error('Signatures fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/ata106/[id]/signatures - Create or update a signature
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params
    const body: SignatureRequestBody = await request.json()
    const supabase = createSupabaseServer()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Validate request body
    const { signature_type, signature_data, signer_name, signer_title, certificate_number } = body

    if (!signature_type || !['transferor', 'transferee'].includes(signature_type)) {
      return NextResponse.json(
        { error: 'Invalid signature type. Must be "transferor" or "transferee"' },
        { status: 400 }
      )
    }

    if (!signature_data || !signature_data.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Invalid signature data. Must be a valid base64 image' },
        { status: 400 }
      )
    }

    if (!signer_name?.trim() || !signer_title?.trim()) {
      return NextResponse.json(
        { error: 'Signer name and title are required' },
        { status: 400 }
      )
    }

    // Verify sales order exists and has traceable items
    const { data: salesOrder, error: soError } = await supabase
      .from('sales_orders')
      .select(`
        sales_order_id,
        invoice_number,
        sales_order_items(
          inventory(
            traceability_source,
            traceable_to,
            last_certified_agency
          )
        )
      `)
      .eq('sales_order_id', id)
      .single()

    if (soError || !salesOrder) {
      return NextResponse.json(
        { error: 'Sales order not found' },
        { status: 404 }
      )
    }

    // Check if sales order has traceable items
    const hasTraceableItems = (salesOrder as any).sales_order_items?.some((item: any) =>
      item.inventory?.traceability_source || 
      item.inventory?.traceable_to || 
      item.inventory?.last_certified_agency
    ) || false

    if (!hasTraceableItems) {
      return NextResponse.json(
        { error: 'Sales order has no traceable items requiring ATA 106 certification' },
        { status: 400 }
      )
    }

    // Get client IP address
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip')

    // Insert or update signature
    const signatureRecord = {
      sales_order_id: id,
      signature_type,
      signature_data,
      signer_name: signer_name.trim(),
      signer_title: signer_title.trim(),
      certificate_number: certificate_number?.trim() || null,
      signed_by: user.id,
      signed_at: new Date().toISOString(),
      ip_address: ip,
      user_agent: request.headers.get('user-agent'),
    }

    const { data: signature, error: sigError } = await (supabase as any)
      .from('ata106_signatures')
      .upsert(signatureRecord, {
        onConflict: 'sales_order_id,signature_type',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (sigError) {
      console.error('Error saving signature:', sigError)
      return NextResponse.json(
        { error: 'Failed to save signature: ' + sigError.message },
        { status: 500 }
      )
    }

    // Get updated completion status
    const { data: updatedOrder, error: statusError } = await supabase
      .from('sales_orders')
      .select('*')
      .eq('sales_order_id', id)
      .single()

    if (statusError) {
      console.warn('Could not fetch updated status:', statusError)
    }

    return NextResponse.json({
      success: true,
      signature: {
        signature_id: signature.signature_id,
        signature_type: signature.signature_type,
        signer_name: signature.signer_name,
        signer_title: signature.signer_title,
        certificate_number: signature.certificate_number,
        signed_at: signature.signed_at,
      },
      completion_status: (updatedOrder as any)?.ata106_completion_status || 'draft',
      completed_at: (updatedOrder as any)?.ata106_completed_at || null,
      message: `${signature_type} signature saved successfully`,
    })

  } catch (error) {
    console.error('Signature save error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/ata106/[id]/signatures/[type] - Delete a specific signature
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const signature_type = searchParams.get('type') as 'transferor' | 'transferee'
    const supabase = createSupabaseServer()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!signature_type || !['transferor', 'transferee'].includes(signature_type)) {
      return NextResponse.json(
        { error: 'Invalid signature type. Must be "transferor" or "transferee"' },
        { status: 400 }
      )
    }

    // Delete the signature
    const { error: deleteError } = await (supabase as any)
      .from('ata106_signatures')
      .delete()
      .eq('sales_order_id', id)
      .eq('signature_type', signature_type)

    if (deleteError) {
      console.error('Error deleting signature:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete signature: ' + deleteError.message },
        { status: 500 }
      )
    }

    // Get updated completion status
    const { data: updatedOrder } = await supabase
      .from('sales_orders')
      .select('*')
      .eq('sales_order_id', id)
      .single()

    return NextResponse.json({
      success: true,
      message: `${signature_type} signature deleted successfully`,
      completion_status: (updatedOrder as any)?.ata106_completion_status || 'draft',
    })

  } catch (error) {
    console.error('Signature delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}