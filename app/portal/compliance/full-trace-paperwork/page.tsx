import { createSupabaseServer } from '@/lib/supabase/server'
import FullTracePaperworkPage from './FullTracePaperworkPage'

export default async function FullTracePaperworkServerPage() {
  const supabase = createSupabaseServer()

  // Fetch company information for pre-filling compliance data (internal companies only)
  const { data: myCompanies } = await supabase
    .from('companies')
    .select('company_name, company_code, company_id')
    .eq('is_self', true)
    .limit(1)
    .single()

  // Fetch related addresses and contacts separately
  let companyAddresses: any[] = []
  let companyContacts: any[] = []

  if (myCompanies) {
    const { data: addresses } = await supabase
      .from('company_addresses')
      .select('address_line1, address_line2, city, country')
      .eq('company_id', myCompanies.company_id)

    const { data: contacts } = await supabase
      .from('company_contacts')
      .select('contact_name, phone, email')
      .eq('company_id', myCompanies.company_id)

    companyAddresses = addresses || []
    companyContacts = contacts || []
  }

  // Fetch recent parts data for quick selection
  const { data: recentParts } = await supabase
    .from('inventory')
    .select(`
      sn,
      status,
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
    my_company_name: myCompanies.company_name,
    my_company_code: myCompanies.company_code || '',
    company_addresses: companyAddresses,
    company_contacts: companyContacts
  } : null

  return (
    <FullTracePaperworkPage 
      companyData={companyData}
      recentParts={recentParts as any || []}
    />
  )
}