import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import RepairOrdersList from './repair-orders-list'

export default function RepairOrdersPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-4 pb-4">
        <h1 className="text-2xl font-bold text-slate-900">Repair Orders</h1>
        <Link href="/portal/repair-orders/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />Add
          </Button>
        </Link>
      </div>
      <RepairOrdersList />
    </div>
  )
}