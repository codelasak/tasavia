import { createSupabaseServer } from '@/lib/supabase/server'
import NewSalesOrderClientPage from './NewSalesOrderClientPage'
import { getAvailablePurchaseOrdersForRO } from '@/lib/services/repair-order-service.server'

export const dynamic = 'force-dynamic'

async function getFormData() {
  const supabase = createSupabaseServer()
  const [myCompaniesResult, customersResult, inventoryResult, termsResult, availablePOsResult] = await Promise.all([
    // Use proper PostgREST alias syntax: alias:column
    supabase
      .from('companies')
      .select('my_company_id:company_id, my_company_name:company_name, my_company_code:company_code')
      .eq('is_self', true)
      .order('company_name'),
    supabase.from('companies').select('*, customer_number').neq('is_self', true).order('company_name'),
    supabase.from('inventory')
      .select(`
        *,
        pn_master_table(pn, description)
      `)
      .in('status', ['Available'] as any)
      .order('pn_master_table(pn)'),
    supabase.from('terms_and_conditions').select('*').eq('is_active', true as any).order('title'),
    getAvailablePurchaseOrdersForRO(),
  ])

  if (myCompaniesResult.error) throw new Error(myCompaniesResult.error.message)
  if (customersResult.error) throw new Error(customersResult.error.message)
  if (inventoryResult.error) throw new Error(inventoryResult.error.message)
  if (termsResult.error) throw new Error(termsResult.error.message)

  // Transform PO data to include vendor_company_name for convenience (similar to repair-orders)
  const transformedPOs = (availablePOsResult || []).map((po: any) => ({
    ...po,
    vendor_company_name: po.companies?.company_name || ''
  }))

  return {
    myCompanies: (myCompaniesResult.data || []) as any,
    customers: (customersResult.data || []) as any,
    inventoryItems: (inventoryResult.data || []) as any,
    termsAndConditions: (termsResult.data || []) as any,
    availablePOs: transformedPOs,
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
      availablePOs={formData.availablePOs}
    />
  )
}
