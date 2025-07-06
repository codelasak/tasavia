import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase/server'
import InventoryList from './inventory-list'

export const dynamic = 'force-dynamic'

interface InventoryItem {
  inventory_id: string
  pn_id: string
  serial_number: string | null
  condition?: string
  location: string | null
  quantity?: number
  unit_cost?: number
  total_value?: number
  notes?: string | null
  last_updated?: string
  pn_master_table: {
    pn: string
    description: string | null
  }
}

async function getInventory() {
  try {
    const { data, error } = await supabase
      .from('inventory')
      .select(`
        *,
        pn_master_table(pn, description)
      `)
      .order('updated_at', { ascending: false })

    if (error) throw error
    
    return (data as InventoryItem[]) || []
  } catch (error) {
    console.error('Error fetching inventory:', error)
    return []
  }
}

export default async function InventoryPage() {
  const inventory = await getInventory()

  return (
    <div className="space-y-4 px-2 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
      </div>
      <InventoryList initialInventory={inventory} />
    </div>
  )
}