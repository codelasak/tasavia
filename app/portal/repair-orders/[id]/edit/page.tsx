import { createSupabaseServer } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import RepairOrderEditClientPage from './RepairOrderEditClientPage'

export const dynamic = 'force-dynamic'

interface RepairOrderEditPageProps {
  params: {
    id: string
  }
}

async function getEditPageData(roId: string) {
  const supabase = createSupabaseServer()

  // Fetch repair order and items
  const [roResult, itemsResult] = await Promise.all([
    supabase
      .from('repair_orders')
      .select('*')
      .eq('repair_order_id', roId)
      .single(),
    supabase
      .from('repair_order_items')
      .select(`
        *,
        inventory(
          *,
          pn_master_table(pn, description)
        )
      `)
      .eq('repair_order_id', roId)
      .order('line_number'),
  ])

  if (roResult.error) {
    throw new Error(`Failed to fetch repair order: ${roResult.error.message}`)
  }
  if (!roResult.data) {
    notFound()
  }
  if (itemsResult.error) {
    throw new Error(`Failed to fetch repair order items: ${itemsResult.error.message}`)
  }

  const currentItemIds = (itemsResult.data || []).map((i: any) => i.inventory_id)

  // Fetch vendors and inventory options
  const [vendorsResult, availableInventoryResult, selectedInventoryResult] = await Promise.all([
    supabase
      .from('companies')
      .select('*')
      .in('company_type', ['vendor', 'both'])
      .order('company_name'),
    supabase
      .from('inventory')
      .select(`*, pn_master_table(pn, description)`) 
      .in('status', ['Available', 'Reserved'])
      .order('pn_master_table(pn)'),
    currentItemIds.length
      ? supabase
          .from('inventory')
          .select(`*, pn_master_table(pn, description)`) 
          .in('inventory_id', currentItemIds)
      : Promise.resolve({ data: [], error: null } as any),
  ])

  if (vendorsResult.error) {
    throw new Error(`Failed to fetch vendors: ${vendorsResult.error.message}`)
  }
  if (availableInventoryResult.error) {
    throw new Error(`Failed to fetch inventory: ${availableInventoryResult.error.message}`)
  }
  if (selectedInventoryResult && (selectedInventoryResult as any).error) {
    throw new Error(`Failed to fetch selected inventory: ${(selectedInventoryResult as any).error.message}`)
  }

  // Merge available inventory with selected items to ensure they are selectable
  const available = (availableInventoryResult.data || []) as any[]
  const selected = (selectedInventoryResult as any)?.data || []
  const byId: Record<string, any> = {}
  for (const item of [...available, ...selected]) {
    byId[item.inventory_id] = item
  }
  const inventoryItems = Object.values(byId)

  return {
    repairOrder: roResult.data,
    items: itemsResult.data || [],
    vendors: vendorsResult.data || [],
    inventoryItems,
  }
}

export default async function RepairOrderEditPage({ params }: RepairOrderEditPageProps) {
  try {
    const data = await getEditPageData(params.id)
    return (
      <RepairOrderEditClientPage
        roId={params.id}
        vendors={data.vendors as any}
        inventoryItems={data.inventoryItems as any}
        initialOrder={data.repairOrder as any}
        initialItems={data.items as any}
      />
    )
  } catch (e) {
    console.error('Failed to load repair order edit page:', e)
    notFound()
  }
}
