'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit, FileText, Printer } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { format } from 'date-fns'
import Link from 'next/link'

interface PurchaseOrderDetails {
  po_id: string
  po_number: string
  po_date: string
  status: string
  total_amount: number
  subtotal: number
  freight_charge: number
  misc_charge: number
  vat_percentage: number
  currency: string
  ship_to_company_name: string | null
  ship_to_address_details: string | null
  ship_to_contact_name: string | null
  ship_to_contact_phone: string | null
  ship_to_contact_email: string | null
  prepared_by_name: string | null
  payment_term: string | null
  remarks_1: string | null
  my_companies: {
    my_company_name: string
    my_company_code: string
    my_company_address: string | null
    city: string | null
    country: string | null
    phone: string | null
    email: string | null
  }
  companies: {
    company_name: string
    company_code: string
    address: string | null
    city: string | null
    country: string | null
    phone: string | null
    email: string | null
  }
  my_ship_via: {
    ship_company_name: string
    account_no: string
  } | null
  po_items: Array<{
    po_item_id: string
    line_number: number
    description: string | null
    sn: string | null
    quantity: number
    unit_price: number
    condition: string | null
    line_total: number
    pn_master_table: {
      pn: string
      description: string | null
    } | null
  }>
}

interface PurchaseOrderViewClientPageProps {
  poId: string
}

export default function PurchaseOrderViewClientPage({ poId }: PurchaseOrderViewClientPageProps) {
  const router = useRouter()
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrderDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (poId) {
      fetchPurchaseOrder(poId)
    }
  }, [poId])

  const fetchPurchaseOrder = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          my_companies(my_company_name, my_company_code, my_company_address, city, country, phone, email),
          companies(company_name, company_code, address, city, country, phone, email),
          my_ship_via(ship_company_name, account_no),
          po_items(
            *,
            pn_master_table(pn, description)
          )
        `)
        .eq('po_id', id)
        .single()

      if (error) throw error
      setPurchaseOrder(data)
    } catch (error) {
      console.error('Error fetching purchase order:', error)
      toast.error('Failed to fetch purchase order')
      router.push('/portal/purchase-orders')
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
        <div className="text-slate-500">Loading purchase order...</div>
      </div>
    )
  }

  if (!purchaseOrder) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Purchase order not found</div>
      </div>
    )
  }

  const vatAmount = purchaseOrder.subtotal * (purchaseOrder.vat_percentage / 100)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Purchase Order {purchaseOrder.po_number}</h1>
            <p className="text-slate-600">View purchase order details</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Link href={`/portal/purchase-orders/${purchaseOrder.po_id}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Link href={`/portal/purchase-orders/${purchaseOrder.po_id}/pdf`}>
            <Button>
              <FileText className="h-4 w-4 mr-2" />
              View PDF
            </Button>
          </Link>
        </div>
      </div>

      {/* Header Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Purchase Order {purchaseOrder.po_number}</CardTitle>
              <CardDescription>
                Created on {format(new Date(purchaseOrder.po_date), 'MMMM dd, yyyy')}
              </CardDescription>
            </div>
            <Badge className={getStatusBadge(purchaseOrder.status)}>
              {purchaseOrder.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">From (My Company)</h4>
              <div className="text-sm text-slate-600 space-y-1">
                <div className="font-medium">{purchaseOrder.my_companies.my_company_name}</div>
                <div>{purchaseOrder.my_companies.my_company_code}</div>
                {purchaseOrder.my_companies.my_company_address && (
                  <div>{purchaseOrder.my_companies.my_company_address}</div>
                )}
                {(purchaseOrder.my_companies.city || purchaseOrder.my_companies.country) && (
                  <div>
                    {purchaseOrder.my_companies.city}
                    {purchaseOrder.my_companies.city && purchaseOrder.my_companies.country && ', '}
                    {purchaseOrder.my_companies.country}
                  </div>
                )}
                {purchaseOrder.my_companies.phone && <div>📞 {purchaseOrder.my_companies.phone}</div>}
                {purchaseOrder.my_companies.email && <div>✉️ {purchaseOrder.my_companies.email}</div>}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-2">To (Vendor)</h4>
              <div className="text-sm text-slate-600 space-y-1">
                <div className="font-medium">{purchaseOrder.companies.company_name}</div>
                <div>{purchaseOrder.companies.company_code}</div>
                {purchaseOrder.companies.address && <div>{purchaseOrder.companies.address}</div>}
                {(purchaseOrder.companies.city || purchaseOrder.companies.country) && (
                  <div>
                    {purchaseOrder.companies.city}
                    {purchaseOrder.companies.city && purchaseOrder.companies.country && ', '}
                    {purchaseOrder.companies.country}
                  </div>
                )}
                {purchaseOrder.companies.phone && <div>📞 {purchaseOrder.companies.phone}</div>}
                {purchaseOrder.companies.email && <div>✉️ {purchaseOrder.companies.email}</div>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ship To Information */}
      {(purchaseOrder.ship_to_company_name || purchaseOrder.ship_to_address_details) && (
        <Card>
          <CardHeader>
            <CardTitle>Ship To / Consignee</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-600 space-y-1">
              {purchaseOrder.ship_to_company_name && (
                <div className="font-medium">{purchaseOrder.ship_to_company_name}</div>
              )}
              {purchaseOrder.ship_to_address_details && (
                <div className="whitespace-pre-line">{purchaseOrder.ship_to_address_details}</div>
              )}
              {purchaseOrder.ship_to_contact_name && (
                <div>Contact: {purchaseOrder.ship_to_contact_name}</div>
              )}
              {purchaseOrder.ship_to_contact_phone && (
                <div>📞 {purchaseOrder.ship_to_contact_phone}</div>
              )}
              {purchaseOrder.ship_to_contact_email && (
                <div>✉️ {purchaseOrder.ship_to_contact_email}</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Details */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-slate-500">Prepared By</div>
              <div className="font-medium">{purchaseOrder.prepared_by_name || 'N/A'}</div>
            </div>
            <div>
              <div className="text-slate-500">Currency</div>
              <div className="font-medium">{purchaseOrder.currency}</div>
            </div>
            {purchaseOrder.my_ship_via && (
              <div>
                <div className="text-slate-500">Ship Via</div>
                <div className="font-medium">
                  {purchaseOrder.my_ship_via.ship_company_name} # {purchaseOrder.my_ship_via.account_no}
                </div>
              </div>
            )}
            {purchaseOrder.payment_term && (
              <div>
                <div className="text-slate-500">Payment Term</div>
                <div className="font-medium">{purchaseOrder.payment_term}</div>
              </div>
            )}
          </div>
          {purchaseOrder.remarks_1 && (
            <div className="mt-4">
              <div className="text-slate-500 text-sm">Remarks</div>
              <div className="text-sm mt-1 whitespace-pre-line">{purchaseOrder.remarks_1}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
          <CardDescription>{purchaseOrder.po_items.length} items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {purchaseOrder.po_items
              .sort((a, b) => a.line_number - b.line_number)
              .map((item) => (
                <Card key={item.po_item_id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">Line {item.line_number}</div>
                    {item.condition && (
                      <Badge variant="outline">{item.condition}</Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      {item.pn_master_table && (
                        <div>
                          <div className="text-slate-500">Part Number</div>
                          <div className="font-mono font-semibold">{item.pn_master_table.pn}</div>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-slate-500">Description</div>
                      <div>{item.description || item.pn_master_table?.description || 'N/A'}</div>
                    </div>
                    {item.sn && (
                      <div>
                        <div className="text-slate-500">Serial Number</div>
                        <div className="font-mono">{item.sn}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-slate-500">Quantity</div>
                      <div className="font-semibold">{item.quantity}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Unit Price</div>
                      <div className="font-semibold">${item.unit_price.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Line Total</div>
                      <div className="font-bold text-green-600">${item.line_total.toFixed(2)}</div>
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Cost Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${purchaseOrder.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Freight/Forwarding:</span>
              <span>${purchaseOrder.freight_charge.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Misc Charge:</span>
              <span>${purchaseOrder.misc_charge.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>VAT ({purchaseOrder.vat_percentage}%):</span>
              <span>${vatAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total NET ({purchaseOrder.currency}):</span>
              <span>${purchaseOrder.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}