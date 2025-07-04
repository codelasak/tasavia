'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Printer } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface ATA106Data {
  sales_order_id: string
  invoice_number: string
  sales_date: string
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

interface ATA106PageProps {
  params: {
    id: string
  }
}

export default function ATA106Page({ params }: ATA106PageProps) {
  const router = useRouter()
  const [salesOrder, setSalesOrder] = useState<ATA106Data | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSalesOrder()
  }, [params.id])

  const fetchSalesOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('sales_orders')
        .select(`
          *,
          my_companies(*),
          companies(*),
          sales_order_items(
            *,
            inventory(
              *,
              pn_master_table(pn, description)
            )
          )
        `)
        .eq('sales_order_id', params.id)
        .single()

      if (error) throw error
      setSalesOrder(data as any)
    } catch (error) {
      console.error('Error fetching sales order:', error)
      toast.error('Failed to fetch sales order')
      router.push('/portal/sales-orders')
    } finally {
      setLoading(false)
    }
  }

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
    
    return parts.join(', ')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading ATA 106 form...</div>
      </div>
    )
  }

  if (!salesOrder) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Sales order not found</div>
      </div>
    )
  }

  // Filter items that have traceability information
  const traceableItems = salesOrder.sales_order_items.filter(item => 
    item.inventory.traceability_source || 
    item.inventory.traceable_to || 
    item.inventory.last_certified_agency
  )

  if (traceableItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="print:hidden mb-6">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="text-center text-slate-500">
          <div className="text-lg">No ATA 106 Traceability Required</div>
          <div className="mt-2">This sales order contains no items with traceability information.</div>
        </div>
      </div>
    )
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

      {/* ATA 106 Form */}
      <div className="max-w-4xl mx-auto bg-white p-8 shadow-lg print:shadow-none print:p-0">
        {/* Header */}
        <div className="text-center mb-8 border-b-2 border-slate-300 pb-4">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            AIRCRAFT PARTS TRACEABILITY FORM
          </h1>
          <div className="text-lg font-semibold text-slate-700">ATA 106 - FORM 1</div>
          <div className="text-sm text-slate-600 mt-2">
            In accordance with ATA Specification 106 for Aircraft Parts Traceability
          </div>
        </div>

        {/* Document Information */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="border border-slate-300 p-4">
            <h3 className="font-bold text-slate-900 mb-3 border-b border-slate-200 pb-1">
              DOCUMENT INFORMATION
            </h3>
            <div className="space-y-2 text-sm">
              <div><strong>Form Number:</strong> ATA106-{salesOrder.invoice_number}</div>
              <div><strong>Date Issued:</strong> {format(new Date(salesOrder.sales_date), 'MMMM dd, yyyy')}</div>
              <div><strong>Reference:</strong> Invoice {salesOrder.invoice_number}</div>
            </div>
          </div>

          <div className="border border-slate-300 p-4">
            <h3 className="font-bold text-slate-900 mb-3 border-b border-slate-200 pb-1">
              TRANSFER INFORMATION
            </h3>
            <div className="space-y-2 text-sm">
              <div><strong>Transfer Type:</strong> Sale</div>
              <div><strong>Transfer Date:</strong> {format(new Date(salesOrder.sales_date), 'MMMM dd, yyyy')}</div>
              <div><strong>Number of Items:</strong> {traceableItems.length}</div>
            </div>
          </div>
        </div>

        {/* Companies Information */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="border border-slate-300 p-4">
            <h3 className="font-bold text-slate-900 mb-3 border-b border-slate-200 pb-1">
              TRANSFEROR (FROM)
            </h3>
            <div className="text-sm space-y-1">
              <div className="font-semibold">{salesOrder.my_companies.my_company_name}</div>
              <div>Code: {salesOrder.my_companies.my_company_code}</div>
              <div>{formatAddress(salesOrder.my_companies)}</div>
              {salesOrder.my_companies.phone && <div>Tel: {salesOrder.my_companies.phone}</div>}
              {salesOrder.my_companies.email && <div>Email: {salesOrder.my_companies.email}</div>}
            </div>
          </div>

          <div className="border border-slate-300 p-4">
            <h3 className="font-bold text-slate-900 mb-3 border-b border-slate-200 pb-1">
              TRANSFEREE (TO)
            </h3>
            <div className="text-sm space-y-1">
              <div className="font-semibold">{salesOrder.companies.company_name}</div>
              <div>Code: {salesOrder.companies.company_code}</div>
              <div>{formatAddress(salesOrder.companies)}</div>
            </div>
          </div>
        </div>

        {/* Parts Traceability Table */}
        <div className="mb-8">
          <h3 className="font-bold text-slate-900 mb-4 text-center">
            AIRCRAFT PARTS TRACEABILITY RECORD
          </h3>
          
          <table className="w-full border-collapse border-2 border-slate-400 text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-400 p-2 text-left font-bold">Line</th>
                <th className="border border-slate-400 p-2 text-left font-bold">Part Number</th>
                <th className="border border-slate-400 p-2 text-left font-bold">Serial Number</th>
                <th className="border border-slate-400 p-2 text-left font-bold">Description</th>
                <th className="border border-slate-400 p-2 text-left font-bold">Qty</th>
                <th className="border border-slate-400 p-2 text-left font-bold">Condition</th>
              </tr>
            </thead>
            <tbody>
              {traceableItems.map((item) => (
                <tr key={item.line_number}>
                  <td className="border border-slate-400 p-2">{item.line_number}</td>
                  <td className="border border-slate-400 p-2 font-mono font-bold">
                    {item.inventory.pn_master_table.pn}
                  </td>
                  <td className="border border-slate-400 p-2 font-mono">
                    {item.inventory.serial_number || 'N/A'}
                  </td>
                  <td className="border border-slate-400 p-2">
                    {item.inventory.pn_master_table.description || 'N/A'}
                  </td>
                  <td className="border border-slate-400 p-2 text-center">
                    {item.inventory.quantity}
                  </td>
                  <td className="border border-slate-400 p-2">
                    {item.inventory.condition || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detailed Traceability Information */}
        <div className="mb-8">
          <h3 className="font-bold text-slate-900 mb-4 text-center">
            DETAILED TRACEABILITY INFORMATION
          </h3>
          
          {traceableItems.map((item) => (
            <div key={item.line_number} className="mb-6 border border-slate-300 p-4">
              <div className="font-bold text-slate-900 mb-3 bg-slate-100 p-2 rounded">
                Line {item.line_number}: {item.inventory.pn_master_table.pn}
                {item.inventory.serial_number && ` (S/N: ${item.inventory.serial_number})`}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-semibold text-slate-700 mb-2">Traceability Source:</div>
                  <div className="bg-slate-50 p-2 rounded">
                    {item.inventory.traceability_source || 'Not specified'}
                  </div>
                </div>
                
                <div>
                  <div className="font-semibold text-slate-700 mb-2">Traceable To:</div>
                  <div className="bg-slate-50 p-2 rounded">
                    {item.inventory.traceable_to || 'Not specified'}
                  </div>
                </div>
                
                <div>
                  <div className="font-semibold text-slate-700 mb-2">Last Certified Agency:</div>
                  <div className="bg-slate-50 p-2 rounded">
                    {item.inventory.last_certified_agency || 'Not specified'}
                  </div>
                </div>
                
                <div>
                  <div className="font-semibold text-slate-700 mb-2">Part Status Certification:</div>
                  <div className="bg-slate-50 p-2 rounded">
                    {item.inventory.part_status_certification || 'Not specified'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Certification */}
        <div className="border-2 border-slate-400 p-6 mb-8">
          <h3 className="font-bold text-slate-900 mb-4 text-center">CERTIFICATION</h3>
          <div className="text-sm text-slate-700 mb-6">
            I certify that the traceability information provided above is accurate and complete to the best of my knowledge. 
            The parts listed have been maintained in accordance with applicable aviation regulations and industry standards.
          </div>
          
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="mb-4">
                <div className="font-semibold">Authorized Signature:</div>
                <div className="border-b border-slate-400 h-8 mt-2"></div>
              </div>
              <div>
                <div className="font-semibold">Print Name:</div>
                <div className="border-b border-slate-400 h-8 mt-2"></div>
              </div>
            </div>
            
            <div>
              <div className="mb-4">
                <div className="font-semibold">Title:</div>
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
          <div>This ATA 106 form was generated on {format(new Date(), 'PPP')} by {salesOrder.my_companies.my_company_name}</div>
          <div className="mt-1">Reference: {salesOrder.invoice_number} | Form: ATA106-{salesOrder.invoice_number}</div>
          <div className="mt-1 italic">This form complies with ATA Specification 106 for Aircraft Parts Traceability</div>
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