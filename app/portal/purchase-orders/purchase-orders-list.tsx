'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, Eye, Edit, FileText, Trash2 } from 'lucide-react'
import Link from 'next/link'
import * as dateFns from 'date-fns'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { usePurchaseOrdersContext } from '@/hooks/usePurchaseOrdersContext'

interface PurchaseOrder {
  po_id: string
  po_number: string
  po_date: string
  status: string
  total_amount: number
  my_companies: {
    my_company_name: string
    my_company_code: string
  } | null
  companies: {
    company_name: string
    company_code: string
  } | null
  created_at: string
}

export default function PurchaseOrdersList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [filteredPOs, setFilteredPOs] = useState<PurchaseOrder[]>([])

  // Use context for global PO state management
  const {
    purchaseOrders,
    deletePurchaseOrder,
    isOptimistic
  } = usePurchaseOrdersContext()

  useEffect(() => {
    let filtered = purchaseOrders.filter(po =>
      po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.my_companies?.my_company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.companies?.company_name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (statusFilter !== 'all') {
      filtered = filtered.filter(po => po.status === statusFilter)
    }

    setFilteredPOs(filtered)
  }, [purchaseOrders, searchTerm, statusFilter])

  const getStatusBadge = (status: string) => {
    const colors = {
      Draft: 'bg-gray-100 text-gray-800',
      Sent: 'bg-blue-100 text-blue-800',
      Acknowledged: 'bg-yellow-100 text-yellow-800',
      Completed: 'bg-green-100 text-green-800',
      Cancelled: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const handleDelete = async (po: PurchaseOrder) => {
    if (!confirm(`Are you sure you want to delete purchase order ${po.po_number}? This action cannot be undone.`)) {
      return
    }

    try {
      // Use context delete for immediate UI feedback
      await deletePurchaseOrder(po.po_id, async () => {
        // First check if there are any references to this PO in inventory
        const { data: inventoryReferences, error: inventoryCheckError } = await supabase
          .from('inventory')
          .select('inventory_id')
          .eq('po_id_original', po.po_id)
          .limit(1)

        if (inventoryCheckError) {
          throw new Error('Failed to check purchase order references')
        }

        if (inventoryReferences && inventoryReferences.length > 0) {
          throw new Error('Cannot delete purchase order: It is referenced in inventory records')
        }

        // Delete PO items first (due to foreign key constraint)
        const { error: itemsDeleteError } = await supabase
          .from('po_items')
          .delete()
          .eq('po_id', po.po_id)

        if (itemsDeleteError) {
          throw itemsDeleteError
        }

        // Then delete the purchase order
        const { error: poDeleteError } = await supabase
          .from('purchase_orders')
          .delete()
          .eq('po_id', po.po_id)

        if (poDeleteError) {
          throw poDeleteError
        }
      })
    } catch (error: any) {
      // Handle specific error cases
      if (error.message.includes('referenced')) {
        toast.error(error.message)
      } else if (error.message.includes('foreign key')) {
        toast.error('Cannot delete purchase order: It is referenced in other records')
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Purchase Order List</CardTitle>
            <CardDescription>
              {purchaseOrders.length} purchase orders • {filteredPOs.length} shown
            </CardDescription>
          </div>

        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:space-x-4 sm:gap-0 pt-2 pb-2">
          <div className="relative w-full sm:w-auto flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search PO number, companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Sent">Sent</SelectItem>
              <SelectItem value="Acknowledged">Acknowledged</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredPOs.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-slate-500">No purchase orders found</div>
            {(searchTerm || statusFilter !== 'all') && (
              <Button
                variant="link"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                }}
                className="mt-2"
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPOs.map((po) => (
              <Card key={po.po_id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 mb-2">
                        <div className="font-bold text-base sm:text-lg text-slate-900">
                          {po.po_number}
                        </div>
                        <Badge className={getStatusBadge(po.status)}>
                          {po.status}
                        </Badge>
                        <div className="text-xs sm:text-sm text-slate-500">
                          {dateFns.format(new Date(po.po_date), 'MMM dd, yyyy')}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2 text-xs sm:text-sm md:grid-cols-3 md:gap-4">
                        <div>
                          <div className="text-slate-500">From</div>
                          <div className="font-medium">{po.my_companies?.my_company_name}</div>
                          <div className="text-slate-600">{po.my_companies?.my_company_code}</div>
                        </div>
                        <div>
                          <div className="text-slate-500">To</div>
                          <div className="font-medium">{po.companies?.company_name}</div>
                          <div className="text-slate-600">{po.companies?.company_code}</div>
                        </div>
                        <div>
                          <div className="text-slate-500">Total Amount</div>
                          <div className="font-bold text-base sm:text-lg">${po.total_amount.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 sm:mt-0 sm:ml-4">
                      <Link href={`/portal/purchase-orders/${po.po_id}`} className="flex-1 sm:flex-none">
                        <Button variant="ghost" size="icon" className="w-full sm:w-auto">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/portal/purchase-orders/${po.po_id}/edit`} className="flex-1 sm:flex-none">
                        <Button variant="ghost" size="icon" className="w-full sm:w-auto">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/portal/purchase-orders/${po.po_id}/pdf`} className="flex-1 sm:flex-none">
                        <Button variant="ghost" size="icon" className="w-full sm:w-auto">
                          <FileText className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={`flex-1 sm:flex-none text-red-600 hover:text-red-700 hover:bg-red-50 ${
                          isOptimistic(po.po_id) ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        onClick={() => handleDelete(po)}
                        disabled={isOptimistic(po.po_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
