'use client'

import PDFLayout from '@/components/pdf/PDFLayout'
import PDFHeader from '@/components/pdf/PDFHeader'
import PDFCompanyGrid, { shouldShowShipTo } from '@/components/pdf/PDFCompanyGrid'
import PDFFooter from '@/components/pdf/PDFFooter'
import PDFSignatureBlock from '@/components/pdf/PDFSignatureBlock'

interface InvoicePDFData {
  sales_order_id: string
  invoice_number: string
  customer_po_number: string | null
  reference_number: string | null
  contract_number: string | null
  country_of_origin: string | null
  end_use_country: string | null
  invoice_date: string | null
  status: string | null
  sub_total: number | null
  freight_charge: number | null
  misc_charge: number | null
  vat_percentage: number | null
  vat_amount: number | null
  total_net: number | null
  currency: string | null
  payment_terms: string | null
  tracking_number: string | null
  remarks: string | null
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
      phone: string | null
      email: string | null
    }>
    company_bank_details?: Array<{
      account_holder_name: string
      bank_name: string
      account_number: string
      swift_code: string | null
      iban: string | null
      bank_address: string | null
      branch_code: string | null
      branch_address: string | null
      is_primary: boolean | null
    }>
  }
  companies: any
  terms_and_conditions: {
    title: string
    version: string | null
    content: string | null
  } | null
  invoice_items: Array<{
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

interface InvoicePDFClientPageProps {
  salesOrder: InvoicePDFData
}

export default function InvoicePDFClientPage({ salesOrder }: InvoicePDFClientPageProps) {
  const handleDownload = () => {
    window.print()
  }

  // Prepare additional header info
  const additionalHeaderInfo = [
    ...(salesOrder.customer_po_number ? [{ label: 'Customer PO', value: salesOrder.customer_po_number }] : []),
    ...(salesOrder.reference_number ? [{ label: 'Reference', value: salesOrder.reference_number }] : []),
    ...(salesOrder.contract_number ? [{ label: 'Contract', value: salesOrder.contract_number }] : [])
  ]

  // Prepare company sections for dynamic grid
  const companySections = [
    {
      title: 'FROM',
      company: salesOrder.my_companies
    },
    {
      title: 'BILL TO', 
      company: salesOrder.companies
    }
  ]

  // Add SHIP TO section if different from BILL TO
  const hasShipTo = shouldShowShipTo(salesOrder.companies, salesOrder.companies, null)
  if (hasShipTo) {
    companySections.push({
      title: 'SHIP TO',
      company: salesOrder.companies // In real scenario, this would be separate ship-to data
    })
  }

  return (
    <PDFLayout 
      title="Invoice PDF" 
      documentNumber={salesOrder.invoice_number}
      onDownload={handleDownload}
    >
      <PDFHeader
        documentType="INVOICE"
        documentNumber={salesOrder.invoice_number}
        documentDate={salesOrder.invoice_date || new Date()}
        additionalInfo={additionalHeaderInfo}
      />

      <PDFCompanyGrid sections={companySections} />

      {/* Additional Details */}
      <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
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

      {/* Export Documentation */}
      {(salesOrder.country_of_origin || salesOrder.end_use_country) && (
        <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded">
          <h3 className="font-bold text-slate-900 mb-3">EXPORT DOCUMENTATION</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {salesOrder.country_of_origin && (
              <div>
                <span className="font-semibold">Country of Origin:</span> {salesOrder.country_of_origin}
              </div>
            )}
            {salesOrder.end_use_country && (
              <div>
                <span className="font-semibold">End Use Country:</span> {salesOrder.end_use_country}
              </div>
            )}
          </div>
          <div className="text-xs text-blue-700 mt-2">
            This information is provided for export control compliance purposes.
          </div>
        </div>
      )}

      {/* Line Items Table */}
      <div className="mb-6">
        <table className="w-full border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 px-2 py-1 text-left text-sm font-semibold w-10">Line</th>
              <th className="border border-slate-300 px-2 py-1 text-left text-sm font-semibold w-24">Part Number</th>
              <th className="border border-slate-300 px-2 py-1 text-left text-sm font-semibold">Description</th>
              <th className="border border-slate-300 px-2 py-1 text-left text-sm font-semibold w-20">S/N</th>
              <th className="border border-slate-300 px-2 py-1 text-left text-sm font-semibold w-16">Condition</th>
              <th className="border border-slate-300 px-2 py-1 text-right text-sm font-semibold w-10">Qty</th>
              <th className="border border-slate-300 px-2 py-1 text-right text-sm font-semibold w-20">Unit Price</th>
              <th className="border border-slate-300 px-2 py-1 text-right text-sm font-semibold w-20">Total</th>
            </tr>
          </thead>
          <tbody>
            {salesOrder.invoice_items
              .sort((a, b) => a.line_number - b.line_number)
              .map((item: any) => (
                <tr key={item.line_number}>
                  <td className="border border-slate-300 px-2 py-1 text-sm">{item.line_number}</td>
                  <td className="border border-slate-300 px-2 py-1 text-xs font-mono">
                    {item.inventory.pn_master_table.pn}
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-xs">
                    {item.inventory.pn_master_table.description || 'N/A'}
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-xs font-mono">
                    {item.inventory.serial_number || '-'}
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-xs">
                    {item.inventory.condition || '-'}
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-sm text-right">
                    {item.inventory.quantity || 1}
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-sm text-right">
                    ${item.unit_price.toFixed(2)}
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-sm text-right font-semibold">
                    ${(item.line_total || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Wire Details Section */}
      {salesOrder.my_companies.company_bank_details && salesOrder.my_companies.company_bank_details.length > 0 && (
        <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <div className="text-sm font-medium text-slate-900 mb-2">WIRE DETAILS ({salesOrder.currency}):</div>
          {salesOrder.my_companies.company_bank_details
            .filter(bank => bank.is_primary)
            .slice(0, 1)
            .map((bank, index) => (
              <div key={index} className="text-sm space-y-1">
                <div><span className="font-semibold">Account Holder:</span> {bank.account_holder_name}</div>
                <div><span className="font-semibold">Bank Name:</span> {bank.bank_name}</div>
                {bank.branch_code && (
                  <div><span className="font-semibold">Branch Code:</span> {bank.branch_code}</div>
                )}
                <div><span className="font-semibold">Account Number:</span> {bank.account_number}</div>
                {bank.swift_code && (
                  <div><span className="font-semibold">Swift Code:</span> {bank.swift_code}</div>
                )}
                {bank.iban && (
                  <div><span className="font-semibold">IBAN:</span> {bank.iban}</div>
                )}
                {bank.bank_address && (
                  <div><span className="font-semibold">Bank Address:</span> {bank.bank_address}</div>
                )}
                {bank.branch_address && (
                  <div>{bank.branch_address}</div>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Cost Summary */}
      <div className="flex justify-end mb-6">
        <div className="w-full max-w-xs sm:max-w-md md:w-80 overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <tbody>
              <tr>
                <td className="py-1 text-xs">Subtotal:</td>
                <td className="py-1 text-xs text-right">${(salesOrder.sub_total || 0).toFixed(2)}</td>
              </tr>
              {(salesOrder.freight_charge && salesOrder.freight_charge > 0) && (
                <tr>
                  <td className="py-1 text-xs">Freight Charge:</td>
                  <td className="py-1 text-xs text-right">${salesOrder.freight_charge.toFixed(2)}</td>
                </tr>
              )}
              {(salesOrder.misc_charge && salesOrder.misc_charge > 0) && (
                <tr>
                  <td className="py-1 text-xs">Misc Charge:</td>
                  <td className="py-1 text-xs text-right">${salesOrder.misc_charge.toFixed(2)}</td>
                </tr>
              )}
              {(salesOrder.vat_amount && salesOrder.vat_amount > 0) && (
                <tr>
                  <td className="py-1 text-xs">VAT ({salesOrder.vat_percentage || 0}%):</td>
                  <td className="py-1 text-xs text-right">${salesOrder.vat_amount.toFixed(2)}</td>
                </tr>
              )}
              <tr className="border-t border-slate-300">
                <td className="py-1 font-bold text-sm">Total NET ({salesOrder.currency}):</td>
                <td className="py-1 font-bold text-right text-base">${(salesOrder.total_net || 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <PDFSignatureBlock 
        sections={[
          {
            title: "AUTHORIZED SIGNATURE",
            titleClassName: "border-b pb-1",
            fields: [
              { label: "Signature", type: "signature", height: "large" },
              { label: "Name", type: "text" },
              { label: "Date", type: "date" }
            ]
          },
          {
            title: "CONFIRMATION",
            titleClassName: "border-b pb-1",
            fields: [
              { label: "Terms Acceptance", value: "YOUR PO NUMBER IS YOUR APPROVAL OF THE TERMS AND CONDITIONS OF THIS INVOICE.", type: "text" }
            ]
          }
        ]}
        columns={2}
        className="mb-6"
      />

      {/* Remarks */}
      {salesOrder.remarks && (
        <div className="mb-6">
          <h3 className="font-bold text-slate-900 mb-3 border-b pb-1">REMARKS:</h3>
          <div className="text-sm whitespace-pre-line">{salesOrder.remarks}</div>
        </div>
      )}

      {/* Terms and Conditions of Sale */}
      <div className="mb-6">
        <h3 className="font-bold text-slate-900 mb-3 border-b pb-1">TERMS AND CONDITIONS OF INVOICE:</h3>
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
            involving products, technology or software with individuals listed in the U.S. Commerce Department&apos;s Table of Denial Orders, the
            U.S. Treasury Department&apos;s List of Specially Designated Nationals, and/or the U.S. Department of State&apos;s list of debarred from
            receiving Munitions List items;</li>
            <li>I (We) will abide by all applicable U.S. Export Control laws and regulations for any products, technology or software purchased
            from TASAVIA or subsidiaries and will obtain any licenses or prior approvals required by the U.S. Government prior to export or re-
            export of products, technology or software</li>
            <li>I (We) agree that export control requirements in the above shall survive the completion, early termination, cancellation, or
            expiration of the applicable Purchase Order, Agreement, and/or Contract.</li>
          </ul>
        </div>
      </div>

      <PDFFooter
        documentType="Invoice"
        documentNumber={salesOrder.invoice_number}
      />
    </PDFLayout>
  )
}