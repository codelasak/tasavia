'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit, FileText, Printer, Trash2, RefreshCw } from 'lucide-react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format } from 'date-fns'
import Link from 'next/link'

interface PurchaseOrderDetails {
  po_id: string
  po_number: string
  po_date: string
  status: string
  total_amount: number | null
  subtotal: number | null
  freight_charge: number | null
  misc_charge: number | null
  vat_percentage: number | null
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
    company_addresses: Array<{
      address_line1: string
      address_line2: string | null
      city: string | null
      country: string | null
    }>
    company_contacts: Array<{
      contact_name: string
      email: string | null
      phone: string | null
    }>
  }
  companies: {
    company_name: string
    company_code: string | null
    company_addresses: Array<{
      address_line1: string
      address_line2: string | null
      city: string | null
      country: string | null
    }>
    company_contacts: Array<{
      contact_name: string
      email: string | null
      phone: string | null
    }>
  }
  company_ship_via: {
    ship_company_name: string
    account_no: string
    owner?: string | null
    ship_model?: string | null
    predefined_company?: string | null
    custom_company_name?: string | null
  } | null
  po_items: Array<{
    po_item_id: string
    line_number: number
    description: string | null
    sn: string | null
    quantity: number
    unit_price: number
    condition: string | null
    line_total: number | null
    pn_master_table: {
      pn: string
      description: string | null
    } | null
  }>
}

interface PurchaseOrderViewClientPageProps {
  poId: string
  initialPurchaseOrder: PurchaseOrderDetails
}

export default function PurchaseOrderViewClientPage({ poId, initialPurchaseOrder }: PurchaseOrderViewClientPageProps) {
  const router = useRouter()
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrderDetails | null>(initialPurchaseOrder)
  const [isDeleting, setIsDeleting] = useState(false)



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

  const handleDelete = async () => {
    if (!purchaseOrder) return
    
    if (!confirm(`Are you sure you want to delete purchase order ${purchaseOrder.po_number}? This action cannot be undone.`)) {
      return
    }

    try {
      // First check if there are any references to this PO in inventory
      const { data: inventoryReferences, error: inventoryCheckError } = await supabase
        .from('inventory')
        .select('inventory_id')
        .eq('po_id_original', purchaseOrder.po_id)
        .limit(1)

      if (inventoryCheckError) {
        // Error checking inventory references
        throw new Error('Failed to check purchase order references')
      }

      if (inventoryReferences && inventoryReferences.length > 0) {
        toast.error('Cannot delete purchase order: It is referenced in inventory records')
        return
      }

      // Delete PO items first (due to foreign key constraint)
      const { error: itemsDeleteError } = await supabase
        .from('po_items')
        .delete()
        .eq('po_id', purchaseOrder.po_id)

      if (itemsDeleteError) {
        // Error deleting PO items
        throw itemsDeleteError
      }

      // Then delete the purchase order
      const { error: poDeleteError } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('po_id', purchaseOrder.po_id)

      if (poDeleteError) {
        // Error deleting purchase order
        throw poDeleteError
      }

      toast.success('Purchase order deleted successfully')
      setIsDeleting(false)
      router.push('/portal/purchase-orders')
    } catch (error: unknown) {
      // Error deleting purchase order
      
      // Handle specific error cases with proper type checking
      const errorObj = error as { code?: string; message?: string }
      if (errorObj?.code === '23503') {
        toast.error('Cannot delete purchase order: It is referenced by other records')
      } else if (errorObj?.message?.includes('foreign key')) {
        toast.error('Cannot delete purchase order: It is referenced in other records')
      } else if (errorObj?.message) {
        toast.error(errorObj.message)
      } else {
        toast.error('Failed to delete purchase order')
      }
    }
  }

  if (!purchaseOrder) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Purchase order not found</div>
      </div>
    )
  }


  const vatAmount = (purchaseOrder.subtotal || 0) * ((purchaseOrder.vat_percentage || 0) / 100)
  const hasShipToInfo = !!(purchaseOrder.ship_to_company_name?.trim() || purchaseOrder.ship_to_address_details?.trim())

  return (
    <div>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => router.push('/portal/purchase-orders')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Purchase Order {purchaseOrder.po_number}</h1>
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
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                View PDF
              </Button>
            </Link>
            <Button 
              variant="outline" 
              onClick={handleDelete}
              className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Header Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Purchase Order {purchaseOrder.po_number}</CardTitle>
                <CardDescription>
                  {format(new Date(purchaseOrder.po_date), 'PPP')} • {purchaseOrder.currency}
                </CardDescription>
              </div>
              <Badge className={getStatusBadge(purchaseOrder.status)}>
                {purchaseOrder.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`grid gap-6 ${hasShipToInfo ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">From (My Company)</h4>
                <div className="text-sm text-slate-600 space-y-1">
                  <div className="font-medium">{purchaseOrder.my_companies.my_company_name}</div>
                  <div>{purchaseOrder.my_companies.my_company_code}</div>
                  {purchaseOrder.my_companies?.company_addresses?.length > 0 && (
                    <>
                      {purchaseOrder.my_companies.company_addresses.map((addr, idx) => (
                        <div key={idx}>
                          <div>{addr.address_line1}</div>
                          {addr.address_line2 && <div>{addr.address_line2}</div>}
                          {(addr.city || addr.country) && (
                            <div>
                              {addr.city}
                              {addr.city && addr.country && ', '}
                              {addr.country}
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                  {purchaseOrder.my_companies?.company_contacts?.length > 0 && (
                    <>
                      {purchaseOrder.my_companies.company_contacts.map((contact, idx) => (
                        <div key={idx}>
                          {contact.phone && <div>📞 {contact.phone}</div>}
                          {contact.email && <div>✉️ {contact.email}</div>}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 mb-2">To (Vendor)</h4>
                <div className="text-sm text-slate-600 space-y-1">
                  <div className="font-medium">{purchaseOrder.companies.company_name}</div>
                  <div>{purchaseOrder.companies.company_code}</div>
                  {purchaseOrder.companies?.company_addresses?.length > 0 && (
                    <>
                      {purchaseOrder.companies.company_addresses.map((addr, idx) => (
                        <div key={idx}>
                          <div>{addr.address_line1}</div>
                          {addr.address_line2 && <div>{addr.address_line2}</div>}
                          {(addr.city || addr.country) && (
                            <div>
                              {addr.city}
                              {addr.city && addr.country && ', '}
                              {addr.country}
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                  {purchaseOrder.companies?.company_contacts?.length > 0 && (
                    <>
                      {purchaseOrder.companies.company_contacts.map((contact, idx) => (
                        <div key={idx}>
                          {contact.phone && <div>📞 {contact.phone}</div>}
                          {contact.email && <div>✉️ {contact.email}</div>}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Ship To Information - Integrated */}
              {hasShipToInfo && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Ship To / Consignee</h4>
                  <div className="text-sm text-slate-600 space-y-1">
                    {purchaseOrder.ship_to_company_name?.trim() && (
                      <div className="font-medium">{purchaseOrder.ship_to_company_name}</div>
                    )}
                    {purchaseOrder.ship_to_address_details?.trim() && (
                      <div className="whitespace-pre-line">{purchaseOrder.ship_to_address_details}</div>
                    )}
                    {purchaseOrder.ship_to_contact_name?.trim() && (
                      <div>Contact: {purchaseOrder.ship_to_contact_name}</div>
                    )}
                    {purchaseOrder.ship_to_contact_phone?.trim() && (
                      <div>📞 {purchaseOrder.ship_to_contact_phone}</div>
                    )}
                    {purchaseOrder.ship_to_contact_email?.trim() && (
                      <div>✉️ {purchaseOrder.ship_to_contact_email}</div>
                    )}
                  </div>
                </div>
              )}
          </div>
        </CardContent>
      </Card>


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
            {purchaseOrder.company_ship_via && (
              <div>
                <div className="text-slate-500">Ship Via</div>
                <div className="font-medium">
                  <div>
                    {purchaseOrder.company_ship_via.predefined_company === 'CUSTOM' && purchaseOrder.company_ship_via.custom_company_name 
                      ? purchaseOrder.company_ship_via.custom_company_name 
                      : purchaseOrder.company_ship_via.ship_company_name}
                  </div>
                  <div className="text-sm text-slate-600">
                    Account: {purchaseOrder.company_ship_via.account_no}
                    {purchaseOrder.company_ship_via.owner && ` • Owner: ${purchaseOrder.company_ship_via.owner}`}
                    {purchaseOrder.company_ship_via.ship_model && ` • ${purchaseOrder.company_ship_via.ship_model}`}
                  </div>
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
                      <div className="text-slate-500">Quantity</div>
                      <div className="font-semibold">{item.quantity}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Unit Price</div>
                      <div className="font-semibold">${item.unit_price.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Line Total</div>
                      <div className="font-bold text-green-600">${(item.line_total || 0).toFixed(2)}</div>
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Cost Summary with Traceability */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-8">
            {/* Left Column: Traceability Notice & Authorized Sign */}
            <div className="flex-1 space-y-4">
              {/* Traceability Notice */}
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm font-medium text-slate-900">
                All material must be traced to a certificated operator. Any material not traced to an operator must be pre-approved prior to shipment.
              </div>
              
              {/* Authorized Signature Box */}
              <div>
                <div className="text-sm font-semibold text-slate-900 mb-2">Authorized Sign:</div>
                <div className="border border-slate-300 rounded h-20 bg-gray-50 flex items-center justify-center">
                  <Image 
                    src="/signature.png" 
                    alt="Signature" 
                    width={150}
                    height={75}
                    className="max-h-12 max-w-full object-contain opacity-80"
                  />
                </div>
              </div>
            </div>
            
            {/* Right Column: Cost Summary */}
            <div className="w-80">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${(purchaseOrder.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Freight/Forwarding:</span>
                  <span>${(purchaseOrder.freight_charge || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Misc Charge:</span>
                  <span>${(purchaseOrder.misc_charge || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT ({purchaseOrder.vat_percentage || 0}%):</span>
                  <span>${((purchaseOrder.subtotal || 0) * ((purchaseOrder.vat_percentage || 0) / 100)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total NET ({purchaseOrder.currency}):</span>
                  <span>${(purchaseOrder.total_amount || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  </div>
);
}