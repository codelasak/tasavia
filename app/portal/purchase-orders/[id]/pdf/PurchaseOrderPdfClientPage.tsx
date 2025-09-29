'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Printer } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format } from 'date-fns'
import PDFLayout from '@/components/pdf/PDFLayout'
import PDFHeader from '@/components/pdf/PDFHeader'
import PDFCompanyGrid from '@/components/pdf/PDFCompanyGrid'
import PDFSignatureBlock from '@/components/pdf/PDFSignatureBlock'
import PDFFinancialSummary from '@/components/pdf/PDFFinancialSummary'
import PDFFooter from '@/components/pdf/PDFFooter'

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
  initialPurchaseOrder: PurchaseOrderDetails
}

export default function PurchaseOrderPdfClientPage({ poId, initialPurchaseOrder }: PurchaseOrderPdfClientPageProps) {
  const router = useRouter()
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrderDetails | null>(initialPurchaseOrder)

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

  if (!purchaseOrder) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Purchase order not found</div>
      </div>
    )
  }


  const vatAmount = (purchaseOrder.subtotal || 0) * ((purchaseOrder.vat_percentage || 0) / 100)
  const TBD_DISPLAY = "TBD - To Be Determined"
  const hasShipToInfo = !!(purchaseOrder.ship_to_company_name?.trim() || purchaseOrder.ship_to_address_details?.trim())

  // Prepare company sections for PDFCompanyGrid
  const companySections = [
    {
      title: 'FROM',
      company: {
        company_name: purchaseOrder.my_companies.my_company_name,
        company_code: purchaseOrder.my_companies.my_company_code,
        company_addresses: purchaseOrder.my_companies.company_addresses,
        company_contacts: purchaseOrder.my_companies.company_contacts
      }
    },
    {
      title: 'TO',
      company: {
        company_name: purchaseOrder.companies.company_name,
        company_code: purchaseOrder.companies.company_code,
        company_addresses: purchaseOrder.companies.company_addresses,
        company_contacts: purchaseOrder.companies.company_contacts
      }
    },
    {
      title: 'SHIP TO',
      company: hasShipToInfo ? {
        company_name: purchaseOrder.ship_to_company_name || '',
        company_code: '',
        company_addresses: [{
          address_line1: purchaseOrder.ship_to_address_details || '',
          address_line2: null,
          city: null,
          country: null
        }],
        company_contacts: [{
          contact_name: purchaseOrder.ship_to_contact_name || '',
          phone: purchaseOrder.ship_to_contact_phone,
          email: purchaseOrder.ship_to_contact_email
        }]
      } : {
        company_name: TBD_DISPLAY,
        company_code: '',
        company_addresses: [{
          address_line1: 'Ship to company will be determined',
          address_line2: null,
          city: null,
          country: null
        }],
        company_contacts: [{
          contact_name: 'Contact information will be provided',
          phone: null,
          email: null
        }]
      }
    }
  ]

  return (
    <PDFLayout
      title="Purchase Order PDF"
      documentNumber={purchaseOrder.po_number}
      onDownload={handleDownload}
    >
        <PDFHeader
          documentType="PURCHASE ORDER"
          documentNumber={purchaseOrder.po_number}
          documentDate={purchaseOrder.po_date}
          additionalInfo={[]}
        />

        <PDFCompanyGrid sections={companySections} />

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

        {/* Cost Summary with Traceability */}
        <div className="flex gap-8 mb-8">
          {/* Left Column: Traceability Notice & Authorized Sign */}
          <div className="flex-1 space-y-4">
            {/* Traceability Notice */}
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm font-medium text-slate-900">
              All material must be traced to a certificated operator. Any material not traced to an operator must be pre-approved prior to shipment.
            </div>
            
            <PDFSignatureBlock
              sections={[
                {
                  title: "AUTHORIZED SIGNATURE",
                  fields: [
                    { label: "Authorized Sign", type: "signature-image", height: "large" }
                  ]
                }
              ]}
            />
          </div>
          
          <PDFFinancialSummary
            subtotal={purchaseOrder.subtotal || 0}
            freight_charge={purchaseOrder.freight_charge}
            misc_charge={purchaseOrder.misc_charge}
            vat_percentage={purchaseOrder.vat_percentage}
            vat_amount={vatAmount}
            total_net={purchaseOrder.total_amount || 0}
            currency={purchaseOrder.currency}
          />
        </div>


        {/* Remarks */}
        {purchaseOrder.remarks_1 && (
          <div className="mb-8">
            <h3 className="font-bold text-slate-900 mb-3 border-b pb-1">REMARKS:</h3>
            <div className="text-sm whitespace-pre-line">{purchaseOrder.remarks_1}</div>
          </div>
        )}

        <PDFFooter
          documentType="Purchase Order"
          documentNumber={purchaseOrder.po_number}
          status={purchaseOrder.status}
          additionalInfo={[
            { label: 'Generated', value: format(new Date(), 'MMMM dd, yyyy HH:mm') }
          ]}
        />
    </PDFLayout>
  )
}