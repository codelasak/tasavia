'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Eye, Edit, Trash2, FileText, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { useRepairOrdersContext } from '@/hooks/useRepairOrdersContext'

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

export default function RepairOrdersList() {
  const router = useRouter()
  const [filteredOrders, setFilteredOrders] = useState<RepairOrder[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Use context for global repair order state management
  const {
    repairOrders,
    deleteRepairOrder,
    isOptimistic
  } = useRepairOrdersContext()

  useEffect(() => {
    let filtered = repairOrders.filter(order =>
      order.repair_order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.companies.company_name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter)
    }

    setFilteredOrders(filtered)
  }, [repairOrders, searchTerm, statusFilter])

  const handleDelete = async (order: RepairOrder) => {
    if (!confirm(`Are you sure you want to delete repair order ${order.repair_order_number}? This action cannot be undone.`)) {
      return
    }

    try {
      // Use context delete for immediate UI feedback
      await deleteRepairOrder(order.repair_order_id, async () => {
        // First check if there are any references to this RO in inventory or other tables
        const { data: inventoryReferences, error: inventoryCheckError } = await supabase
          .from('inventory')
          .select('inventory_id')
          .eq('ro_id', order.repair_order_id)
          .limit(1)

        if (inventoryCheckError) {
          throw new Error('Failed to check repair order references')
        }

        if (inventoryReferences && inventoryReferences.length > 0) {
          throw new Error('Cannot delete repair order: It is referenced in inventory records')
        }

        // Delete RO items first (due to foreign key constraint)
        const { error: itemsDeleteError } = await supabase
          .from('repair_order_items')
          .delete()
          .eq('repair_order_id', order.repair_order_id)

        if (itemsDeleteError) {
          throw itemsDeleteError
        }

        // Then delete the repair order
        const { error: roDeleteError } = await supabase
          .from('repair_orders')
          .delete()
          .eq('repair_order_id', order.repair_order_id)

        if (roDeleteError) {
          throw roDeleteError
        }
      })
    } catch (error: any) {
      // Handle specific error cases
      if (error.message.includes('referenced')) {
        toast.error(error.message)
      } else if (error.message.includes('foreign key')) {
        toast.error('Cannot delete repair order: It is referenced in other records')
      }
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      'Draft': 'bg-gray-100 text-gray-800',
      'Sent': 'bg-blue-100 text-blue-800',
      'In Progress': 'bg-yellow-100 text-yellow-800',
      'Completed': 'bg-green-100 text-green-800',
      'Received': 'bg-purple-100 text-purple-800',
      'Cancelled': 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getItemsCount = (items: RepairOrder['repair_order_items']) => {
    return items.length
  }

  const getWorkscopes = (items: RepairOrder['repair_order_items']) => {
    const workscopes = items.map(item => item.workscope)
    const unique = [...new Set(workscopes)]
    return unique.slice(0, 3).join(', ') + (unique.length > 3 ? ', ...' : '')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Repair Orders</CardTitle>
        <CardDescription>
          {repairOrders.length} repair orders • {filteredOrders.length} shown
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-2 pt-4 pb-4">
          <div className="relative w-full sm:w-auto flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search repair order numbers, vendors..."
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
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Sent">Sent</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Received">Received</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-slate-500">No repair orders found</div>
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
                <Card key={order.repair_order_id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-base text-slate-900">
                            {order.repair_order_number}
                          </span>
                          <Badge className={getStatusBadge(order.status || 'Draft')}>
                            {order.status || 'Draft'}
                          </Badge>
                          {order.expected_return_date && (
                            <span className="flex items-center text-xs text-slate-500">
                              <Calendar className="h-4 w-4 mr-1" />
                              Expected: {format(new Date(order.expected_return_date), 'MMM dd')}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-600 mb-1">
                          <span className="font-medium">{order.companies.company_name}</span>
                          <span className="ml-2">• {getItemsCount(order.repair_order_items)} items</span>
                        </div>
                        <div className="flex gap-4 text-xs text-slate-500">
                          <span>Created: {order.created_at ? format(new Date(order.created_at), 'MMM dd, yyyy') : 'N/A'}</span>
                          <span>Cost: <b>{order.currency || 'USD'} {order.total_cost?.toFixed(2) || '0.00'}</b></span>
                          {order.repair_order_items.length > 0 && (
                            <span>Work: {getWorkscopes(order.repair_order_items)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 ml-4">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => router.push(`/portal/repair-orders/${order.repair_order_id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => router.push(`/portal/repair-orders/${order.repair_order_id}/edit`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => router.push(`/portal/repair-orders/${order.repair_order_id}/pdf`)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={`h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 ${
                            isOptimistic(order.repair_order_id) ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          onClick={() => handleDelete(order)}
                          disabled={isOptimistic(order.repair_order_id)}
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
        </div>
      </CardContent>
    </Card>
  )
}