'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Eye, Edit, Trash2, FileText, Truck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { SALES_ORDER_STATUSES } from '@/lib/constants/sales-order-constants'
import { StatusBadge } from '@/components/sales-order/StatusBadge'
import { useSalesOrders, useDeleteSalesOrder } from '@/lib/hooks/usePurchaseOrders'

export default function SalesOrdersList() {
  const router = useRouter()
  const { data: salesOrders = [], isLoading, error } = useSalesOrders()
  const deleteOrderMutation = useDeleteSalesOrder()
  const [filteredOrders, setFilteredOrders] = useState(salesOrders)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    let filtered = salesOrders.filter(order =>
      order.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.companies.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customer_po_number && order.customer_po_number.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter)
    }

    setFilteredOrders(filtered)
  }, [salesOrders, searchTerm, statusFilter])

  const handleDelete = (order: any) => {
    if (!confirm(`Are you sure you want to delete sales order ${order.invoice_number}?`)) return
    deleteOrderMutation.mutate(order.sales_order_id)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading sales orders...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-red-600 text-center">
            <div className="font-semibold">Error loading sales orders</div>
            <div className="text-sm mt-1">{error.message}</div>
          </div>
        </CardContent>
      </Card>
    )
  }


  return (
    <Card>
      <CardContent>
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-2 pt-4 pb-4">
          <div className="relative w-full sm:w-auto flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search invoice numbers, customers, PO numbers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {SALES_ORDER_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-slate-500">No sales orders found</div>
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
            <div className="space-y-2">
              {filteredOrders.map((order) => (
                <Card key={order.sales_order_id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-base text-slate-900">
                            {order.invoice_number}
                          </span>
                          <StatusBadge status={order.status || 'Draft'} />
                          {order.tracking_number && (
                            <span className="flex items-center text-xs text-slate-500">
                              <Truck className="h-4 w-4 mr-1" />
                              {order.tracking_number}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-600 mb-1">
                          <span className="font-medium">{order.companies.company_name}</span>
                          {order.customer_po_number && (
                            <span className="ml-2">• PO: {order.customer_po_number}</span>
                          )}
                        </div>
                        <div className="flex gap-4 text-xs text-slate-500">
                          <span>Date: {order.sales_date ? format(new Date(order.sales_date), 'MMM dd, yyyy') : 'N/A'}</span>
                          <span>Total: <b>{order.currency || 'USD'} {order.total_net?.toFixed(2) || '0.00'}</b></span>
                          <span>From: {order.my_companies.my_company_name}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 ml-4">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => router.push(`/portal/sales-orders/${order.sales_order_id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => router.push(`/portal/sales-orders/${order.sales_order_id}/edit`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => router.push(`/portal/sales-orders/${order.sales_order_id}/pdf`)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(order)}
                          disabled={deleteOrderMutation.isPending}
                        >
                          {deleteOrderMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}