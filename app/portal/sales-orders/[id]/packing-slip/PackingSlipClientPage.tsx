'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Printer } from 'lucide-react'
import { format } from 'date-fns'
import PDFLayout from '@/components/pdf/PDFLayout'
import PDFHeader from '@/components/pdf/PDFHeader'
import PDFCompanyGrid from '@/components/pdf/PDFCompanyGrid'
import PDFFooter from '@/components/pdf/PDFFooter'
import PDFFinancialSummary from '@/components/pdf/PDFFinancialSummary'
import PDFSignatureBlock from '@/components/pdf/PDFSignatureBlock'

interface PackingSlipData {
  sales_order_id: string
  invoice_number: string
  customer_po_number: string | null
  reference_number: string | null
  contract_number: string | null
  country_of_origin: string | null
  end_use_country: string | null
  sales_date: string | null
  status: string | null
  tracking_number: string | null
  freighter_awb_number: string | null
  package_dimensions: string | null
  package_weight: string | null
  sub_total: number | null
  freight_charge: number | null
  misc_charge: number | null
  vat_percentage: number | null
  vat_amount: number | null
  total_net: number | null
  currency: string | null
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
    company_code: string | null
    address_line_1: string | null
    address_line_2: string | null
    city: string | null
    state: string | null
    postal_code: string | null
    country: string | null
  }
  sales_order_items: Array<{
    line_number: number
    unit_price: number
    line_total: number | null
    inventory: {
      serial_number: string | null
      condition: string | null
      quantity: number | null
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
    <PDFLayout
      title="Packing Slip PDF"
      documentNumber={`PS-${salesOrder.invoice_number}`}
      onDownload={handlePrint}
    >
        <PDFHeader
          documentType="PACKING SLIP"
          documentNumber={`PS-${salesOrder.invoice_number}`}
          documentDate={salesOrder.sales_date || new Date()}
          additionalInfo={[
            { label: 'Ship Date', value: salesOrder.sales_date ? format(new Date(salesOrder.sales_date), 'MMMM dd, yyyy') : 'N/A' },
            { label: 'Invoice', value: salesOrder.invoice_number },
            ...(salesOrder.customer_po_number ? [{ label: 'Customer PO', value: salesOrder.customer_po_number }] : []),
            ...(salesOrder.reference_number ? [{ label: 'Reference', value: salesOrder.reference_number }] : []),
            ...(salesOrder.contract_number ? [{ label: 'Contract', value: salesOrder.contract_number }] : [])
          ]}
        />

        {/* Company Grid with unified layout */}
        <PDFCompanyGrid sections={[
          {
            title: 'FROM',
            company: {
              company_name: salesOrder.my_companies.my_company_name,
              company_code: '',
              company_addresses: [{
                address_line1: formatAddress(salesOrder.my_companies),
                address_line2: null,
                city: null,
                country: null
              }],
              company_contacts: [{
                contact_name: '',
                phone: salesOrder.my_companies.phone,
                email: salesOrder.my_companies.email
              }]
            }
          },
          {
            title: 'SHIP TO',
            company: {
              company_name: salesOrder.companies.company_name,
              company_code: salesOrder.companies.company_code,
              company_addresses: [{
                address_line1: formatAddress(salesOrder.companies),
                address_line2: null,
                city: null,
                country: null
              }],
              company_contacts: []
            }
          }
        ]} />

        {/* Shipping Details Section */}
        <div className="mb-6">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded">
            <h3 className="font-bold text-blue-900 mb-3">SHIPPING DETAILS</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {salesOrder.tracking_number && (
                <div>
                  <span className="font-semibold text-blue-900">FEDEX TRACKING NO:</span>
                  <div className="font-mono text-blue-800 text-lg font-bold">{salesOrder.tracking_number}</div>
                </div>
              )}
              {salesOrder.freighter_awb_number && (
                <div>
                  <span className="font-semibold text-blue-900">Freighter AWB #:</span>
                  <div className="font-mono text-blue-800 font-bold">{salesOrder.freighter_awb_number}</div>
                </div>
              )}
              {salesOrder.package_dimensions && (
                <div>
                  <span className="font-semibold text-blue-900">Dimensions L x W x H:</span>
                  <div className="text-blue-800 font-medium">{salesOrder.package_dimensions}</div>
                </div>
              )}
            </div>
            {salesOrder.package_weight && (
              <div className="mt-3">
                <span className="font-semibold text-blue-900">Gr.wgt/ Kgs:</span>
                <div className="text-blue-800 font-medium inline ml-2">{salesOrder.package_weight}</div>
              </div>
            )}
          </div>
        </div>

        {/* Export Documentation */}
        {(salesOrder.country_of_origin || salesOrder.end_use_country) && (
          <div className="mb-6">
            <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded">
              <h3 className="font-bold text-slate-900 mb-3 text-lg">EXPORT DOCUMENTATION</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {salesOrder.country_of_origin && (
                  <div>
                    <span className="font-semibold text-slate-900">Country of Origin:</span>
                    <div className="font-medium text-slate-800">{salesOrder.country_of_origin}</div>
                  </div>
                )}
                {salesOrder.end_use_country && (
                  <div>
                    <span className="font-semibold text-slate-900">End Use Country:</span>
                    <div className="font-medium text-slate-800">{salesOrder.end_use_country}</div>
                  </div>
                )}
              </div>
              <div className="text-xs text-blue-700 mt-3 font-medium">
                This information is provided for export control compliance and customs documentation purposes.
              </div>
            </div>
          </div>
        )}

        {/* Items Table */}
        <div className="mb-6">
          <h3 className="font-bold text-slate-900 mb-4 text-lg">Items Shipped</h3>
          <table className="w-full border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-2 text-left font-semibold w-12">ITEM</th>
                <th className="border border-slate-300 p-2 text-left font-semibold">DESCRIPTION</th>
                <th className="border border-slate-300 p-2 text-left font-semibold w-24">P/N</th>
                <th className="border border-slate-300 p-2 text-left font-semibold w-20">S/N</th>
                <th className="border border-slate-300 p-2 text-left font-semibold w-16">COND.</th>
                <th className="border border-slate-300 p-2 text-right font-semibold w-20">UNIT PRICE ({salesOrder.currency || 'USD'})</th>
              </tr>
            </thead>
            <tbody>
              {salesOrder.sales_order_items
                .sort((a, b) => a.line_number - b.line_number)
                .map((item) => (
                <tr key={item.line_number}>
                  <td className="border border-slate-300 p-2 font-semibold">{item.line_number}</td>
                  <td className="border border-slate-300 p-2 text-sm">
                    {item.inventory.pn_master_table.description || 'N/A'}
                  </td>
                  <td className="border border-slate-300 p-2 font-mono font-bold text-xs">
                    {item.inventory.pn_master_table.pn}
                  </td>
                  <td className="border border-slate-300 p-2 font-mono text-xs">
                    {item.inventory.serial_number || 'N/A'}
                  </td>
                  <td className="border border-slate-300 p-2 text-center text-xs">
                    {item.inventory.condition || 'N/A'}
                  </td>
                  <td className="border border-slate-300 p-2 text-right font-semibold text-sm">
                    {item.unit_price.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Part or Material Declaration */}
        <div className="mb-6 p-3 bg-yellow-50 border border-yellow-300 rounded">
          <h3 className="font-bold text-slate-900 mb-3">PART OR MATERIAL DECLARATION:</h3>
          <div className="text-sm text-slate-800 leading-relaxed">
            NONE OF THE ABOVE PARTS HAVE BEEN SUBJECTED TO SEVERE STRESS OR HEAT (AS IN A 
            MAJOR ENGINE FAILURE, ACCIDENT, INCIDENT OR FIRE). WE CERTIFY THAT EACH ARTICLE ORDERED IS NOT OF U.S. 
            GOVERNMENT OR MILITARY SURPLUS ORIGIN.
          </div>
        </div>

        {/* Financial Summary */}
        {salesOrder.sub_total !== null && salesOrder.total_net !== null && (
          <PDFFinancialSummary
            subtotal={salesOrder.sub_total}
            freight_charge={salesOrder.freight_charge}
            misc_charge={salesOrder.misc_charge}
            vat_percentage={salesOrder.vat_percentage}
            vat_amount={salesOrder.vat_amount}
            total_net={salesOrder.total_net}
            currency={salesOrder.currency || 'USD'}
          />
        )}

        {/* PO Reference */}
        {salesOrder.customer_po_number && (
          <div className="mb-8 text-center">
            <div className="font-bold text-slate-900 text-lg">
              PO REFERENCE: {salesOrder.customer_po_number}
            </div>
          </div>
        )}

        {/* Shipping Instructions */}
        <div className="mb-6">
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

        <div className="text-sm text-slate-700 mb-6">
          I certify that the items listed above have been carefully packed and shipped in accordance with the customer&apos;s order.
        </div>
        
        <PDFSignatureBlock 
          sections={[
            {
              title: "PACKING VERIFICATION",
              fields: [
                { label: "Packed by", type: "signature" },
                { label: "Print Name", type: "text" },
                { label: "Date", type: "date" }
              ]
            },
            {
              title: "RECEIPT VERIFICATION",
              fields: [
                { label: "Received by", type: "signature" },
                { label: "Print Name", type: "text" },
                { label: "Date", type: "date" }
              ]
            }
          ]}
          columns={2}
          className="mb-6"
        />

        <PDFFooter
          documentType="Packing Slip"
          documentNumber={`PS-${salesOrder.invoice_number}`}
          additionalInfo={[
            { label: 'Contact', value: 'For questions about this shipment, please contact us immediately.' }
          ]}
        />
    </PDFLayout>
  )
}