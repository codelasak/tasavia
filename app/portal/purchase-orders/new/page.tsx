import { createSupabaseServer } from '@/lib/supabase/server'
import NewPurchaseOrderClientPage from './NewPurchaseOrderClientPage'

export const dynamic = 'force-dynamic'

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
        ship_model,
        predefined_company,
        custom_company_name
      `)
      .order('ship_company_name')
  ])

  if (companiesResult.error) throw companiesResult.error
  if (partNumbersResult.error) throw partNumbersResult.error
  if (shipViaResult.error) throw shipViaResult.error

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
      // Keep legacy field names for compatibility with existing component
      my_company_id: company.company_id,
      my_company_name: company.company_name,
      my_company_code: company.company_code,
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
    shipViaList: shipViaResult.data || [],
  }
}

export default async function NewPurchaseOrderPage() {
  const formData = await getFormData()

  return (
    <NewPurchaseOrderClientPage
      myCompanies={formData.myCompanies}
      externalCompanies={formData.externalCompanies}
      partNumbers={formData.partNumbers as any}
      shipViaList={formData.shipViaList as any}
    />
  )
}