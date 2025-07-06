import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase/server'
import { Database } from '@/lib/supabase/database.types'
import MyCompaniesList from './my-companies-list'

export const dynamic = 'force-dynamic'

type MyCompany = Database['public']['Tables']['my_companies']['Row'] & {
  company_contacts: Database['public']['Tables']['company_contacts']['Row'][]
  company_addresses: Database['public']['Tables']['company_addresses']['Row'][]
  company_ship_via: Database['public']['Tables']['company_ship_via']['Row'][]
}

async function getMyCompanies() {
  try {
    // Fetch my companies first
    const { data: companiesData, error: companiesError } = await supabase
      .from('my_companies')
      .select('*')
      .order('my_company_name')

    if (companiesError) throw companiesError

    // Fetch addresses separately
    const { data: addressData } = await supabase
      .from('company_addresses')
      .select('*')
      .eq('company_ref_type', 'my_companies')

    // Fetch contacts separately 
    const { data: contactData } = await supabase
      .from('company_contacts') 
      .select('*')
      .eq('company_ref_type', 'my_companies')

    // Fetch shipping data separately
    const { data: shipViaData } = await supabase
      .from('company_ship_via')
      .select('*')
      .eq('company_ref_type', 'my_companies')

    // Combine the data
    const companiesWithRelations = companiesData?.map(company => ({
      ...company,
      company_addresses: addressData?.filter(addr => addr.company_id === company.my_company_id) || [],
      company_contacts: contactData?.filter(contact => contact.company_id === company.my_company_id) || [],
      company_ship_via: shipViaData?.filter(ship => ship.company_id === company.my_company_id) || []
    })) || []

    return companiesWithRelations
  } catch (error) {
    console.error('Error fetching companies:', error)
    return []
  }
}

export default async function MyCompaniesPage() {
  const companies = await getMyCompanies()

  return (
    <div className="space-y-4 px-2 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-900">My Companies</h1>
      </div>
      <MyCompaniesList initialCompanies={companies} />
    </div>
  )
}