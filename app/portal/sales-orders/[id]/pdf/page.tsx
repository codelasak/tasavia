import { createSupabaseServer } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import SalesOrderPDFClientPage from './SalesOrderPDFClientPage'

export const dynamic = 'force-dynamic'

interface InvoicePDFPageProps {
  params: {
    id: string
  }
}

// Generate invoice number in T25XXX format
async function generateInvoiceNumber() {
  const supabase = createSupabaseServer()
  const year = new Date().getFullYear().toString().slice(-2) // Get last 2 digits of year
  
  try {
    // Get all existing invoice numbers for this year
    const { data: existingInvoices, error } = await supabase
      .from('sales_orders')
      .select('invoice_number')
      .not('invoice_number', 'is', null)
      .ilike('invoice_number', `T${year}%`)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching existing invoices:', error)
      // Fallback to random number if query fails
      const fallbackCounter = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
      return `T${year}${fallbackCounter}`
    }
    
    let nextCounter = 1
    
    if (existingInvoices && existingInvoices.length > 0) {
      // Find the highest counter for this year
      let highestCounter = 0
      
      existingInvoices.forEach(invoice => {
        const invoiceAny = invoice as any
        if (invoiceAny.invoice_number && invoiceAny.invoice_number.startsWith(`T${year}`)) {
          const counterPart = invoiceAny.invoice_number.slice(-3) // Get last 3 characters
          const counterNum = parseInt(counterPart, 10)
          if (!isNaN(counterNum) && counterNum > highestCounter) {
            highestCounter = counterNum
          }
        }
      })
      
      nextCounter = highestCounter + 1
    }
    
    const counter = String(nextCounter).padStart(3, '0')
    const newInvoiceNumber = `T${year}${counter}`
    
    console.log('Generated invoice number:', newInvoiceNumber)
    return newInvoiceNumber
    
  } catch (error) {
    console.error('Error in generateInvoiceNumber:', error)
    // Fallback to timestamp-based number
    const timestamp = Date.now().toString().slice(-3)
    return `T${year}${timestamp}`
  }
}

async function fetchSalesOrderData(id: string) {
  const supabase = createSupabaseServer()
  try {
    // First fetch the sales order with basic company info
    const { data: soData, error: soError } = await supabase
      .from('sales_orders')
      .select(`
        *,
        my_companies(*),
        companies(*, customer_number),
        terms_and_conditions(*),
        sales_order_items(
          *,
          inventory(
            *,
            pn_master_table(pn, description)
          )
        )
      `)
      .eq('sales_order_id', id as any)
      .single()

    if (soError) throw soError

    // Generate new invoice number if not exists or is empty
    const soDataAny = soData as any
    if (soDataAny && (!soDataAny.invoice_number || soDataAny.invoice_number.trim() === '')) {
      console.log('Generating new invoice number for sales order:', id)
      const newInvoiceNumber = await generateInvoiceNumber()
      console.log('New invoice number generated:', newInvoiceNumber)
      
      const { error: updateError } = await supabase
        .from('sales_orders')
        .update({ invoice_number: newInvoiceNumber } as any)
        .eq('sales_order_id', id as any)
      
      if (updateError) {
        console.error('Error updating invoice number:', updateError)
      } else {
        console.log('Invoice number updated successfully')
        soDataAny.invoice_number = newInvoiceNumber
      }
    } else {
      console.log('Using existing invoice number:', soDataAny.invoice_number)
    }

    // Fetch my company addresses and contacts
    const { data: myCompanyAddresses } = await supabase
      .from('company_addresses')
      .select('*')
      .eq('company_id', soDataAny.my_companies.my_company_id as any)

    const { data: myCompanyContacts } = await supabase
      .from('company_contacts')
      .select('*')
      .eq('company_id', soDataAny.my_companies.my_company_id as any)

    // Fetch customer company addresses and contacts (no more company_ref_type filter needed)
    const { data: customerAddresses } = await supabase
      .from('company_addresses')
      .select('*')
      .eq('company_id', soDataAny.companies.company_id as any)

    const { data: customerContacts } = await supabase
      .from('company_contacts')
      .select('*')
      .eq('company_id', soDataAny.companies.company_id as any)

    // Combine the data
    const enrichedData = {
      ...soDataAny,
      my_companies: {
        ...soDataAny.my_companies,
        company_addresses: myCompanyAddresses || [],
        company_contacts: myCompanyContacts || []
      },
      companies: {
        ...soDataAny.companies,
        company_addresses: customerAddresses || [],
        company_contacts: customerContacts || []
      }
    }

    return enrichedData
  } catch (error) {
    console.error('Error fetching sales order:', error)
    return null
  }
}

export default async function InvoicePDFPage({ params }: InvoicePDFPageProps) {
  const salesOrder = await fetchSalesOrderData(params.id)

  if (!salesOrder) {
    notFound()
  }

  return <SalesOrderPDFClientPage salesOrder={salesOrder} />
}