import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/server'
import SalesOrdersList from './sales-orders-list'

export const dynamic = 'force-dynamic'

async function getSalesOrders() {
  const { data, error } = await supabase
    .from('sales_orders')
    .select(`
      *,
      companies(company_name, company_code),
      my_companies(my_company_name)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching sales orders:', error)
    return []
  }
  return (data as any) || []
}

export default async function SalesOrdersPage() {
  const salesOrders = await getSalesOrders()

  return (
    <div className="space-y-4 px-2 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Sales Orders</h1>
        <Link href="/portal/sales-orders/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />Add Sales Order
          </Button>
        </Link>
      </div>
      <SalesOrdersList initialSalesOrders={salesOrders} />
    </div>
  )
}