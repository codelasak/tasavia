import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import SalesOrdersList from './sales-orders-list'

export default function SalesOrdersPage() {
  return (
    <div className="space-y-4 px-2 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
        <Link href="/portal/sales-orders/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />Create Invoice
          </Button>
        </Link>
      </div>
      <SalesOrdersList />
    </div>
  )
}