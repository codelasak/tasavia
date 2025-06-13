'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Printer } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { format } from 'date-fns'
import Image from 'next/image'

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

interface PurchaseOrderPdfClientPageProps {
  poId: string
}

export default function PurchaseOrderPdfClientPage({ poId }: PurchaseOrderPdfClientPageProps) {
  const router = useRouter()
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrderDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Add PDF print mode class to html element when component mounts
    document.documentElement.classList.add('pdf-print-mode')
    
    // Cleanup function to remove the class when component unmounts
    return () => {
      document.documentElement.classList.remove('pdf-print-mode')
    }
  }, [])

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

  const vatAmount = purchaseOrder.subtotal * (purchaseOrder.vat_percentage / 100)

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
              {purchaseOrder.my_companies.phone && <div>Tel: {purchaseOrder.my_companies.phone}</div>}
              {purchaseOrder.my_companies.email && <div>Email: {purchaseOrder.my_companies.email}</div>}
            </div>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 mb-3 border-b pb-1">TO:</h3>
            <div className="space-y-1 text-sm">
              <div className="font-semibold">{purchaseOrder.companies.company_name}</div>
              <div>{purchaseOrder.companies.company_code}</div>
              {purchaseOrder.companies.address && <div>{purchaseOrder.companies.address}</div>}
              {(purchaseOrder.companies.city || purchaseOrder.companies.country) && (
                <div>
                  {purchaseOrder.companies.city}
                  {purchaseOrder.companies.city && purchaseOrder.companies.country && ', '}
                  {purchaseOrder.companies.country}
                </div>
              )}
              {purchaseOrder.companies.phone && <div>Tel: {purchaseOrder.companies.phone}</div>}
              {purchaseOrder.companies.email && <div>Email: {purchaseOrder.companies.email}</div>}
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
          {purchaseOrder.my_ship_via && (
            <div>
              <span className="font-semibold">Ship Via:</span> {purchaseOrder.my_ship_via.ship_company_name} # {purchaseOrder.my_ship_via.account_no}
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
                      ${item.line_total.toFixed(2)}
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
          <div className="w-80">
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="py-1 text-sm">Subtotal:</td>
                  <td className="py-1 text-sm text-right">${purchaseOrder.subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="py-1 text-sm">Freight/Forwarding:</td>
                  <td className="py-1 text-sm text-right">${purchaseOrder.freight_charge.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="py-1 text-sm">Misc Charge:</td>
                  <td className="py-1 text-sm text-right">${purchaseOrder.misc_charge.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="py-1 text-sm">VAT ({purchaseOrder.vat_percentage}%):</td>
                  <td className="py-1 text-sm text-right">${vatAmount.toFixed(2)}</td>
                </tr>
                <tr className="border-t border-slate-300">
                  <td className="py-2 font-bold">Total NET ({purchaseOrder.currency}):</td>
                  <td className="py-2 font-bold text-right text-lg">${purchaseOrder.total_amount.toFixed(2)}</td>
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