'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Printer } from 'lucide-react'
import { format } from 'date-fns'
import Image from 'next/image'
import { useEffect } from 'react'

interface SalesOrderPDFData {
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
  my_companies: any
  companies: any
  terms_and_conditions: {
    title: string
    version: string | null
    content: string | null
  } | null
  sales_order_items: Array<{
    line_number: number
    unit_price: number
    line_total: number | null
    inventory: {
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

interface SalesOrderPDFClientPageProps {
  salesOrder: SalesOrderPDFData
}

export default function SalesOrderPDFClientPage({ salesOrder }: SalesOrderPDFClientPageProps) {
  const router = useRouter()

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

  return (
    <div className="min-h-screen bg-white">
      {/* Print Controls - Hidden when printing */}
      <div className="no-print bg-slate-50 border-b p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-semibold">Invoice PDF - {salesOrder.invoice_number}</h1>
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
            <h1 className="text-3xl font-bold text-slate-900 mb-2">INVOICE</h1>
            <div className="text-lg font-semibold text-slate-700">{salesOrder.invoice_number}</div>
            <div className="text-sm text-slate-600">Date: {salesOrder.sales_date ? format(new Date(salesOrder.sales_date), 'MMMM dd, yyyy') : 'N/A'}</div>
            {salesOrder.customer_po_number && (
              <div className="text-sm text-slate-600">Customer PO: {salesOrder.customer_po_number}</div>
            )}
          </div>
        </div>

        {/* Company Information */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-bold text-slate-900 mb-3 border-b pb-1">FROM:</h3>
            <div className="space-y-1 text-sm">
              <div className="font-semibold">{salesOrder.my_companies.my_company_name}</div>
              <div>{salesOrder.my_companies.my_company_code}</div>
              {salesOrder.my_companies.company_addresses.length > 0 && (
                <>
                  {salesOrder.my_companies.company_addresses.map((addr: any, idx: number) => (
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
              {salesOrder.my_companies.company_contacts.length > 0 && (
                <>
                  {salesOrder.my_companies.company_contacts.map((contact: any, idx: number) => (
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
            <h3 className="font-bold text-slate-900 mb-3 border-b pb-1">BILL TO:</h3>
            <div className="space-y-1 text-sm">
              <div className="font-semibold">{salesOrder.companies.company_name}</div>
              <div>{salesOrder.companies.company_code}</div>
              {salesOrder.companies.customer_number && (
                <div className="font-medium text-blue-600">Customer #: {salesOrder.companies.customer_number}</div>
              )}
              {salesOrder.companies.company_addresses.length > 0 && (
                <>
                  {salesOrder.companies.company_addresses.map((addr: any, idx: number) => (
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
              {salesOrder.companies.company_contacts.length > 0 && (
                <>
                  {salesOrder.companies.company_contacts.map((contact: any, idx: number) => (
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
        <div className="mb-8">
          <h3 className="font-bold text-slate-900 mb-3 border-b pb-1">SHIP TO:</h3>
          <div className="space-y-1 text-sm">
            <div className="font-semibold">{salesOrder.companies.company_name}</div>
            <div>{salesOrder.companies.company_code}</div>
            {salesOrder.companies.customer_number && (
              <div className="font-medium text-blue-600">Customer #: {salesOrder.companies.customer_number}</div>
            )}
            {salesOrder.companies.company_addresses.length > 0 && (
              <>
                {salesOrder.companies.company_addresses.map((addr: any, idx: number) => (
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
            {salesOrder.companies.company_contacts.length > 0 && (
              <>
                {salesOrder.companies.company_contacts.map((contact: any, idx: number) => (
                  <div key={idx}>
                    {contact.phone && <div>Tel: {contact.phone}</div>}
                    {contact.email && <div>Email: {contact.email}</div>}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Additional Details */}
        <div className="grid grid-cols-3 gap-4 mb-8 text-sm">
          <div>
            <span className="font-semibold">Currency:</span> {salesOrder.currency}
          </div>
          <div>
            <span className="font-semibold">Payment Terms:</span> {salesOrder.payment_terms || 'NET30'}
          </div>
          {salesOrder.tracking_number && (
            <div>
              <span className="font-semibold">Tracking:</span> {salesOrder.tracking_number}
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
              {salesOrder.sales_order_items
                .sort((a, b) => a.line_number - b.line_number)
                .map((item: any) => (
                  <tr key={item.line_number}>
                    <td className="border border-slate-300 px-3 py-2 text-sm">{item.line_number}</td>
                    <td className="border border-slate-300 px-3 py-2 text-sm font-mono">
                      {item.inventory.pn_master_table.pn}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 text-sm">
                      {item.inventory.pn_master_table.description || 'N/A'}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 text-sm font-mono">
                      {item.inventory.serial_number || '-'}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 text-sm">
                      {item.inventory.condition || '-'}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 text-sm text-right">
                      {item.inventory.quantity || 1}
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

        {/* Wire Details Section */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <div className="text-sm font-medium text-slate-900 mb-2">WIRE DETAILS (USD):</div>
          <div className="text-sm space-y-1">
            <div><span className="font-semibold">Account Holder:</span> TASAVIA HAVACILIK TEKNIK SAN. TIC AS</div>
            <div><span className="font-semibold">Bank Name/ Number:</span> KUVEYT TURK KATILIM BANKASI AS</div>
            <div><span className="font-semibold">Branch Code:</span> Levent Tcari / 471</div>
            <div><span className="font-semibold">Account Number:</span> 98093015-101</div>
            <div><span className="font-semibold">Swift Number:</span> KTEFTRISXXX</div>
            <div><span className="font-semibold">IBAN #:</span> TR04 0020 5000 0980 9301 5001 01</div>
            <div><span className="font-semibold">Bank Address:</span> Esentepe Mh Ali Kaya Sk Nef Plaza No:3</div>
            <div>Kat:13 no:30-31 Sisli - Istanbul Turkiye</div>
          </div>
        </div>

        {/* Cost Summary */}
        <div className="flex justify-end mb-8">
          <div className="w-full max-w-xs sm:max-w-md md:w-80 overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <tbody>
                <tr>
                  <td className="py-1 text-sm">Subtotal:</td>
                  <td className="py-1 text-sm text-right">${(salesOrder.sub_total || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="py-1 text-sm">Misc Charge:</td>
                  <td className="py-1 text-sm text-right">$0.00</td>
                </tr>
                <tr className="border-t border-slate-300">
                  <td className="py-2 font-bold">Total NET ({salesOrder.currency}):</td>
                  <td className="py-2 font-bold text-right text-lg">${(salesOrder.total_net || 0).toFixed(2)}</td>
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
            <div className="text-sm text-slate-600">
              <div className="font-medium">YOUR PO NUMBER IS YOUR APPROVAL OF THE TERMS AND CONDITIONS OF THE SALES.</div>
            </div>
          </div>
        </div>

        {/* Remarks */}
        {salesOrder.remarks && (
          <div className="mb-8">
            <h3 className="font-bold text-slate-900 mb-3 border-b pb-1">REMARKS:</h3>
            <div className="text-sm whitespace-pre-line">{salesOrder.remarks}</div>
          </div>
        )}

        {/* Terms and Conditions of Sale */}
        <div className="mb-8">
          <h3 className="font-bold text-slate-900 mb-3 border-b pb-1">TERMS AND CONDITIONS OF SALE:</h3>
          <div className="text-xs leading-tight space-y-2">
            <p>
              These goods are offered by TASAVIA or subsidiaries (Seller) in fulfillment of the referenced contract issued by Buyer. Acceptance
              of this shipment constitutes implied acceptance of the following:
            </p>
            
            <p>
              <strong>Indemnification:</strong> Buyer agrees to indemnify and hold harmless Seller and its employees from and against all claims, liabilities,
              losses, damages, including all legal fees arising from or by reason of the following: Any injury or death allegedly caused by the
              use, sale, transfer or alteration of the goods furnished hereunder; Any damage to or destruction of any property or injury to any
              person(s) caused by any such act or omission, whether negligent or otherwise, of Buyer or any employee, subcontractor, or
              agent employed by Buyer. Such obligations shall survive acceptance of the goods and payment by the Buyer.
            </p>
            
            <div className="text-right text-xs">Page 1/2</div>
            
            <p>
              <strong>Disclaimer:</strong> These goods are sold by TASAVIA or subsidiaries &ldquo;As Is, Where Is&rdquo; without any warranties, guarantees, or
              representations of any kind, either expressed or implied, statutory, or otherwise, that shall survive delivery as to the products
              and the component parts thereof, including (without limitation) the condition or airworthiness thereof, and Buyer hereby waives
              all other warranties or remedies,expressed or implied, arising by law or otherwise, and Seller shall have no liability to Buyer with
              respect to fitness for any intended purposes or merchantability, or loss of use, revenue, or profit, or for incidental or
              consequential damages, or for any expense directly or indirectly arising from this transaction or the use of the goods, either
              separately or in combination with other products or equipment, or from any other cause. The Buyer agrees that any disputes
              arising from this transaction shall be resolved in accordance with the law of the State of Turkiye. In a dispute, the prevailing party
              shall be entitled to collect its costs and reasonable attorney&rsquo;s fees. <strong>Unpaid Balance:</strong> Any outstanding balance which remains
              unpaid for 30 days following the date of billing will be subject to a one and one-half percent (1%) per day service charge. Seller
              retains ownership and title to the material sold until full payment is received and credited even if ATA-106 given.
            </p>
            
            <p>
              <strong>Return of Goods:</strong> Goods sold in &ldquo;AS-IS&rdquo; or &ldquo;As Removed&rdquo; or &ldquo;Serviceable&rdquo; condition cannot be returned if the purchase price is
              $1000.00 USD or less. Request for Return Material Authorization (RMA) of material eligible for return must be submitted in
              writing within 30 days from the original ship date. Issuance of RMA by Seller does not automatically invalidate conditions of
              original sale. No credit or reimbursement of any or all portions of original sale shall be issued or paid prior to evaluation of the
              returned material. All items approved and accepted for return may be subject, at Seller&rsquo;s discretion, to a restocking fee. All
              original documentation provided at time of sale shall be required to be returned with rejected material within 60 days from
              original ship date. In all instances, goods returned without original documentation shall be rejected and the terms of the original
              sale enforced. In the event &ldquo;serviceable&rdquo; material is returned due to failure, objective evidence of the fault found (from a
              certificated agency) shall be required. Seller may exercise the right of verification of the fault at a certificated agency of its choice.
              If disposition is determined to be &ldquo;no fault found&rdquo;, Buyer may be liable for, at Seller&rsquo;s discretion, evaluation fees and/or shipping
              charges incurred. Goods sold in &ldquo;Overhauled&rdquo; condition will be honored by TASAVIA or subsidiaries warranty policy. Any unit
              opened for ANY reason will void the warranty and can not be returned for credit. This includes any modifications or conversions
              incorporated after the sale.
            </p>
            
            <p>
              These items are controlled by the U.S. Government and authorized for export only to the country of ultimate destination for use
              by the ultimate consignee or end-user(s) herein identified. They may not be resold, transferred, or otherwise disposed of, to any
              other country or to any person other than the authorized ultimate consignee or end-user(s), either in their original form or after
              being incorporated into other items, without first obtaining approval from the U.S. government or as otherwise authorized by
              U.S. law and regulations.
            </p>
            
            <p>
              <strong>Export Control Terms and Conditions</strong><br/>
              It is the policy of TASAVIA or subsidiaries to verify end use and end user in all sales of products and in all transfers of technical
              data or software to ensure compliance with applicable U.S. Export Control laws and regulations. Because the parts and/or
              technology you are purchasing may possibly be exported and used outside the United States, by accepting this material for sale
              you confirm the following:
            </p>
            
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>I (We) will not export or re-export any products, technology or software purchased from TASAVIA or subsidiaries to Russia,
              Cuba, Iran, Iraq, North Korea, Sudan, or Syria, unless otherwise authorized by the U.S. Government;</li>
              <li>I (We) will not sell, transfer, export, or re-export any products, technology or software purchased from TASAVIA or subsidiaries
              for use in activities which involve the development, production, use or stockpiling of Nuclear, Chemical, or Biological weapons or
              missiles, nor use said products, technology or software in any facilities which are engaged in activities related to such weapons;</li>
              <li>I (We) acknowledge that U.S., law prohibits the sale, transfer, export or re-export other participation in any export transaction
              involving products, technology or software with individuals listed in the U.S. Commerce Department's Table of Denial Orders, the
              U.S. Treasury Department's List of Specially Designated Nationals, and/or the U.S. Department of State's list of debarred from
              receiving Munitions List items;</li>
              <li>I (We) will abide by all applicable U.S. Export Control laws and regulations for any products, technology or software purchased
              from TASAVIA or subsidiaries and will obtain any licenses or prior approvals required by the U.S. Government prior to export or re-
              export of products, technology or software</li>
              <li>I (We) agree that export control requirements in the above shall survive the completion, early termination, cancellation, or
              expiration of the applicable Purchase Order, Agreement, and/or Contract.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 mt-12 pt-4 border-t border-slate-200">
          <div>Invoice generated on {format(new Date(), 'MMMM dd, yyyy HH:mm')}</div>
          <div className="mt-1">Invoice Number: {salesOrder.invoice_number}</div>
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
          
          .print\\\\:p-0 {
            padding: 0 !important;
          }
          
          .print\\\\:max-w-none {
            max-width: none !important;
          }
        }
      `}</style>
    </div>
  )
}