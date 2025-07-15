import { supabase } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PurchaseOrderViewClientPage from './PurchaseOrderViewClientPage'

export const dynamic = 'force-dynamic'

interface PurchaseOrderPageProps {
  params: {
    id: string
  }
}

async function fetchPurchaseOrder(poId: string) {
  try {
    // First fetch the purchase order with basic company info
    const { data: poData, error: poError } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        my_companies(*),
        companies(*),
        company_ship_via!ship_via_id(*),
        po_items(
          *,
          pn_master_table(pn, description)
        )
      `)
      .eq('po_id', poId)
      .single()
    
    if (poError) {
      // PO fetch error
      return null
    }

    // Fetch my company addresses and contacts
    const { data: myCompanyAddresses } = await supabase
      .from('company_addresses')
      .select('*')
      .eq('company_id', poData.my_companies.my_company_id)
      .eq('company_ref_type', 'my_companies')

    const { data: myCompanyContacts } = await supabase
      .from('company_contacts')
      .select('*')
      .eq('company_id', poData.my_companies.my_company_id)
      .eq('company_ref_type', 'my_companies')

    // Fetch vendor company addresses and contacts
    const { data: vendorAddresses } = await supabase
      .from('company_addresses')
      .select('*')
      .eq('company_id', poData.companies.company_id)
      .eq('company_ref_type', 'companies')

    const { data: vendorContacts } = await supabase
      .from('company_contacts')
      .select('*')
      .eq('company_id', poData.companies.company_id)
      .eq('company_ref_type', 'companies')

    // Combine the data
    const enrichedData = {
      ...poData,
      my_companies: {
        ...poData.my_companies,
        company_addresses: myCompanyAddresses || [],
        company_contacts: myCompanyContacts || []
      },
      companies: {
        ...poData.companies,
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