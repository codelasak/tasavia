import { createSupabaseServer } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PurchaseOrderPdfClientPage from './PurchaseOrderPdfClientPage'

export const dynamic = 'force-dynamic'

export async function generateStaticParams() {
  // Skip static generation for dynamic routes that require authentication
  // These pages will be generated on-demand
  return []
}

interface PurchaseOrderPdfPageProps {
  params: Promise<{
    id: string
  }>
}

async function fetchPurchaseOrder(poId: string) {
  const supabase = createSupabaseServer()
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
      .eq('po_id', poId as any)
      .single()
    
    if (poError) {
      // PO fetch error
      return null
    }

    // Cast poData to any to avoid type issues
    const poDataAny = poData as any

    // Fetch my company addresses and contacts (no more company_ref_type filter needed)
    const { data: myCompanyAddresses } = await supabase
      .from('company_addresses')
      .select('*')
      .eq('company_id', poDataAny.my_companies.my_company_id as any)

    const { data: myCompanyContacts } = await supabase
      .from('company_contacts')
      .select('*')
      .eq('company_id', poDataAny.my_companies.my_company_id as any)

    // Fetch vendor company addresses and contacts (no more company_ref_type filter needed)
    const { data: vendorAddresses } = await supabase
      .from('company_addresses')
      .select('*')
      .eq('company_id', poDataAny.companies.company_id as any)

    const { data: vendorContacts } = await supabase
      .from('company_contacts')
      .select('*')
      .eq('company_id', poDataAny.companies.company_id as any)

    // Combine the data
    const enrichedData = {
      ...poDataAny,
      my_companies: {
        ...poDataAny.my_companies,
        company_addresses: myCompanyAddresses || [],
        company_contacts: myCompanyContacts || []
      },
      companies: {
        ...poDataAny.companies,
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

export default async function PurchaseOrderPdfPage({ params }: PurchaseOrderPdfPageProps) {
  const resolvedParams = await params
  const purchaseOrder = await fetchPurchaseOrder(resolvedParams.id)
  
  if (!purchaseOrder) {
    notFound()
  }
  
  return <PurchaseOrderPdfClientPage poId={resolvedParams.id} initialPurchaseOrder={purchaseOrder} />
}