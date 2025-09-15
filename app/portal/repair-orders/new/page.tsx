import { createSupabaseServer } from '@/lib/supabase/server'
import { getAvailablePurchaseOrdersForRO } from '@/lib/services/repair-order-service.server'
import NewRepairOrderClientPage from './NewRepairOrderClientPage'

export const dynamic = 'force-dynamic'

async function getFormData() {
  const supabase = createSupabaseServer()

  const [vendorsResult, inventoryResult, availablePOsResult] = await Promise.all([
    supabase.from('companies').select('*').in('company_type', ['vendor', 'both']).order('company_name'),
    supabase.from('inventory')
      .select(`
        *,
        pn_master_table(pn, description)
      `)
      .in('status', ['Available', 'Reserved'])
      .order('pn_master_table(pn)'),
    getAvailablePurchaseOrdersForRO()
  ])

  if (vendorsResult.error) {
    console.error('Error fetching vendors:', vendorsResult.error)
    throw vendorsResult.error
  }
  if (inventoryResult.error) {
    console.error('Error fetching inventory:', inventoryResult.error)
    throw inventoryResult.error
  }

  // Transform PO data to include vendor_company_name
  const transformedPOs = availablePOsResult.map(po => ({
    ...po,
    vendor_company_name: po.companies?.company_name || ''
  }))

  return {
    vendors: vendorsResult.data || [],
    inventoryItems: inventoryResult.data || [],
    availablePOs: transformedPOs
  }
}

export default async function NewRepairOrderPage() {
  const formData = await getFormData()

  return (
    <NewRepairOrderClientPage
      vendors={formData.vendors}
      inventoryItems={formData.inventoryItems as any}
      availablePOs={formData.availablePOs}
    />
  )
}