import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { createSupabaseServer } from '@/lib/supabase/server'
import RepairOrdersList from './repair-orders-list'

export const dynamic = 'force-dynamic'

interface RepairOrder {
  repair_order_id: string
  repair_order_number: string
  vendor_company_id: string
  status: string | null
  expected_return_date: string | null
  actual_return_date: string | null
  total_cost: number | null
  currency: string | null
  created_at: string | null
  companies: {
    company_name: string
    company_code: string | null
  }
  repair_order_items: Array<{
    workscope: string
    estimated_cost: number | null
    inventory: {
      pn_master_table: {
        pn: string
      }
    }
  }>
}

async function getRepairOrders() {
  const supabase = createSupabaseServer()
  try {
    const { data, error } = await supabase
      .from('repair_orders')
      .select(`
        *,
        companies(company_name, company_code),
        repair_order_items(
          workscope,
          estimated_cost,
          inventory(
            pn_master_table(pn)
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    
    return (data as any) || []
  } catch (error) {
    console.error('Error fetching repair orders:', error)
    return []
  }
}

export default async function RepairOrdersPage() {
  const repairOrders = await getRepairOrders()

  return (
    <div className="space-y-4 px-2 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Repair Orders</h1>
        <Link href="/portal/repair-orders/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />Add Repair Order
          </Button>
        </Link>
      </div>
      <RepairOrdersList initialRepairOrders={repairOrders} />
    </div>
  )
}