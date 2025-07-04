'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Printer } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format } from 'date-fns'
import Image from 'next/image'

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

interface PurchaseOrderPdfClientPageProps {
  poId: string
}

export default function PurchaseOrderPdfClientPage({ poId }: PurchaseOrderPdfClientPageProps) {
  const router = useRouter()
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrderDetails | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchPurchaseOrder = useCallback(async (id: string) => {
    try {
      // First fetch the purchase order with basic company info
      const { data: poData, error: poError } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          my_companies(*),
          companies(*),
          company_ship_via!ship_via_id(*),
          po_items(
            *,
            pn_master_table(pn, description)
          )
        `)
        .eq('po_id', id)
        .single()
      
      if (poError) throw poError

      // Fetch my company addresses and contacts
      const { data: myCompanyAddresses } = await supabase
        .from('company_addresses')
        .select('*')
        .eq('company_id', poData.my_companies.my_company_id)
        .eq('company_ref_type', 'my_companies')

      const { data: myCompanyContacts } = await supabase
        .from('company_contacts')
        .select('*')
        .eq('company_id', poData.my_companies.my_company_id)
        .eq('company_ref_type', 'my_companies')

      // Fetch vendor company addresses and contacts
      const { data: vendorAddresses } = await supabase
        .from('company_addresses')
        .select('*')
        .eq('company_id', poData.companies.company_id)
        .eq('company_ref_type', 'companies')

      const { data: vendorContacts } = await supabase
        .from('company_contacts')
        .select('*')
        .eq('company_id', poData.companies.company_id)
        .eq('company_ref_type', 'companies')

      // Combine the data
      const enrichedData = {
        ...poData,
        my_companies: {
          ...poData.my_companies,
          company_addresses: myCompanyAddresses || [],
          company_contacts: myCompanyContacts || []
        },
        companies: {
          ...poData.companies,
          company_addresses: vendorAddresses || [],
          company_contacts: vendorContacts || []
        }
      }
      
      setPurchaseOrder(enrichedData)
    } catch (error) {
      console.error('Error fetching purchase order:', error)
      toast.error('Failed to fetch purchase order')
      router.push('/portal/purchase-orders')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (poId) {
      fetchPurchaseOrder(poId)
    }
  }, [fetchPurchaseOrder, poId])

  useEffect(() => {
    // Add PDF print mode class to html element when component mounts
    document.documentElement.classList.add('pdf-print-mode')
    
    // Cleanup function to remove the class when component unmounts
    return () => {
      document.documentElement.classList.remove('pdf-print-mode')
    }
  }, [])

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    // For now, just trigger print dialog
    // In a real implementation, you might generate a PDF blob and download it
    window.print()
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

  const vatAmount = (purchaseOrder.subtotal || 0) * ((purchaseOrder.vat_percentage || 0) / 100)

  return (
    <div className="min-h-screen bg-white">
      {/* Print Controls - Hidden when printing */}
      <div className="no-print bg-slate-50 border-b p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-semibold">Purchase Order PDF - {purchaseOrder.po_number}</h1>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* PDF Content */}
      <div className="max-w-4xl mx-auto p-8 print:p-0 print:max-w-none">
        {/* Header with Logo */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Image
              src="/logo.png"
              alt="TASAVIA"
              width={150}
              height={50}
              className="h-12 w-auto"
            />
          </div>
          <div className="text-right">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">PURCHASE ORDER</h1>
            <div className="text-lg font-semibold text-slate-700">PO# {purchaseOrder.po_number}</div>
            <div className="text-sm text-slate-600">Date: {format(new Date(purchaseOrder.po_date), 'MMMM dd, yyyy')}</div>
          </div>
        </div>

        {/* Company Information */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-bold text-slate-900 mb-3 border-b pb-1">FROM:</h3>
            <div className="space-y-1 text-sm">
              <div className="font-semibold">{purchaseOrder.my_companies.my_company_name}</div>
              <div>{purchaseOrder.my_companies.my_company_code}</div>
              {purchaseOrder.my_companies.company_addresses.length > 0 && (
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
              {purchaseOrder.my_companies.company_contacts.length > 0 && (
                <>
                  {purchaseOrder.my_companies.company_contacts.map((contact, idx) => (
                    <div key={idx}>
                      {contact.phone && <div>Tel: {contact.phone}</div>}
                      {contact.email && <div>Email: {contact.email}</div>}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 mb-3 border-b pb-1">TO:</h3>
            <div className="space-y-1 text-sm">
              <div className="font-semibold">{purchaseOrder.companies.company_name}</div>
              <div>{purchaseOrder.companies.company_code}</div>
              {purchaseOrder.companies.company_addresses.length > 0 && (
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
              {purchaseOrder.companies.company_contacts.length > 0 && (
                <>
                  {purchaseOrder.companies.company_contacts.map((contact, idx) => (
                    <div key={idx}>
                      {contact.phone && <div>Tel: {contact.phone}</div>}
                      {contact.email && <div>Email: {contact.email}</div>}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Ship To Information */}
        {(purchaseOrder.ship_to_company_name || purchaseOrder.ship_to_address_details) && (
          <div className="mb-8">
            <h3 className="font-bold text-slate-900 mb-3 border-b pb-1">SHIP TO / CONSIGNEE:</h3>
            <div className="space-y-1 text-sm">
              {purchaseOrder.ship_to_company_name && (
                <div className="font-semibold">{purchaseOrder.ship_to_company_name}</div>
              )}
              {purchaseOrder.ship_to_address_details && (
                <div className="whitespace-pre-line">{purchaseOrder.ship_to_address_details}</div>
              )}
              {purchaseOrder.ship_to_contact_name && (
                <div>Contact: {purchaseOrder.ship_to_contact_name}</div>
              )}
              {purchaseOrder.ship_to_contact_phone && (
                <div>Tel: {purchaseOrder.ship_to_contact_phone}</div>
              )}
              {purchaseOrder.ship_to_contact_email && (
                <div>Email: {purchaseOrder.ship_to_contact_email}</div>
              )}
            </div>
          </div>
        )}

        {/* Additional Details */}
        <div className="grid grid-cols-3 gap-4 mb-8 text-sm">
          <div>
            <span className="font-semibold">Prepared By:</span> {purchaseOrder.prepared_by_name || 'N/A'}
          </div>
          <div>
            <span className="font-semibold">Currency:</span> {purchaseOrder.currency}
          </div>
          {purchaseOrder.company_ship_via && (
            <div>
              <span className="font-semibold">Ship Via:</span> 
              {purchaseOrder.company_ship_via.predefined_company === 'CUSTOM' && purchaseOrder.company_ship_via.custom_company_name 
                ? purchaseOrder.company_ship_via.custom_company_name 
                : purchaseOrder.company_ship_via.ship_company_name} # {purchaseOrder.company_ship_via.account_no}
              {purchaseOrder.company_ship_via.owner && ` (Owner: ${purchaseOrder.company_ship_via.owner})`}
              {purchaseOrder.company_ship_via.ship_model && ` - ${purchaseOrder.company_ship_via.ship_model}`}
            </div>
          )}
          {purchaseOrder.payment_term && (
            <div>
              <span className="font-semibold">Payment Term:</span> {purchaseOrder.payment_term}
            </div>
          )}
        </div>

        {/* Line Items Table */}
        <div className="mb-8">
          <table className="w-full border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 px-3 py-2 text-left text-sm font-semibold">Line</th>
                <th className="border border-slate-300 px-3 py-2 text-left text-sm font-semibold">Part Number</th>
                <th className="border border-slate-300 px-3 py-2 text-left text-sm font-semibold">Description</th>
                <th className="border border-slate-300 px-3 py-2 text-left text-sm font-semibold">S/N</th>
                <th className="border border-slate-300 px-3 py-2 text-left text-sm font-semibold">Condition</th>
                <th className="border border-slate-300 px-3 py-2 text-right text-sm font-semibold">Qty</th>
                <th className="border border-slate-300 px-3 py-2 text-right text-sm font-semibold">Unit Price</th>
                <th className="border border-slate-300 px-3 py-2 text-right text-sm font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrder.po_items
                .sort((a, b) => a.line_number - b.line_number)
                .map((item) => (
                  <tr key={item.po_item_id}>
                    <td className="border border-slate-300 px-3 py-2 text-sm">{item.line_number}</td>
                    <td className="border border-slate-300 px-3 py-2 text-sm font-mono">
                      {item.pn_master_table?.pn || 'N/A'}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 text-sm">
                      {item.description || item.pn_master_table?.description || 'N/A'}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 text-sm font-mono">
                      {item.sn || '-'}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 text-sm">
                      {item.condition || '-'}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 text-sm text-right">
                      {item.quantity}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 text-sm text-right">
                      ${item.unit_price.toFixed(2)}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 text-sm text-right font-semibold">
                      ${(item.line_total || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Traceability Notice */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          
          <div className="text-sm font-medium text-slate-900">
            All material must be traced to a certificated operator. Any material not traced to an operator must be pre-approved prior to shipment.
          </div>
        </div>

        {/* Cost Summary */}
        <div className="flex justify-end mb-8">
          <div className="w-full max-w-xs sm:max-w-md md:w-80 overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <tbody>
                <tr>
                  <td className="py-1 text-sm">Subtotal:</td>
                  <td className="py-1 text-sm text-right">${(purchaseOrder.subtotal || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="py-1 text-sm">Freight/Forwarding:</td>
                  <td className="py-1 text-sm text-right">${(purchaseOrder.freight_charge || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="py-1 text-sm">Misc Charge:</td>
                  <td className="py-1 text-sm text-right">${(purchaseOrder.misc_charge || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="py-1 text-sm">VAT ({purchaseOrder.vat_percentage || 0}%):</td>
                  <td className="py-1 text-sm text-right">${vatAmount.toFixed(2)}</td>
                </tr>
                <tr className="border-t border-slate-300">
                  <td className="py-2 font-bold">Total NET ({purchaseOrder.currency}):</td>
                  <td className="py-2 font-bold text-right text-lg">${(purchaseOrder.total_amount || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Signature and Confirmation Section */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-bold text-slate-900 mb-4 border-b pb-1">AUTHORIZED SIGNATURE:</h3>
            <div className="border border-slate-300 h-20 mb-2"></div>
            <div className="text-sm text-slate-600">
              <div>Name: _________________________</div>
              <div className="mt-2">Date: _________________________</div>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 mb-4 border-b pb-1">CONFIRMATION:</h3>
            <div className="border border-slate-300 h-20 mb-2"></div>
            <div className="text-sm text-slate-600">
              <div>Confirmed By: ___________________</div>
              <div className="mt-2">Date: _________________________</div>
            </div>
          </div>
        </div>

        {/* Remarks */}
        {purchaseOrder.remarks_1 && (
          <div className="mb-8">
            <h3 className="font-bold text-slate-900 mb-3 border-b pb-1">REMARKS:</h3>
            <div className="text-sm whitespace-pre-line">{purchaseOrder.remarks_1}</div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 mt-12 pt-4 border-t border-slate-200">
          <div>Purchase Order generated on {format(new Date(), 'MMMM dd, yyyy HH:mm')}</div>
          <div className="mt-1">Status: {purchaseOrder.status}</div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          body {
            margin: 0;
            padding: 0;
          }
          
          @page {
            margin: 0.5in;
            size: A4;
          }
          
          .print\\:p-0 {
            padding: 0 !important;
          }
          
          .print\\:max-w-none {
            max-width: none !important;
          }
        }
      `}</style>
    </div>
  )
}