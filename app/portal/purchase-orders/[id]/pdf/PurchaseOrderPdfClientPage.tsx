'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import PDFLayout from '@/components/pdf/PDFLayout'
import Image from 'next/image'
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
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrderDetails | null>(initialPurchaseOrder)

  useEffect(() => {
    // Add PDF print mode class to html element when component mounts
    document.documentElement.classList.add('pdf-print-mode')
    
    // Cleanup function to remove the class when component unmounts
    return () => {
      document.documentElement.classList.remove('pdf-print-mode')
    }
  }, [])

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

  return (
    <PDFLayout
      title="Purchase Order PDF"
      documentNumber={purchaseOrder.po_number}
      onDownload={handleDownload}
    >
        {/* Top Header Section */}
        <div className="flex items-start justify-between mb-6">
          {/* Left: Logo with FROM company info (no title) */}
          <div className="text-left flex flex-col items-start">
            <Image
              src="/tasavia-logo-black.png"
              alt="TASAVIA"
              width={220}
              height={80}
              className="h-16 w-auto"
            />
            <div className="mt-2 text-sm text-slate-700">
              <div className="font-bold">{purchaseOrder.my_companies.my_company_name}</div>
              {/* Addresses */}
              {purchaseOrder.my_companies.company_addresses?.map((addr, idx) => (
                <div key={idx} className="text-left">
                  <div>{addr.address_line1}</div>
                  {addr.address_line2 && <div>{addr.address_line2}</div>}
                  {(addr.city || addr.country) && (
                    <div>
                      {[addr.city].filter(Boolean).join(', ')}
                      {addr.city && addr.country ? ', ' : ''}
                      {addr.country}
                    </div>
                  )}
                </div>
              ))}
              {/* Contacts */}
              {purchaseOrder.my_companies.company_contacts?.map((c, idx) => (
                <div key={idx}>
                  {c.phone && <div>Tel: {c.phone}</div>}
                  {c.email && <div>Email: {c.email}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Document title and meta */}
          <div className="text-right">
            <div className="text-3xl font-bold text-slate-900">PURCHASE ORDER</div>
            <div className="text-lg font-semibold text-slate-800 mt-1">No: {purchaseOrder.po_number}</div>
            <div className="text-sm text-slate-600 mt-1">Date: {format(new Date(purchaseOrder.po_date), 'MMMM dd, yyyy')}</div>
            <div className="text-sm text-slate-600">Prepared By: {purchaseOrder.prepared_by_name || 'N/A'}</div>
          </div>
        </div>

        {/* Center Section: align TO and SHIP TO to right */}
        <div className="mb-6">
          <div className="w-full">
            <div className="grid grid-cols-2 gap-6">
              {/* TO (left column) */}
              <div>
                <h3 className="font-bold text-slate-900 mb-2 border-b pb-1">TO:</h3>
                <div className="space-y-1 text-sm">
                  <div className="font-bold">{purchaseOrder.companies.company_name}</div>
                  {purchaseOrder.companies.company_addresses?.map((addr, idx) => (
                    <div key={idx}>
                      <div>{addr.address_line1}</div>
                      {addr.address_line2 && <div>{addr.address_line2}</div>}
                      {(addr.city || addr.country) && (
                        <div>
                          {[addr.city].filter(Boolean).join(', ')}
                          {addr.city && addr.country ? ', ' : ''}
                          {addr.country}
                        </div>
                      )}
                    </div>
                  ))}
                  {purchaseOrder.companies.company_contacts?.map((c, idx) => (
                    <div key={idx}>
                      {c.phone && <div>Tel: {c.phone}</div>}
                      {c.email && <div>Email: {c.email}</div>}
                    </div>
                  ))}
                </div>
              </div>
              {/* SHIP TO (right column) */}
              <div>
                <h3 className="font-bold text-slate-900 mb-2 border-b pb-1">SHIP TO:</h3>
                <div className="space-y-1 text-sm">
                  <div className="font-bold">{purchaseOrder.ship_to_company_name || 'TBD - To Be Determined'}</div>
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
            </div>
          </div>
        </div>

        {/* Payment + Ship Via (one row) */}
        <div className="grid grid-cols-2 gap-6 mb-8 text-sm">
          <div>
            <span className="font-semibold">Payment Term:</span> {purchaseOrder.payment_term || 'N/A'}
          </div>
          <div>
            {purchaseOrder.company_ship_via && (
              <div>
                <span className="font-semibold">Ship Via:</span>{' '}
                {purchaseOrder.company_ship_via.predefined_company === 'CUSTOM' && purchaseOrder.company_ship_via.custom_company_name
                  ? purchaseOrder.company_ship_via.custom_company_name
                  : purchaseOrder.company_ship_via.ship_company_name}
                {' '}# {purchaseOrder.company_ship_via.account_no}
                {purchaseOrder.company_ship_via.owner && ` (Owner: ${purchaseOrder.company_ship_via.owner})`}
                {purchaseOrder.company_ship_via.ship_model && ` - ${purchaseOrder.company_ship_via.ship_model}`}
              </div>
            )}
          </div>
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
