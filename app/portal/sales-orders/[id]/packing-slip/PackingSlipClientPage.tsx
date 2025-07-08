'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Printer } from 'lucide-react'
import { format } from 'date-fns'

interface PackingSlipData {
  sales_order_id: string
  invoice_number: string
  customer_po_number: string | null
  sales_date: string
  status: string
  tracking_number: string | null
  my_companies: {
    my_company_name: string
    my_company_code: string
    address_line_1: string | null
    address_line_2: string | null
    city: string | null
    state: string | null
    postal_code: string | null
    country: string | null
    phone: string | null
    email: string | null
  }
  companies: {
    company_name: string
    company_code: string
    address_line_1: string | null
    address_line_2: string | null
    city: string | null
    state: string | null
    postal_code: string | null
    country: string | null
  }
  sales_order_items: Array<{
    line_number: number
    inventory: {
      serial_number: string | null
      condition: string | null
      quantity: number
      pn_master_table: {
        pn: string
        description: string | null
      }
    }
  }>
}

interface PackingSlipClientPageProps {
  salesOrder: PackingSlipData
}

export default function PackingSlipClientPage({ salesOrder }: PackingSlipClientPageProps) {
  const router = useRouter()

  const handlePrint = () => {
    window.print()
  }

  const formatAddress = (company: any) => {
    const parts = [
      company.address_line_1,
      company.address_line_2,
      company.city && company.state ? `${company.city}, ${company.state}` : company.city || company.state,
      company.postal_code,
      company.country
    ].filter(Boolean)
    
    return parts.join('\n')
  }

  return (
    <>
      {/* Print Controls - Hidden when printing */}
      <div className="print:hidden mb-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex space-x-2">
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Packing Slip Document */}
      <div className="max-w-4xl mx-auto bg-white p-8 shadow-lg print:shadow-none print:p-0">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">PACKING SLIP</h1>
            <div className="text-slate-600">
              <div className="font-mono font-bold text-lg">PS-{salesOrder.invoice_number}</div>
              <div>Ship Date: {format(new Date(salesOrder.sales_date), 'MMMM dd, yyyy')}</div>
              <div>Invoice: {salesOrder.invoice_number}</div>
              {salesOrder.customer_po_number && (
                <div>Customer PO: {salesOrder.customer_po_number}</div>
              )}
              {salesOrder.tracking_number && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                  <div className="font-semibold text-blue-900">Tracking Number:</div>
                  <div className="font-mono text-blue-800">{salesOrder.tracking_number}</div>
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-900">{salesOrder.my_companies.my_company_name}</div>
            <div className="text-slate-600 whitespace-pre-line">
              {formatAddress(salesOrder.my_companies)}
            </div>
            {salesOrder.my_companies.phone && (
              <div className="text-slate-600">Tel: {salesOrder.my_companies.phone}</div>
            )}
            {salesOrder.my_companies.email && (
              <div className="text-slate-600">Email: {salesOrder.my_companies.email}</div>
            )}
          </div>
        </div>

        {/* Ship To */}
        <div className="mb-8">
          <div className="bg-slate-50 p-4 rounded border-2 border-slate-300">
            <div className="font-semibold text-slate-900 mb-2 text-lg">Ship To:</div>
            <div className="font-bold text-lg">{salesOrder.companies.company_name}</div>
            <div className="text-slate-600">({salesOrder.companies.company_code})</div>
            <div className="text-slate-600 whitespace-pre-line mt-2">
              {formatAddress(salesOrder.companies)}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <h3 className="font-bold text-slate-900 mb-4 text-lg">Items Shipped</h3>
          <table className="w-full border-collapse border-2 border-slate-400">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-400 p-3 text-left font-bold">Line</th>
                <th className="border border-slate-400 p-3 text-left font-bold">Part Number</th>
                <th className="border border-slate-400 p-3 text-left font-bold">Description</th>
                <th className="border border-slate-400 p-3 text-left font-bold">Serial Number</th>
                <th className="border border-slate-400 p-3 text-center font-bold">Qty Shipped</th>
                <th className="border border-slate-400 p-3 text-left font-bold">Condition</th>
              </tr>
            </thead>
            <tbody>
              {salesOrder.sales_order_items
                .sort((a, b) => a.line_number - b.line_number)
                .map((item) => (
                <tr key={item.line_number}>
                  <td className="border border-slate-400 p-3 font-semibold">{item.line_number}</td>
                  <td className="border border-slate-400 p-3 font-mono font-bold text-lg">
                    {item.inventory.pn_master_table.pn}
                  </td>
                  <td className="border border-slate-400 p-3">
                    {item.inventory.pn_master_table.description || 'N/A'}
                  </td>
                  <td className="border border-slate-400 p-3 font-mono font-semibold">
                    {item.inventory.serial_number || 'N/A'}
                  </td>
                  <td className="border border-slate-400 p-3 text-center font-bold text-lg">
                    {item.inventory.quantity}
                  </td>
                  <td className="border border-slate-400 p-3 font-medium">
                    {item.inventory.condition || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="mb-8">
          <div className="bg-slate-50 p-4 rounded border">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-semibold text-slate-900">Total Items Shipped:</div>
                <div className="text-lg font-bold">{salesOrder.sales_order_items.length}</div>
              </div>
              <div>
                <div className="font-semibold text-slate-900">Total Quantity:</div>
                <div className="text-lg font-bold">
                  {salesOrder.sales_order_items.reduce((sum, item) => sum + item.inventory.quantity, 0)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Shipping Instructions */}
        <div className="mb-8">
          <h3 className="font-bold text-slate-900 mb-4">Shipping Instructions</h3>
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
            <div className="text-sm text-yellow-800 space-y-2">
              <div>• Handle with care - Aviation parts require special handling</div>
              <div>• Keep all items in protective packaging until installation</div>
              <div>• Verify part numbers and serial numbers upon receipt</div>
              <div>• Report any discrepancies or damages immediately</div>
              <div>• Maintain chain of custody documentation</div>
            </div>
          </div>
        </div>

        {/* Verification Section */}
        <div className="border-2 border-slate-400 p-6 mb-8">
          <h3 className="font-bold text-slate-900 mb-4 text-center">SHIPMENT VERIFICATION</h3>
          <div className="text-sm text-slate-700 mb-6">
            I certify that the items listed above have been carefully packed and shipped in accordance with the customer's order.
          </div>
          
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="mb-4">
                <div className="font-semibold">Packed by:</div>
                <div className="border-b border-slate-400 h-8 mt-2"></div>
              </div>
              <div className="mb-4">
                <div className="font-semibold">Print Name:</div>
                <div className="border-b border-slate-400 h-8 mt-2"></div>
              </div>
              <div>
                <div className="font-semibold">Date:</div>
                <div className="border-b border-slate-400 h-8 mt-2"></div>
              </div>
            </div>
            
            <div>
              <div className="mb-4">
                <div className="font-semibold">Received by:</div>
                <div className="border-b border-slate-400 h-8 mt-2"></div>
              </div>
              <div className="mb-4">
                <div className="font-semibold">Print Name:</div>
                <div className="border-b border-slate-400 h-8 mt-2"></div>
              </div>
              <div>
                <div className="font-semibold">Date:</div>
                <div className="border-b border-slate-400 h-8 mt-2"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-300 pt-4 text-center text-xs text-slate-500">
          <div>This packing slip was generated on {format(new Date(), 'PPP')} by {salesOrder.my_companies.my_company_name}</div>
          <div className="mt-1">Packing Slip: PS-{salesOrder.invoice_number} | Invoice: {salesOrder.invoice_number}</div>
          <div className="mt-1">For questions about this shipment, please contact us immediately.</div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body { margin: 0; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:p-0 { padding: 0 !important; }
        }
      `}</style>
    </>
  )
}