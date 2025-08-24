import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { createSupabaseServer } from '@/lib/supabase/server'
import { Database } from '@/lib/supabase/database.types'
import CompaniesList from './companies-list'

export const dynamic = 'force-dynamic'

type ExternalCompany = Database['public']['Tables']['companies']['Row'] & {
  company_contacts: Database['public']['Tables']['company_contacts']['Row'][]
  company_addresses: Database['public']['Tables']['company_addresses']['Row'][]
  company_ship_via: Database['public']['Tables']['company_ship_via']['Row'][]
}

async function getCompanies() {
  const supabase = createSupabaseServer()
  try {
    // Fetch companies first
    const { data: companiesData, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .order('company_name')

    if (companiesError) throw companiesError

    // Fetch addresses separately (no more company_ref_type filter needed)
    const { data: addressData } = await supabase
      .from('company_addresses')
      .select('*')

    // Fetch contacts separately 
    const { data: contactData } = await supabase
      .from('company_contacts') 
      .select('*')

    // Fetch shipping data separately
    const { data: shipViaData } = await supabase
      .from('company_ship_via')
      .select('*')

    // Combine the data
    const companiesWithRelations = companiesData?.map((company: any) => ({
      ...company,
      company_addresses: addressData?.filter((addr: any) => addr.company_id === company.company_id) || [],
      company_contacts: contactData?.filter((contact: any) => contact.company_id === company.company_id) || [],
      company_ship_via: shipViaData?.filter((ship: any) => ship.company_id === company.company_id) || []
    })) || []

    return companiesWithRelations
  } catch (error) {
    console.error('Error fetching companies:', error)
    return []
  }
}

export default async function CompaniesPage() {
  const companies = await getCompanies()

  return (
    <div className="space-y-4 px-2 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-900">External Companies</h1>
      </div>
      <CompaniesList initialCompanies={companies} />
    </div>
  )
}