'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, Eye, Edit, FileText } from 'lucide-react'
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
  } | null
  companies: {
    company_name: string
    company_code: string
  } | null
  created_at: string
}

interface PurchaseOrdersListProps {
  initialPurchaseOrders: PurchaseOrder[]
}

export default function PurchaseOrdersList({ initialPurchaseOrders }: PurchaseOrdersListProps) {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(initialPurchaseOrders)
  const [filteredPOs, setFilteredPOs] = useState<PurchaseOrder[]>(initialPurchaseOrders)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchase Order List</CardTitle>
        <CardDescription>
          {purchaseOrders.length} purchase orders • {filteredPOs.length} shown
        </CardDescription>
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
                          {format(new Date(po.po_date), 'MMM dd, yyyy')}
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
