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
    // Fetching PO data
    
    // Fetch purchase order data
    const { data: poData, error: poError } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('po_id', poId as any)
      .single()

    if (poError) {
      // PO fetch error
      return null
    }
    
    // PO data fetched successfully

    // Fetch line items
    const { data: itemsData, error: itemsError } = await supabase
      .from('po_items')
      .select(`
        *,
        pn_master_table:pn_id (
          pn_id,
          pn,
          description
        )
      `)
      .eq('po_id', poId as any)
      .order('line_number')

    if (itemsError) {
      // PO items fetch error
      return null
    }
    
    // Items data fetched successfully

    return {
      purchaseOrder: poData,
      items: itemsData || []
    }
  } catch (error) {
    // Error fetching purchase order
    return null
  }
}

async function getFormData() {
  const supabase = createSupabaseServer()
  const [myCompaniesResult, companiesResult, partNumbersResult, shipViaResult] = await Promise.all([
    supabase.from('my_companies').select('*').order('my_company_name'),
    supabase.from('companies').select('*').order('company_name'),
    supabase.from('pn_master_table').select('pn_id, pn, description').order('pn'),
    supabase.from('company_ship_via')
      .select(`
        ship_via_id,
        ship_company_name,
        account_no,
        owner,
        ship_model,
        predefined_company,
        custom_company_name
      `)
      .order('ship_company_name')
  ])

  if (myCompaniesResult.error) throw myCompaniesResult.error
  if (companiesResult.error) throw companiesResult.error
  if (partNumbersResult.error) throw partNumbersResult.error
  if (shipViaResult.error) throw shipViaResult.error

  // Fetch addresses and contacts separately (no more company_ref_type filter needed)
  const [myCompanyAddresses, myCompanyContacts, companyAddresses, companyContacts] = await Promise.all([
    supabase.from('company_addresses').select('*'),
    supabase.from('company_contacts').select('*'),
    supabase.from('company_addresses').select('*'),
    supabase.from('company_contacts').select('*')
  ])

  // Combine my companies with their addresses and contacts
  const enrichedMyCompanies = myCompaniesResult.data?.map(company => ({
    ...(company as any),
    company_addresses: myCompanyAddresses.data?.filter(addr => (addr as any).company_id === (company as any).my_company_id) || [],
    company_contacts: myCompanyContacts.data?.filter(contact => (contact as any).company_id === (company as any).my_company_id) || []
  })) || []

  // Combine external companies with their addresses and contacts
  const enrichedExternalCompanies = companiesResult.data?.map(company => ({
    ...(company as any),
    company_addresses: companyAddresses.data?.filter(addr => (addr as any).company_id === (company as any).company_id) || [],
    company_contacts: companyContacts.data?.filter(contact => (contact as any).company_id === (company as any).company_id) || []
  })) || []

  return {
    myCompanies: enrichedMyCompanies,
    externalCompanies: enrichedExternalCompanies,
    partNumbers: partNumbersResult.data || [],
    shipViaList: shipViaResult.data || [],
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