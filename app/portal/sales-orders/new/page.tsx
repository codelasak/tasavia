import { supabase } from '@/lib/supabase/server'
import NewSalesOrderClientPage from './NewSalesOrderClientPage'

export const dynamic = 'force-dynamic'

async function getFormData() {
  const [myCompaniesResult, customersResult, inventoryResult, termsResult] = await Promise.all([
    supabase.from('my_companies').select('*').order('my_company_name'),
    supabase.from('companies').select('*, customer_number').order('company_name'),
    supabase.from('inventory')
      .select(`
        *,
        pn_master_table(pn, description)
      `)
      .in('status', ['Available'])
      .order('pn_master_table(pn)'),
    supabase.from('terms_and_conditions').select('*').eq('is_active', true).order('title')
  ])

  if (myCompaniesResult.error) throw myCompaniesResult.error
  if (customersResult.error) throw customersResult.error
  if (inventoryResult.error) throw inventoryResult.error
  if (termsResult.error) throw termsResult.error

  return {
    myCompanies: myCompaniesResult.data || [],
    customers: customersResult.data || [],
    inventoryItems: inventoryResult.data || [],
    termsAndConditions: termsResult.data || [],
  }
}

export default async function NewSalesOrderPage() {
  const formData = await getFormData()

  return (
    <NewSalesOrderClientPage
      myCompanies={formData.myCompanies}
      customers={formData.customers}
      inventoryItems={formData.inventoryItems}
      termsAndConditions={formData.termsAndConditions}
    />
  )
}