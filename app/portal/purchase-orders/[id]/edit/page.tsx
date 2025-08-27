import { createSupabaseServer } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PurchaseOrderEditClientPage from './PurchaseOrderEditClientPage'

export const dynamic = 'force-dynamic'

interface PurchaseOrderEditPageProps {
  params: {
    id: string
  }
}

async function getPurchaseOrderData(poId: string) {
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

    // Combine the data with correct field names for client component
    const enrichedData = {
      ...poData,
      po_items: poItems || [],
      company_ship_via: shipViaInfo,
      // Map database fields to client-expected field names
      my_company_id: poData.company_id,
      vendor_company_id: poData.vendor_company_id,
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
    
    return {
      purchaseOrder: enrichedData,
      items: poItems || []
    }
  } catch (error) {
    console.error('Failed to fetch purchase order:', error)
    return null
  }
}

async function getFormData() {
  const supabase = createSupabaseServer()
  const [companiesResult, partNumbersResult, shipViaResult] = await Promise.all([
    supabase.from('companies').select('company_id, company_name, company_code, company_type, is_self, created_at, updated_at, customer_number').order('company_name'),
    supabase.from('pn_master_table').select('pn_id, pn, description').order('pn'),
    supabase.from('company_ship_via')
      .select(`
        ship_via_id,
        ship_company_name,
        account_no,
        owner,
        ship_model
      `)
      .order('ship_company_name')
  ])

  if (companiesResult.error) throw new Error(companiesResult.error.message || 'Failed to fetch companies')
  if (partNumbersResult.error) throw new Error(partNumbersResult.error.message || 'Failed to fetch part numbers')
  if (shipViaResult.error) throw new Error(shipViaResult.error.message || 'Failed to fetch shipping methods')

  // Fetch addresses and contacts for all companies
  const [companyAddresses, companyContacts] = await Promise.all([
    supabase.from('company_addresses').select('*'),
    supabase.from('company_contacts').select('*')
  ])

  // Separate internal and external companies, and enrich with addresses/contacts
  const allCompanies = companiesResult.data || []
  
  const enrichedMyCompanies = allCompanies
    .filter(company => company.is_self === true)
    .map(company => ({
      ...company,
      is_self: company.is_self || false,
      // Keep legacy field names for compatibility with existing component
      my_company_id: company.company_id,
      my_company_name: company.company_name,
      my_company_code: company.company_code || '',
      company_addresses: companyAddresses.data?.filter(addr => addr.company_id === company.company_id) || [],
      company_contacts: companyContacts.data?.filter(contact => contact.company_id === company.company_id) || []
    }))

  const enrichedExternalCompanies = allCompanies
    .filter(company => company.is_self !== true)
    .map(company => ({
      ...company,
      company_addresses: companyAddresses.data?.filter(addr => addr.company_id === company.company_id) || [],
      company_contacts: companyContacts.data?.filter(contact => contact.company_id === company.company_id) || []
    }))

  return {
    myCompanies: enrichedMyCompanies,
    externalCompanies: enrichedExternalCompanies,
    partNumbers: partNumbersResult.data || [],
    shipViaList: (shipViaResult.data || []).map((item: any) => {
      const known = new Set(['DHL','FEDEX','UPS','TNT','ARAMEX','DPD','SCHENKER','KUEHNE_NAGEL','EXPEDITORS','PANALPINA'])
      const isKnown = known.has(item.ship_company_name)
      return {
        ...item,
        predefined_company: isKnown ? item.ship_company_name : 'CUSTOM',
        custom_company_name: isKnown ? null : item.ship_company_name,
      }
    }),
  }
}

export default async function PurchaseOrderEditPage({ params }: PurchaseOrderEditPageProps) {
  const [purchaseOrderData, formData] = await Promise.all([
    getPurchaseOrderData(params.id),
    getFormData()
  ])

  if (!purchaseOrderData) {
    notFound()
  }

  return (
    <PurchaseOrderEditClientPage
      poId={params.id}
      initialPurchaseOrder={purchaseOrderData.purchaseOrder}
      initialItems={purchaseOrderData.items}
      myCompanies={formData.myCompanies}
      externalCompanies={formData.externalCompanies}
      partNumbers={formData.partNumbers as any}
      shipViaList={formData.shipViaList as any}
    />
  )
}
