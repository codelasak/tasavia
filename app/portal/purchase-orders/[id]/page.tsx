import { createSupabaseServer } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PurchaseOrderViewClientPage from './PurchaseOrderViewClientPage'

export const dynamic = 'force-dynamic'

interface PurchaseOrderPageProps {
  params: {
    id: string
  }
}

async function fetchPurchaseOrder(poId: string) {
  const supabase = createSupabaseServer()
  try {
    // First fetch the purchase order with company info using unified schema
    const { data: poData, error: poError } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        buyer_company:companies!company_id(*),
        vendor_company:companies!vendor_company_id(*),
        company_ship_via!ship_via_id(*),
        po_items(
          *,
          pn_master_table(pn, description)
        )
      `)
      .eq('po_id', poId as any)
      .single()
    
    if (poError) {
      // PO fetch error
      return null
    }

    // Cast poData to any to avoid type issues
    const poDataAny = poData as any

    // Fetch buyer company addresses and contacts
    const { data: buyerCompanyAddresses } = await supabase
      .from('company_addresses')
      .select('*')
      .eq('company_id', poDataAny.buyer_company.company_id as any)

    const { data: buyerCompanyContacts } = await supabase
      .from('company_contacts')
      .select('*')
      .eq('company_id', poDataAny.buyer_company.company_id as any)

    // Fetch vendor company addresses and contacts
    const { data: vendorAddresses } = await supabase
      .from('company_addresses')
      .select('*')
      .eq('company_id', poDataAny.vendor_company.company_id as any)

    const { data: vendorContacts } = await supabase
      .from('company_contacts')
      .select('*')
      .eq('company_id', poDataAny.vendor_company.company_id as any)

    // Combine the data with legacy field names for compatibility
    const enrichedData = {
      ...poDataAny,
      // Keep both new and legacy field names for compatibility
      buyer_company: {
        ...poDataAny.buyer_company,
        company_addresses: buyerCompanyAddresses || [],
        company_contacts: buyerCompanyContacts || []
      },
      vendor_company: {
        ...poDataAny.vendor_company,
        company_addresses: vendorAddresses || [],
        company_contacts: vendorContacts || []
      },
      // Legacy compatibility fields
      my_companies: {
        ...poDataAny.buyer_company,
        my_company_id: poDataAny.buyer_company.company_id,
        my_company_name: poDataAny.buyer_company.company_name,
        my_company_code: poDataAny.buyer_company.company_code,
        company_addresses: buyerCompanyAddresses || [],
        company_contacts: buyerCompanyContacts || []
      },
      companies: {
        ...poDataAny.vendor_company,
        company_addresses: vendorAddresses || [],
        company_contacts: vendorContacts || []
      }
    }
    
    return enrichedData
  } catch (error) {
    // Failed to fetch purchase order
    return null
  }
}

export default async function PurchaseOrderPage({ params }: PurchaseOrderPageProps) {
  const purchaseOrder = await fetchPurchaseOrder(params.id)
  
  if (!purchaseOrder) {
    notFound()
  }
  
  return <PurchaseOrderViewClientPage poId={params.id} initialPurchaseOrder={purchaseOrder} />
}