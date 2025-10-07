import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { createSupabaseServer } from '@/lib/supabase/server'
import InventoryList from './inventory-list'

export const dynamic = 'force-dynamic'

interface InventoryItem {
  inventory_id: string
  pn_id: string
  sn: string | null
  location: string | null
  po_price: number | null
  remarks: string | null
  status: string | null
  physical_status: 'depot' | 'in_repair' | 'in_transit'
  business_status: 'available' | 'reserved' | 'sold' | 'cancelled'
  status_updated_at: string | null
  status_updated_by: string | null
  po_id_original: string | null
  po_number_original: string | null
  created_at: string | null
  updated_at: string | null
  pn_master_table?: {
    pn: string
    description: string | null
  }
}

async function getInventory() {
  try {
    const supabase = createSupabaseServer()

    // Use the RPC function to avoid PostgREST relationship ambiguity
    console.log('🔍 Fetching inventory data with RPC function...')
    const { data, error } = await supabase.rpc('get_inventory_with_parts')

    if (error) {
      console.error('❌ RPC query failed, trying direct query:', error)

      // Fallback to direct query without relationship
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory')
        .select(`
          inventory_id,
          pn_id,
          sn,
          location,
          po_price,
          remarks,
          status,
          physical_status,
          business_status,
          status_updated_at,
          status_updated_by,
          po_id_original,
          po_number_original,
          created_at,
          updated_at
        `)
        .order('updated_at', { ascending: false })

      if (inventoryError) {
        console.error('❌ Direct inventory query error:', inventoryError)
        throw inventoryError
      }

      // Manually fetch part numbers for each inventory item
      if (inventoryData && inventoryData.length > 0) {
        const pnIds = inventoryData.map(item => item.pn_id)
        const { data: partNumbers, error: pnError } = await supabase
          .from('pn_master_table')
          .select('pn_id, pn, description')
          .in('pn_id', pnIds)

        if (pnError) {
          console.error('❌ Part numbers query error:', pnError)
        } else {
          // Join the data manually and cast to expected types
          const joinedData = inventoryData.map(item => ({
            ...item,
            physical_status: item.physical_status as 'depot' | 'in_repair' | 'in_transit',
            business_status: item.business_status as 'available' | 'reserved' | 'sold' | 'cancelled' | 'cancelled',
            pn_master_table: partNumbers?.find(pn => pn.pn_id === item.pn_id) || { pn: '', description: null }
          }))
          console.log('✅ Manual join successful:', joinedData.length, 'items')
          return joinedData
        }
      }

      // Cast data to expected types
      const castData = inventoryData?.map(item => ({
        ...item,
        physical_status: item.physical_status as 'depot' | 'in_repair' | 'in_transit',
        business_status: item.business_status as 'available' | 'reserved' | 'sold' | 'cancelled'
      })) || []

      console.log('✅ Direct query successful:', castData.length, 'items')
      return castData
    }

    // Cast RPC data to expected types
    const castData = data?.map(item => ({
      ...item,
      physical_status: item.physical_status as 'depot' | 'in_repair' | 'in_transit',
      business_status: item.business_status as 'available' | 'reserved' | 'sold' | 'cancelled'
    })) || []

    console.log('✅ RPC query successful:', castData.length, 'items')
    return castData
  } catch (error) {
    console.error('💥 Error fetching inventory:', error)
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