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
    // First fetch the basic purchase order data
    const { data: poData, error: poError } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('po_id', poId)
      .single()
    
    if (poError) {
      console.error('PO fetch error:', poError)
      return null
    }

    // Fetch po_items with part number details
    const { data: poItems } = await supabase
      .from('po_items')
      .select(`
        *,
        pn_master_table(pn, description)
      `)
      .eq('po_id', poId)

    // Fetch buyer company (my company)
    const { data: buyerCompany } = await supabase
      .from('companies')
      .select('*')
      .eq('company_id', poData.company_id)
      .single()

    // Fetch vendor company
    const { data: vendorCompany } = await supabase
      .from('companies')
      .select('*')
      .eq('company_id', poData.vendor_company_id)
      .single()

    // Fetch ship via info if exists
    let shipViaInfo = null
    if (poData.ship_via_id) {
      const { data: shipVia } = await supabase
        .from('company_ship_via')
        .select('*')
        .eq('ship_via_id', poData.ship_via_id)
        .single()
      shipViaInfo = shipVia
    }

    // Fetch buyer company addresses and contacts
    const { data: buyerCompanyAddresses } = await supabase
      .from('company_addresses')
      .select('*')
      .eq('company_id', poData.company_id)
      .eq('company_ref_type', 'companies')

    const { data: buyerCompanyContacts } = await supabase
      .from('company_contacts')
      .select('*')
      .eq('company_id', poData.company_id)
      .eq('company_ref_type', 'companies')

    // Fetch vendor company addresses and contacts
    const { data: vendorAddresses } = await supabase
      .from('company_addresses')
      .select('*')
      .eq('company_id', poData.vendor_company_id)
      .eq('company_ref_type', 'companies')

    const { data: vendorContacts } = await supabase
      .from('company_contacts')
      .select('*')
      .eq('company_id', poData.vendor_company_id)
      .eq('company_ref_type', 'companies')

    // Cast to any to handle dynamic fields
    const poDataAny = poData as any

    // Combine the data with legacy field names for compatibility
    const enrichedData = {
      ...poData,
      po_items: poItems || [],
      company_ship_via: shipViaInfo,
      // Ensure required fields are present with defaults
      subtotal: poDataAny.subtotal || 0,
      freight_charge: poDataAny.freight_charge || 0,
      misc_charge: poDataAny.misc_charge || 0,
      vat_percentage: poDataAny.vat_percentage || 0,
      ship_to_company_name: poDataAny.ship_to_company_name || null,
      ship_to_address_details: poDataAny.ship_to_address_details || null,
      ship_to_contact_name: poDataAny.ship_to_contact_name || null,
      ship_to_contact_phone: poDataAny.ship_to_contact_phone || null,
      ship_to_contact_email: poDataAny.ship_to_contact_email || null,
      // Keep both new and legacy field names for compatibility
      buyer_company: buyerCompany ? {
        ...buyerCompany,
        company_addresses: buyerCompanyAddresses || [],
        company_contacts: buyerCompanyContacts || []
      } : null,
      vendor_company: vendorCompany ? {
        ...vendorCompany,
        company_addresses: vendorAddresses || [],
        company_contacts: vendorContacts || []
      } : null,
      // Legacy compatibility fields
      my_companies: buyerCompany ? {
        ...buyerCompany,
        my_company_id: buyerCompany.company_id,
        my_company_name: buyerCompany.company_name,
        my_company_code: buyerCompany.company_code || 'UNK',
        company_addresses: buyerCompanyAddresses || [],
        company_contacts: buyerCompanyContacts || []
      } : {
        my_company_name: 'Unknown Company',
        my_company_code: 'UNK',
        company_addresses: [],
        company_contacts: []
      },
      companies: vendorCompany ? {
        ...vendorCompany,
        company_addresses: vendorAddresses || [],
        company_contacts: vendorContacts || []
      } : {
        company_name: 'Unknown Company',
        company_code: 'UNK',
        company_addresses: [],
        company_contacts: []
      }
    }
    
    return enrichedData
  } catch (error) {
    console.error('Failed to fetch purchase order:', error)
    return null
  }
}

export default async function PurchaseOrderPage({ params }: PurchaseOrderPageProps) {
  const purchaseOrder = await fetchPurchaseOrder(params.id)
  
  if (!purchaseOrder) {
    notFound()
  }
  
  return <PurchaseOrderViewClientPage poId={params.id} initialPurchaseOrder={purchaseOrder as any} />
}