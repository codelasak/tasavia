import { supabase } from '@/lib/supabase/server'
import NewPurchaseOrderClientPage from './NewPurchaseOrderClientPage'

export const dynamic = 'force-dynamic'

async function getFormData() {
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

  // Fetch addresses and contacts separately
  const [myCompanyAddresses, myCompanyContacts, companyAddresses, companyContacts] = await Promise.all([
    supabase.from('company_addresses').select('*').eq('company_ref_type', 'my_companies'),
    supabase.from('company_contacts').select('*').eq('company_ref_type', 'my_companies'),
    supabase.from('company_addresses').select('*').eq('company_ref_type', 'companies'),
    supabase.from('company_contacts').select('*').eq('company_ref_type', 'companies')
  ])

  // Combine my companies with their addresses and contacts
  const enrichedMyCompanies = myCompaniesResult.data?.map(company => ({
    ...company,
    company_addresses: myCompanyAddresses.data?.filter(addr => addr.company_id === company.my_company_id) || [],
    company_contacts: myCompanyContacts.data?.filter(contact => contact.company_id === company.my_company_id) || []
  })) || []

  // Combine external companies with their addresses and contacts
  const enrichedExternalCompanies = companiesResult.data?.map(company => ({
    ...company,
    company_addresses: companyAddresses.data?.filter(addr => addr.company_id === company.company_id) || [],
    company_contacts: companyContacts.data?.filter(contact => contact.company_id === company.company_id) || []
  })) || []

  return {
    myCompanies: enrichedMyCompanies,
    externalCompanies: enrichedExternalCompanies,
    partNumbers: partNumbersResult.data || [],
    shipViaList: shipViaResult.data || [],
  }
}

export default async function NewPurchaseOrderPage() {
  const formData = await getFormData()

  return (
    <NewPurchaseOrderClientPage
      myCompanies={formData.myCompanies}
      externalCompanies={formData.externalCompanies}
      partNumbers={formData.partNumbers}
      shipViaList={formData.shipViaList}
    />
  )
}