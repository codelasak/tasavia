import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { 
  generateATA106HTML, 
  convertSalesOrderToATA106,
  type ATA106PDFOptions 
} from '@/lib/pdf/ata106-generator'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: {
    id: string
  }
}

async function fetchSalesOrderForATA106(id: string) {
  const supabase = createSupabaseServer()
  
  try {
    const { data, error } = await supabase
      .from('sales_orders')
      .select(`
        *,
        my_companies(*),
        companies(*),
        sales_order_items(
          *,
          inventory(
            *,
            pn_master_table(pn, description)
          )
        )
      `)
      .eq('sales_order_id', id)
      .single()

    if (error) {
      console.error('Database error:', error)
      throw new Error(`Database error: ${error.message}`)
    }
    
    if (!data) {
      throw new Error('Sales order not found')
    }

    return data
  } catch (error) {
    console.error('Error fetching sales order:', error)
    throw error
  }
}

function validateATA106Requirements(salesOrderData: any) {
  const traceableItems = salesOrderData.sales_order_items?.filter((item: any) => 
    item.inventory?.traceability_source || 
    item.inventory?.traceable_to || 
    item.inventory?.last_certified_agency
  ) || []

  if (traceableItems.length === 0) {
    throw new Error('No traceable items found in sales order. ATA 106 form cannot be generated.')
  }

  // Check for missing company information
  if (!salesOrderData.my_companies?.my_company_name) {
    throw new Error('Missing transferor company information')
  }

  if (!salesOrderData.companies?.company_name) {
    throw new Error('Missing transferee company information')
  }

  if (!salesOrderData.invoice_number) {
    throw new Error('Missing invoice number for form reference')
  }

  return traceableItems
}

function getComplianceStatus(traceableItems: any[]): { level: string; message: string } {
  const requiredFields = ['traceability_source', 'traceable_to', 'last_certified_agency']
  let completeItems = 0
  let totalItems = traceableItems.length

  traceableItems.forEach((item: any) => {
    const hasAllFields = requiredFields.every(field => item.inventory?.[field])
    if (hasAllFields) completeItems++
  })

  if (completeItems === totalItems) {
    return { level: 'COMPLETE', message: 'All items have complete ATA 106 traceability data' }
  } else if (completeItems > 0) {
    return { 
      level: 'PARTIAL', 
      message: `${completeItems} of ${totalItems} items have complete traceability data` 
    }
  } else {
    return { level: 'MINIMAL', message: 'Items have minimal traceability information' }
  }
}

// GET /api/ata106/[id]/pdf - Generate and return ATA 106 PDF
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters for PDF options
    const format = (searchParams.get('format') as 'A4' | 'Letter') || 'A4'
    const includeSignatures = searchParams.get('signatures') === 'true'
    const preview = searchParams.get('preview') === 'true'
    
    // Fetch sales order data
    const salesOrderData = await fetchSalesOrderForATA106(id)
    
    // Validate ATA 106 requirements
    const traceableItems = validateATA106Requirements(salesOrderData)
    
    // Get compliance status
    const complianceStatus = getComplianceStatus(traceableItems)
    
    // Convert to ATA 106 format
    const ata106Data = convertSalesOrderToATA106(salesOrderData)
    
    // Set PDF options based on compliance and parameters
    const pdfOptions: ATA106PDFOptions = {
      format,
      includeSignatures,
      includeWatermark: complianceStatus.level !== 'COMPLETE' || preview,
      watermarkText: preview ? 'PREVIEW' : complianceStatus.level === 'PARTIAL' ? 'PARTIAL COMPLIANCE' : 'DRAFT',
    }
    
    // Generate HTML content
    const htmlContent = generateATA106HTML(ata106Data, pdfOptions)
    
    // For now, return HTML content
    // In a real implementation, this would use puppeteer to generate PDF
    const response = new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="ATA106-${salesOrderData.invoice_number}.html"`,
        'X-ATA106-Compliance': complianceStatus.level,
        'X-ATA106-Items': traceableItems.length.toString(),
        'X-ATA106-Message': complianceStatus.message,
      },
    })

    return response
    
  } catch (error) {
    console.error('ATA 106 PDF generation error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    const statusCode = errorMessage.includes('not found') ? 404 : 500
    
    return NextResponse.json(
      { 
        error: 'ATA 106 PDF generation failed',
        message: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      },
      { status: statusCode }
    )
  }
}

// POST /api/ata106/[id]/pdf - Generate PDF with custom options
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params
    const body = await request.json()
    
    // Parse custom options from request body
    const {
      format = 'A4',
      orientation = 'portrait',
      includeSignatures = false,
      includeWatermark = false,
      watermarkText = 'DRAFT',
      fontSize = 12,
      margins = { top: 20, right: 20, bottom: 20, left: 20 }
    } = body
    
    // Fetch sales order data
    const salesOrderData = await fetchSalesOrderForATA106(id)
    
    // Validate ATA 106 requirements
    const traceableItems = validateATA106Requirements(salesOrderData)
    
    // Get compliance status
    const complianceStatus = getComplianceStatus(traceableItems)
    
    // Convert to ATA 106 format
    const ata106Data = convertSalesOrderToATA106(salesOrderData)
    
    // Set PDF options
    const pdfOptions: ATA106PDFOptions = {
      format,
      orientation,
      includeSignatures,
      includeWatermark: includeWatermark || complianceStatus.level !== 'COMPLETE',
      watermarkText: complianceStatus.level === 'PARTIAL' ? 'PARTIAL COMPLIANCE' : watermarkText,
      fontSize,
      margins,
    }
    
    // Generate HTML content
    const htmlContent = generateATA106HTML(ata106Data, pdfOptions)
    
    // Return success response with metadata
    return NextResponse.json({
      success: true,
      form_number: ata106Data.form_number,
      compliance_status: complianceStatus.level,
      compliance_message: complianceStatus.message,
      traceable_items_count: traceableItems.length,
      generated_at: new Date().toISOString(),
      html_content: htmlContent, // Include HTML for client-side processing
    })
    
  } catch (error) {
    console.error('ATA 106 PDF generation error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    const statusCode = errorMessage.includes('not found') ? 404 : 500
    
    return NextResponse.json(
      { 
        success: false,
        error: 'ATA 106 PDF generation failed',
        message: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      },
      { status: statusCode }
    )
  }
}

// GET /api/ata106/[id]/pdf/compliance - Check ATA 106 compliance status
export async function HEAD(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params
    
    // Fetch sales order data
    const salesOrderData = await fetchSalesOrderForATA106(id)
    
    // Validate ATA 106 requirements
    const traceableItems = validateATA106Requirements(salesOrderData)
    
    // Get compliance status
    const complianceStatus = getComplianceStatus(traceableItems)
    
    // Return headers only with compliance information
    return new NextResponse(null, {
      status: 200,
      headers: {
        'X-ATA106-Compliance': complianceStatus.level,
        'X-ATA106-Items': traceableItems.length.toString(),
        'X-ATA106-Message': complianceStatus.message,
        'X-ATA106-Form-Number': `ATA106-${salesOrderData.invoice_number}`,
        'X-ATA106-Available': 'true',
      },
    })
    
  } catch (error) {
    console.error('ATA 106 compliance check error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    const statusCode = errorMessage.includes('not found') ? 404 : 500
    
    return new NextResponse(null, {
      status: statusCode,
      headers: {
        'X-ATA106-Available': 'false',
        'X-ATA106-Error': errorMessage,
      },
    })
  }
}