import { createSupabaseServer } from '@/lib/supabase/server'
import FullTracePaperworkPage from './FullTracePaperworkPage'

export default async function FullTracePaperworkServerPage() {
  const supabase = createSupabaseServer()

  // Fetch company information for pre-filling compliance data
  const { data: myCompanies } = await supabase
    .from('my_companies')
    .select('my_company_name, my_company_code, my_company_id')
    .limit(1)
    .single()

  // Fetch related addresses and contacts separately
  let companyAddresses: any[] = []
  let companyContacts: any[] = []

  if (myCompanies) {
    const { data: addresses } = await supabase
      .from('company_addresses')
      .select('address_line1, address_line2, city, country')
      .eq('company_ref_type', 'my_companies')
      .eq('company_ref_id', myCompanies.my_company_id)

    const { data: contacts } = await supabase
      .from('company_contacts')
      .select('contact_name, phone, email')
      .eq('company_ref_type', 'my_companies')
      .eq('company_ref_id', myCompanies.my_company_id)

    companyAddresses = addresses || []
    companyContacts = contacts || []
  }

  // Fetch recent parts data for quick selection
  const { data: recentParts } = await supabase
    .from('inventory')
    .select(`
      serial_number,
      condition,
      quantity,
      traceability_source,
      traceable_to,
      last_certified_agency,
      part_status_certification,
      pn_master_table (
        pn,
        description
      )
    `)
    .order('created_at', { ascending: false })
    .limit(10)

  // Combine the company data to match the CompanyData interface
  const companyData = myCompanies ? {
    my_company_name: myCompanies.my_company_name,
    my_company_code: myCompanies.my_company_code,
    company_addresses: companyAddresses,
    company_contacts: companyContacts
  } : null

  return (
    <FullTracePaperworkPage 
      companyData={companyData}
      recentParts={recentParts || []}
    />
  )
}