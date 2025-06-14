import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/server'
import PurchaseOrdersList from './purchase-orders-list'

export const dynamic = 'force-dynamic'

async function getPurchaseOrders() {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select(
      `
      po_id,
      po_number,
      po_date,
      status,
      total_amount,
      created_at,
      my_companies (
        my_company_name,
        my_company_code
      ),
      companies (
        company_name,
        company_code
      )
    `
    )
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching purchase orders:', error)
    return []
  }
  return (data as any) || []
}

export default async function PurchaseOrdersPage() {
  const purchaseOrders = await getPurchaseOrders()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-4 pb-4">
        <h1 className="text-2xl font-bold text-slate-900">Purchase Orders</h1>
        <Link href="/portal/purchase-orders/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />Add
          </Button>
        </Link>
      </div>
      <PurchaseOrdersList initialPurchaseOrders={purchaseOrders} />
    </div>
  )
}