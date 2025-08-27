import { createSupabaseServer } from '@/lib/supabase/server'
import NewSalesOrderClientPage from './NewSalesOrderClientPage'

export const dynamic = 'force-dynamic'

async function getFormData() {
  const supabase = createSupabaseServer()
  const [myCompaniesResult, customersResult, inventoryResult, termsResult] = await Promise.all([
    supabase.from('companies').select('*, company_name as my_company_name, company_code as my_company_code, company_id as my_company_id').eq('is_self', true).order('company_name'),
    supabase.from('companies').select('*, customer_number').neq('is_self', true).order('company_name'),
    supabase.from('inventory')
      .select(`
        *,
        pn_master_table(pn, description)
      `)
      .in('status', ['Available'] as any)
      .order('pn_master_table(pn)'),
    supabase.from('terms_and_conditions').select('*').eq('is_active', true as any).order('title')
  ])

  if (myCompaniesResult.error) throw myCompaniesResult.error
  if (customersResult.error) throw customersResult.error
  if (inventoryResult.error) throw inventoryResult.error
  if (termsResult.error) throw termsResult.error

  return {
    myCompanies: (myCompaniesResult.data || []) as any,
    customers: (customersResult.data || []) as any,
    inventoryItems: (inventoryResult.data || []) as any,
    termsAndConditions: (termsResult.data || []) as any,
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