'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit, FileText, Package, Truck } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface SalesOrderDetails {
  sales_order_id: string
  invoice_number: string
  customer_po_number: string | null
  sales_date: string | null
  status: string | null
  sub_total: number | null
  total_net: number | null
  currency: string | null
  payment_terms: string | null
  tracking_number: string | null
  remarks: string | null
  created_at: string | null
  updated_at: string | null
  my_companies: {
    my_company_name: string
    my_company_code: string
    bank_details: any
  }
  companies: {
    company_name: string
    company_code: string | null
  }
  terms_and_conditions: {
    title: string
    version: string | null
  } | null
  sales_order_items: Array<{
    sales_order_item_id: string
    line_number: number
    unit_price: number
    line_total: number | null
    inventory: {
      inventory_id: string
      serial_number: string | null
      condition: string | null
      quantity: number | null
      traceability_source: string | null
      traceable_to: string | null
      last_certified_agency: string | null
      part_status_certification: string | null
      pn_master_table: {
        pn: string
        description: string | null
      }
    }
  }>
}

interface SalesOrderViewClientPageProps {
  salesOrder: SalesOrderDetails
}

export default function SalesOrderViewClientPage({ salesOrder: initialSalesOrder }: SalesOrderViewClientPageProps) {
  const router = useRouter()
  const [salesOrder, setSalesOrder] = useState<SalesOrderDetails>(initialSalesOrder)

  const updateStatus = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('sales_orders')
        .update({ status: newStatus })
        .eq('sales_order_id', salesOrder.sales_order_id)

      if (error) throw error

      // Update inventory status based on sales order status
      if (newStatus === 'Shipped') {
        // Update inventory items to 'Sold' status
        for (const item of salesOrder.sales_order_items) {
          await supabase
            .from('inventory')
            .update({ status: 'Sold' })
            .eq('inventory_id', item.inventory.inventory_id)
        }
      }

      setSalesOrder({ ...salesOrder, status: newStatus })
      toast.success(`Sales order status updated to ${newStatus}`)
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      'Draft': 'bg-gray-100 text-gray-800',
      'Confirmed': 'bg-blue-100 text-blue-800',
      'Shipped': 'bg-yellow-100 text-yellow-800',
      'Invoiced': 'bg-green-100 text-green-800',
      'Closed': 'bg-purple-100 text-purple-800',
      'Cancelled': 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getStatusActions = (currentStatus: string) => {
    const actions = []
    
    if (currentStatus === 'Draft') {
      actions.push({ label: 'Confirm Order', status: 'Confirmed', variant: 'default' })
    }
    if (currentStatus === 'Confirmed') {
      actions.push({ label: 'Mark as Shipped', status: 'Shipped', variant: 'default' })
    }
    if (currentStatus === 'Shipped') {
      actions.push({ label: 'Mark as Invoiced', status: 'Invoiced', variant: 'default' })
    }
    if (currentStatus === 'Invoiced') {
      actions.push({ label: 'Close Order', status: 'Closed', variant: 'default' })
    }
    if (!['Closed', 'Cancelled'].includes(currentStatus)) {
      actions.push({ label: 'Cancel Order', status: 'Cancelled', variant: 'destructive' })
    }
    
    return actions
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Sales Order</h1>
            <p className="text-slate-600">Invoice: {salesOrder.invoice_number}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={() => router.push(`/portal/sales-orders/${salesOrder.sales_order_id}/edit`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button 
            variant="outline"
            onClick={() => router.push(`/portal/sales-orders/${salesOrder.sales_order_id}/pdf`)}
          >
            <FileText className="h-4 w-4 mr-2" />
            Invoice PDF
          </Button>
          <Button 
            variant="outline"
            onClick={() => router.push(`/portal/sales-orders/${salesOrder.sales_order_id}/ata106`)}
          >
            <FileText className="h-4 w-4 mr-2" />
            ATA 106 Form
          </Button>
          <Button 
            variant="outline"
            onClick={() => router.push(`/portal/sales-orders/${salesOrder.sales_order_id}/packing-slip`)}
          >
            <FileText className="h-4 w-4 mr-2" />
            Packing Slip
          </Button>
        </div>
      </div>

      {/* Status and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>Status</CardTitle>
              <Badge className={getStatusBadge(salesOrder.status || 'Unknown')}>
                {salesOrder.status || 'Unknown'}
              </Badge>
            </div>
            <div className="flex gap-2">
              {getStatusActions(salesOrder.status || 'Unknown').map((action) => (
                <Button
                  key={action.status}
                  variant={action.variant as any}
                  size="sm"
                  onClick={() => updateStatus(action.status)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Order Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-slate-500 text-sm">Invoice Number</div>
              <div className="font-mono font-bold text-lg">{salesOrder.invoice_number}</div>
            </div>
            <div>
              <div className="text-slate-500 text-sm">Sales Date</div>
              <div className="font-medium">
                {salesOrder.sales_date ? format(new Date(salesOrder.sales_date), 'MMMM dd, yyyy') : 'N/A'}
              </div>
            </div>
            {salesOrder.customer_po_number && (
              <div>
                <div className="text-slate-500 text-sm">Customer PO Number</div>
                <div className="font-medium">{salesOrder.customer_po_number}</div>
              </div>
            )}
            <div>
              <div className="text-slate-500 text-sm">Payment Terms</div>
              <div className="font-medium">{salesOrder.payment_terms || 'N/A'}</div>
            </div>
            <div>
              <div className="text-slate-500 text-sm">Currency</div>
              <div className="font-medium">{salesOrder.currency}</div>
            </div>
            {salesOrder.tracking_number && (
              <div>
                <div className="text-slate-500 text-sm">Tracking Number</div>
                <div className="font-medium flex items-center">
                  <Truck className="h-4 w-4 mr-2" />
                  {salesOrder.tracking_number}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Company Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>From (Our Company)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="font-semibold">{salesOrder.my_companies.my_company_name}</div>
              <div className="text-slate-600">{salesOrder.my_companies.my_company_code}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>To (Customer)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="font-semibold">{salesOrder.companies.company_name}</div>
              <div className="text-slate-600">{salesOrder.companies.company_code}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {salesOrder.sales_order_items
              .sort((a, b) => a.line_number - b.line_number)
              .map((item) => (
              <Card key={item.sales_order_item_id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono font-bold">{item.inventory.pn_master_table.pn}</span>
                      {item.inventory.condition && (
                        <Badge variant="outline">{item.inventory.condition}</Badge>
                      )}
                    </div>
                    {item.inventory.pn_master_table.description && (
                      <div className="text-sm text-slate-600 mb-2">
                        {item.inventory.pn_master_table.description}
                      </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">S/N:</span> {item.inventory.serial_number || 'N/A'}
                      </div>
                      <div>
                        <span className="text-slate-500">Qty:</span> {item.inventory.quantity || 0}
                      </div>
                      <div>
                        <span className="text-slate-500">Unit Price:</span> ${item.unit_price.toFixed(2)}
                      </div>
                      <div>
                        <span className="text-slate-500">Line Total:</span> <b>${(item.line_total || 0).toFixed(2)}</b>
                      </div>
                    </div>
                    
                    {/* Traceability Information */}
                    {item.inventory.traceability_source && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <div className="text-sm font-medium text-yellow-800 mb-1">ATA 106 Traceability</div>
                        <div className="text-xs space-y-1">
                          <div><span className="font-medium">Source:</span> {item.inventory.traceability_source}</div>
                          {item.inventory.traceable_to && (
                            <div><span className="font-medium">Traceable to:</span> {item.inventory.traceable_to}</div>
                          )}
                          {item.inventory.last_certified_agency && (
                            <div><span className="font-medium">Last Certified:</span> {item.inventory.last_certified_agency}</div>
                          )}
                          {item.inventory.part_status_certification && (
                            <div><span className="font-medium">Status:</span> {item.inventory.part_status_certification}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${(salesOrder.sub_total || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total NET ({salesOrder.currency || 'USD'}):</span>
              <span>${(salesOrder.total_net || 0).toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {salesOrder.terms_and_conditions && (
              <div>
                <div className="text-slate-500 text-sm">Terms & Conditions</div>
                <div>{salesOrder.terms_and_conditions.title} v{salesOrder.terms_and_conditions.version}</div>
              </div>
            )}
            {salesOrder.remarks && (
              <div>
                <div className="text-slate-500 text-sm">Remarks</div>
                <div className="whitespace-pre-line">{salesOrder.remarks}</div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-slate-500">Created</div>
                <div>{salesOrder.created_at ? format(new Date(salesOrder.created_at), 'PPP') : 'N/A'}</div>
              </div>
              <div>
                <div className="text-slate-500">Last Updated</div>
                <div>{salesOrder.updated_at ? format(new Date(salesOrder.updated_at), 'PPP') : 'N/A'}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}