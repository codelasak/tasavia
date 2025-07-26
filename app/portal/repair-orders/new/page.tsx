import { createSupabaseServer } from '@/lib/supabase/server'
import NewRepairOrderClientPage from './NewRepairOrderClientPage'

export const dynamic = 'force-dynamic'

async function getFormData() {
  const supabase = createSupabaseServer()
  
  const [vendorsResult, inventoryResult] = await Promise.all([
    supabase.from('companies').select('*').eq('company_type', 'vendor').order('company_name'),
    supabase.from('inventory')
      .select(`
        *,
        pn_master_table(pn, description)
      `)
      .in('status', ['Available', 'Reserved'])
      .order('pn_master_table(pn)'),
  ])

  if (vendorsResult.error) {
    console.error('Error fetching vendors:', vendorsResult.error)
    throw vendorsResult.error
  }
  if (inventoryResult.error) {
    console.error('Error fetching inventory:', inventoryResult.error)
    throw inventoryResult.error
  }

  return {
    vendors: vendorsResult.data || [],
    inventoryItems: inventoryResult.data || [],
  }
}

export default async function NewRepairOrderPage() {
  const formData = await getFormData()

  return (
    <NewRepairOrderClientPage
      vendors={formData.vendors}
      inventoryItems={formData.inventoryItems}
    />
  )
}