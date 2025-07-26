'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Printer } from 'lucide-react'
import { format } from 'date-fns'
import PDFExportButton from '@/components/ata106/PDFExportButton'
import CertificationSection, { type CertificationData } from '@/components/ata106/CertificationSection'
import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { FileText, PenTool } from 'lucide-react'

interface ATA106Data {
  sales_order_id: string
  invoice_number: string
  sales_date: string | null
  my_companies: any
  companies: any
  sales_order_items: any[]
}

interface ATA106ClientPageProps {
  salesOrder: ATA106Data
}

export default function ATA106ClientPage({ salesOrder }: ATA106ClientPageProps) {
  const router = useRouter()
  const [certificationData, setCertificationData] = useState<CertificationData | null>(null)
  const [activeTab, setActiveTab] = useState('form')

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
          <PDFExportButton 
            salesOrderData={salesOrder}
            variant="outline"
            size="default"
          />
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Tabs for Form and Signatures */}
      <div className="print:hidden mb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="form" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>ATA 106 Form</span>
            </TabsTrigger>
            <TabsTrigger value="signatures" className="flex items-center space-x-2">
              <PenTool className="h-4 w-4" />
              <span>Digital Signatures</span>
              {certificationData?.certification_status === 'completed' && (
                <Badge className="bg-green-100 text-green-800 ml-2">Complete</Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="form" className="mt-6">
            {/* ATA 106 Form */}
      <div className="max-w-4xl mx-auto bg-white p-8 shadow-lg print:shadow-none print:p-0">
        {/* Header */}
        <div className="border-2 border-slate-800 mb-6">
          <div className="bg-slate-100 p-4 text-center border-b-2 border-slate-800">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">
              AIRCRAFT PARTS TRACEABILITY FORM
            </h1>
            <div className="text-xl font-bold text-slate-800">ATA SPEC 106 - FORM 1</div>
            <div className="text-sm text-slate-700 mt-1">
              In accordance with ATA Specification 106 for Aircraft Parts Traceability
            </div>
          </div>
          
          {/* Form Control Information */}
          <div className="p-4 bg-white">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="border border-slate-400 p-2">
                <div className="font-bold">FORM NUMBER:</div>
                <div className="font-mono">ATA106-{salesOrder.invoice_number}</div>
              </div>
              <div className="border border-slate-400 p-2">
                <div className="font-bold">DATE ISSUED:</div>
                <div>{salesOrder.sales_date ? format(new Date(salesOrder.sales_date), 'dd MMM yyyy') : 'N/A'}</div>
              </div>
              <div className="border border-slate-400 p-2">
                <div className="font-bold">PAGE:</div>
                <div>1 of 1</div>
              </div>
            </div>
          </div>
        </div>

        {/* Transfer Information Section */}
        <div className="border-2 border-slate-800 mb-6">
          <div className="bg-slate-100 p-2 border-b-2 border-slate-800">
            <h3 className="font-bold text-slate-900 text-center">SECTION I - TRANSFER INFORMATION</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 gap-4 text-sm mb-4">
              <div className="border border-slate-400 p-2">
                <div className="font-bold mb-1">TRANSFER TYPE:</div>
                <div>☑ SALE &nbsp;&nbsp; ☐ LOAN &nbsp;&nbsp; ☐ LEASE &nbsp;&nbsp; ☐ OTHER</div>
              </div>
              <div className="border border-slate-400 p-2">
                <div className="font-bold mb-1">TRANSFER DATE:</div>
                <div>{salesOrder.sales_date ? format(new Date(salesOrder.sales_date), 'dd MMM yyyy') : 'N/A'}</div>
              </div>
              <div className="border border-slate-400 p-2">
                <div className="font-bold mb-1">REFERENCE NUMBER:</div>
                <div className="font-mono">{salesOrder.invoice_number}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Companies Information */}
        <div className="border-2 border-slate-800 mb-6">
          <div className="bg-slate-100 p-2 border-b-2 border-slate-800">
            <h3 className="font-bold text-slate-900 text-center">SECTION II - ORGANIZATION INFORMATION</h3>
          </div>
          <div className="grid grid-cols-2 gap-0">
            <div className="border-r border-slate-800 p-4">
              <h4 className="font-bold text-slate-900 mb-3 text-center bg-slate-50 p-2 border border-slate-400">
                TRANSFEROR (FROM)
              </h4>
              <div className="space-y-3 text-sm">
                <div className="border border-slate-400 p-2">
                  <div className="font-bold">ORGANIZATION NAME:</div>
                  <div className="font-semibold">{salesOrder.my_companies.my_company_name}</div>
                </div>
                <div className="border border-slate-400 p-2">
                  <div className="font-bold">ORGANIZATION CODE:</div>
                  <div>{salesOrder.my_companies.my_company_code}</div>
                </div>
                <div className="border border-slate-400 p-2">
                  <div className="font-bold">ADDRESS:</div>
                  <div>{formatAddress(salesOrder.my_companies)}</div>
                </div>
                <div className="border border-slate-400 p-2">
                  <div className="font-bold">AUTHORIZED REPRESENTATIVE:</div>
                  <div className="h-4"></div>
                </div>
                <div className="border border-slate-400 p-2">
                  <div className="font-bold">TITLE/POSITION:</div>
                  <div className="h-4"></div>
                </div>
              </div>
            </div>

            <div className="p-4">
              <h4 className="font-bold text-slate-900 mb-3 text-center bg-slate-50 p-2 border border-slate-400">
                TRANSFEREE (TO)
              </h4>
              <div className="space-y-3 text-sm">
                <div className="border border-slate-400 p-2">
                  <div className="font-bold">ORGANIZATION NAME:</div>
                  <div className="font-semibold">{salesOrder.companies.company_name}</div>
                </div>
                <div className="border border-slate-400 p-2">
                  <div className="font-bold">ORGANIZATION CODE:</div>
                  <div>{salesOrder.companies.company_code}</div>
                </div>
                <div className="border border-slate-400 p-2">
                  <div className="font-bold">ADDRESS:</div>
                  <div>{formatAddress(salesOrder.companies)}</div>
                </div>
                <div className="border border-slate-400 p-2">
                  <div className="font-bold">AUTHORIZED REPRESENTATIVE:</div>
                  <div className="h-4"></div>
                </div>
                <div className="border border-slate-400 p-2">
                  <div className="font-bold">TITLE/POSITION:</div>
                  <div className="h-4"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Parts Traceability Section */}
        <div className="border-2 border-slate-800 mb-6">
          <div className="bg-slate-100 p-2 border-b-2 border-slate-800">
            <h3 className="font-bold text-slate-900 text-center">SECTION III - AIRCRAFT PARTS TRACEABILITY RECORD</h3>
          </div>
          
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-800 p-1 text-center font-bold">LINE</th>
                <th className="border border-slate-800 p-1 text-center font-bold">PART NUMBER</th>
                <th className="border border-slate-800 p-1 text-center font-bold">SERIAL NUMBER</th>
                <th className="border border-slate-800 p-1 text-center font-bold">DESCRIPTION</th>
                <th className="border border-slate-800 p-1 text-center font-bold">QTY</th>
                <th className="border border-slate-800 p-1 text-center font-bold">CONDITION</th>
                <th className="border border-slate-800 p-1 text-center font-bold">APPLICATION</th>
                <th className="border border-slate-800 p-1 text-center font-bold">DIMENSIONS</th>
                <th className="border border-slate-800 p-1 text-center font-bold">TRACEABILITY SOURCE</th>
                <th className="border border-slate-800 p-1 text-center font-bold">LAST CERTIFIED AGENCY</th>
              </tr>
            </thead>
            <tbody>
              {traceableItems.map((item) => (
                <tr key={item.line_number}>
                  <td className="border border-slate-800 p-1 text-center font-bold">{item.line_number}</td>
                  <td className="border border-slate-800 p-1 font-mono font-bold">
                    {item.inventory.pn_master_table.pn}
                  </td>
                  <td className="border border-slate-800 p-1 font-mono">
                    {item.inventory.serial_number || 'N/A'}
                  </td>
                  <td className="border border-slate-800 p-1">
                    {item.inventory.pn_master_table.description || 'N/A'}
                  </td>
                  <td className="border border-slate-800 p-1 text-center">
                    {item.inventory.quantity}
                  </td>
                  <td className="border border-slate-800 p-1 text-center">
                    {item.inventory.condition || 'N/A'}
                  </td>
                  <td className="border border-slate-800 p-1">
                    {item.inventory.application_code || 'N/S'}
                  </td>
                  <td className="border border-slate-800 p-1">
                    {item.inventory.dimensions || 'N/S'}
                  </td>
                  <td className="border border-slate-800 p-1">
                    {item.inventory.traceability_source || 'N/S'}
                  </td>
                  <td className="border border-slate-800 p-1">
                    {item.inventory.last_certified_agency || 'N/S'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Certification and Compliance Section */}
        <div className="border-2 border-slate-800 mb-6">
          <div className="bg-slate-100 p-2 border-b-2 border-slate-800">
            <h3 className="font-bold text-slate-900 text-center">SECTION IV - CERTIFICATION AND COMPLIANCE</h3>
          </div>
          
          {/* Certification Statement */}
          <div className="p-4 border-b border-slate-800">
            <div className="text-sm text-slate-900 font-semibold mb-3">CERTIFICATION STATEMENT:</div>
            <div className="text-xs text-slate-700 leading-relaxed mb-4">
              I hereby certify that the information contained in this Aircraft Parts Traceability Form is complete and accurate to the best of my knowledge and belief. 
              The parts described herein have been maintained in accordance with applicable airworthiness regulations, manufacturer's instructions, and industry standards. 
              All records related to the maintenance, repair, and alteration of these parts are on file and available for inspection by authorized personnel.
            </div>
            
            <div className="text-xs text-slate-700 leading-relaxed mb-4">
              This certification is made in compliance with ATA Specification 106 for Aircraft Parts Traceability and applicable Federal Aviation Regulations (FAR) 
              or equivalent international aviation regulations. The undersigned understands that any false, fictitious, or fraudulent statements may subject the person 
              making such statements to criminal prosecution under applicable law.
            </div>
          </div>
          
          {/* Signature Blocks */}
          <div className="grid grid-cols-2 gap-0">
            <div className="border-r border-slate-800 p-4">
              <h4 className="font-bold text-slate-900 mb-3 text-center bg-slate-50 p-2 border border-slate-400">
                TRANSFEROR CERTIFICATION
              </h4>
              <div className="space-y-4 text-sm">
                <div className="border border-slate-400 p-2">
                  <div className="font-bold mb-1">AUTHORIZED SIGNATURE:</div>
                  <div className="h-8 border-b border-slate-400 mb-2"></div>
                </div>
                <div className="border border-slate-400 p-2">
                  <div className="font-bold mb-1">PRINT NAME:</div>
                  <div className="h-6"></div>
                </div>
                <div className="border border-slate-400 p-2">
                  <div className="font-bold mb-1">TITLE/POSITION:</div>
                  <div className="h-6"></div>
                </div>
                <div className="border border-slate-400 p-2">
                  <div className="font-bold mb-1">DATE:</div>
                  <div className="h-6"></div>
                </div>
                <div className="border border-slate-400 p-2">
                  <div className="font-bold mb-1">CERTIFICATE/LICENSE NO.:</div>
                  <div className="h-6"></div>
                </div>
              </div>
            </div>

            <div className="p-4">
              <h4 className="font-bold text-slate-900 mb-3 text-center bg-slate-50 p-2 border border-slate-400">
                TRANSFEREE ACCEPTANCE
              </h4>
              <div className="space-y-4 text-sm">
                <div className="border border-slate-400 p-2">
                  <div className="font-bold mb-1">AUTHORIZED SIGNATURE:</div>
                  <div className="h-8 border-b border-slate-400 mb-2"></div>
                </div>
                <div className="border border-slate-400 p-2">
                  <div className="font-bold mb-1">PRINT NAME:</div>
                  <div className="h-6"></div>
                </div>
                <div className="border border-slate-400 p-2">
                  <div className="font-bold mb-1">TITLE/POSITION:</div>
                  <div className="h-6"></div>
                </div>
                <div className="border border-slate-400 p-2">
                  <div className="font-bold mb-1">DATE:</div>
                  <div className="h-6"></div>
                </div>
                <div className="border border-slate-400 p-2">
                  <div className="font-bold mb-1">CERTIFICATE/LICENSE NO.:</div>
                  <div className="h-6"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Regulatory Compliance Notice */}
        <div className="border-2 border-slate-800 mb-6">
          <div className="bg-slate-100 p-2 border-b-2 border-slate-800">
            <h3 className="font-bold text-slate-900 text-center">SECTION V - REGULATORY COMPLIANCE</h3>
          </div>
          <div className="p-4">
            <div className="text-xs text-slate-700 leading-relaxed space-y-2">
              <div className="font-bold">NOTICE TO RECIPIENTS:</div>
              <div>
                This form is submitted in accordance with ATA Specification 106 for Aircraft Parts Traceability. Recipients are advised that the 
                parts described herein are subject to applicable airworthiness regulations and may only be installed on aircraft in accordance 
                with approved procedures by properly certificated personnel.
              </div>
              <div>
                <span className="font-bold">EXPORT CONTROL:</span> These parts may be subject to export control regulations. Consult applicable 
                export control laws before transferring or exporting these parts outside the country of origin.
              </div>
              <div>
                <span className="font-bold">RECORD RETENTION:</span> This form and supporting documentation must be retained in accordance with 
                applicable regulations for the operational life of the aircraft or component, whichever is longer.
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
          </TabsContent>
          
          <TabsContent value="signatures" className="mt-6">
            <CertificationSection
              salesOrderData={salesOrder}
              onCertificationChange={setCertificationData}
              existingCertification={certificationData || undefined}
            />
          </TabsContent>
        </Tabs>
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