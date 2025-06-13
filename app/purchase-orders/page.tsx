'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, Eye, Edit, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import Link from 'next/link'
import { format } from 'date-fns'

interface PurchaseOrder {
  po_id: string
  po_number: string
  po_date: string
  status: string
  total_amount: number
  my_companies: {
    my_company_name: string
    my_company_code: string
  }
  companies: {
    company_name: string
    company_code: string
  }
  created_at: string
}

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [filteredPOs, setFilteredPOs] = useState<PurchaseOrder[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPurchaseOrders()
  }, [])

  useEffect(() => {
    let filtered = purchaseOrders.filter(po =>
      po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.my_companies.my_company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.companies.company_name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (statusFilter !== 'all') {
      filtered = filtered.filter(po => po.status === statusFilter)
    }

    setFilteredPOs(filtered)
  }, [purchaseOrders, searchTerm, statusFilter])

  const fetchPurchaseOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          my_companies(my_company_name, my_company_code),
          companies(company_name, company_code)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPurchaseOrders(data || [])
    } catch (error) {
      console.error('Error fetching purchase orders:', error)
      toast.error('Failed to fetch purchase orders')
    } finally {
      setLoading(false)
    }
  }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading purchase orders...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Purchase Orders</h1>
          <p className="text-slate-600">Manage and track all purchase orders</p>
        </div>
        <Link href="/purchase-orders/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Purchase Order
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Order List</CardTitle>
          <CardDescription>
            {purchaseOrders.length} purchase orders • {filteredPOs.length} shown
          </CardDescription>
          <div className="flex space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Search PO number, companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
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
            <div className="space-y-4">
              {filteredPOs.map((po) => (
                <Card key={po.po_id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <div className="font-bold text-lg text-slate-900">
                            {po.po_number}
                          </div>
                          <Badge className={getStatusBadge(po.status)}>
                            {po.status}
                          </Badge>
                          <div className="text-sm text-slate-500">
                            {format(new Date(po.po_date), 'MMM dd, yyyy')}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-slate-500">From</div>
                            <div className="font-medium">{po.my_companies.my_company_name}</div>
                            <div className="text-slate-600">{po.my_companies.my_company_code}</div>
                          </div>
                          <div>
                            <div className="text-slate-500">To</div>
                            <div className="font-medium">{po.companies.company_name}</div>
                            <div className="text-slate-600">{po.companies.company_code}</div>
                          </div>
                          <div>
                            <div className="text-slate-500">Total Amount</div>
                            <div className="font-bold text-lg">${po.total_amount.toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <Link href={`/purchase-orders/${po.po_id}`}>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/purchase-orders/${po.po_id}/edit`}>
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/purchase-orders/${po.po_id}/pdf`}>
                          <Button variant="ghost" size="icon">
                            <FileText className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}