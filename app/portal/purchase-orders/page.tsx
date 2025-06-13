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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Purchase Orders</h1>
          <p className="text-slate-600">Manage and track all purchase orders</p>
        </div>
        <Link href="/portal/purchase-orders/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Purchase Order
          </Button>
        </Link>
      </div>
      <PurchaseOrdersList initialPurchaseOrders={purchaseOrders} />
    </div>
  )
}