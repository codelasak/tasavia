'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Printer } from 'lucide-react'
import { format } from 'date-fns'
import PDFExportButton from '@/components/ata106/PDFExportButton'
import CertificationSection, { type CertificationData } from '@/components/ata106/CertificationSection'
import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { FileText, PenTool } from 'lucide-react'
import PDFLayout from '@/components/pdf/PDFLayout'
import PDFHeader from '@/components/pdf/PDFHeader'
import PDFCompanyGrid from '@/components/pdf/PDFCompanyGrid'
import PDFFooter from '@/components/pdf/PDFFooter'
import PDFPrintControls from '@/components/pdf/PDFPrintControls'

interface ATA106Data {
  sales_order_id: string
  invoice_number: string
  sales_date: string | null
  my_companies: any
  companies: any
  sales_order_items: Array<{
    line_number: number
    inventory: {
      serial_number: string | null
      condition: string | null
      quantity: number | null
      traceability_source: string | null
      traceable_to: string | null
      last_certified_agency: string | null
      obtained_from: string | null
      application_code: string | null
      dimensions: string | null
      pn_master_table: {
        pn: string
        description: string | null
      }
    }
  }>
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

  // Categorize items by condition for conditional verification sections
  const newParts = traceableItems.filter(item => 
    item.inventory.condition?.toLowerCase().includes('new') || 
    item.inventory.condition?.toLowerCase().includes('svc')
  )
  const usedParts = traceableItems.filter(item => 
    item.inventory.condition?.toLowerCase().includes('used') || 
    item.inventory.condition?.toLowerCase().includes('repaired') || 
    item.inventory.condition?.toLowerCase().includes('overhaul') ||
    item.inventory.condition?.toLowerCase().includes('ar')
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
      <PDFPrintControls 
        onBack={() => router.back()}
        onPrint={handlePrint}
        showExportButton={true}
        exportButtonComponent={
          <PDFExportButton 
            salesOrderData={salesOrder}
            variant="outline"
            size="default"
          />
        }
      />

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
      <PDFLayout
        title="ATA 106 Form PDF"
        documentNumber={`ATA106-${salesOrder.invoice_number}`}
        onDownload={handlePrint}
        className="print:block"
      >
        <PDFHeader
          documentType="AIRCRAFT PARTS TRACEABILITY FORM - ATA SPEC 106 - FORM 1"
          documentNumber={`ATA106-${salesOrder.invoice_number}`}
          documentDate={salesOrder.sales_date || new Date()}
          additionalInfo={[
            { label: 'Form Number', value: `ATA106-${salesOrder.invoice_number}` },
            { label: 'Compliance', value: 'ATA Specification 106 for Aircraft Parts Traceability' }
          ]}
        />

        {/* Transfer Information Section */}
        <div className="border border-slate-300 mb-4">
          <div className="bg-slate-100 p-3 border-b border-slate-300">
            <h3 className="font-bold text-slate-900 text-center">SECTION I - TRANSFER INFORMATION</h3>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-3 gap-4 text-sm mb-3">
              <div className="border border-slate-300 p-3">
                <div className="font-bold mb-1">TRANSFER TYPE:</div>
                <div>☑ SALE &nbsp;&nbsp; ☐ LOAN &nbsp;&nbsp; ☐ LEASE &nbsp;&nbsp; ☐ OTHER</div>
              </div>
              <div className="border border-slate-300 p-3">
                <div className="font-bold mb-1">TRANSFER DATE:</div>
                <div>{salesOrder.sales_date ? format(new Date(salesOrder.sales_date), 'dd MMM yyyy') : 'N/A'}</div>
              </div>
              <div className="border border-slate-300 p-3">
                <div className="font-bold mb-1">REFERENCE NUMBER:</div>
                <div className="font-mono">{salesOrder.invoice_number}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Section II - Organization Information with unified grid */}
        <div className="mb-6">
          <div className="bg-slate-100 p-3 border border-slate-300 mb-4">
            <h3 className="font-bold text-slate-900 text-center">SECTION II - ORGANIZATION INFORMATION</h3>
          </div>
          <PDFCompanyGrid sections={[
            {
              title: 'TRANSFEROR (FROM)',
              company: {
                company_name: salesOrder.my_companies.my_company_name,
                company_code: salesOrder.my_companies.my_company_code,
                company_addresses: [{
                  address_line1: formatAddress(salesOrder.my_companies),
                  address_line2: null,
                  city: null,
                  country: null
                }],
                company_contacts: []
              }
            },
            {
              title: 'TRANSFEREE (TO)',
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
          
          {/* Signature fields for organizations */}
          <div className="grid grid-cols-2 gap-6 mt-6">
            <div className="border border-slate-300 p-4">
              <div className="font-semibold mb-2">AUTHORIZED REPRESENTATIVE:</div>
              <div className="border-b border-slate-400 h-6 mb-3"></div>
              <div className="font-semibold mb-2">TITLE/POSITION:</div>
              <div className="border-b border-slate-400 h-6"></div>
            </div>
            <div className="border border-slate-300 p-4">
              <div className="font-semibold mb-2">AUTHORIZED REPRESENTATIVE:</div>
              <div className="border-b border-slate-400 h-6 mb-3"></div>
              <div className="font-semibold mb-2">TITLE/POSITION:</div>
              <div className="border-b border-slate-400 h-6"></div>
            </div>
          </div>
        </div>

        {/* Parts Traceability Section */}
        <div className="border border-slate-300 mb-4">
          <div className="bg-slate-100 p-3 border-b border-slate-300">
            <h3 className="font-bold text-slate-900 text-center">SECTION III - AIRCRAFT PARTS TRACEABILITY RECORD</h3>
          </div>
          
          {/* Basic Part Information Table */}
          <div className="p-3 border-b border-slate-300">
            <h4 className="font-semibold text-slate-900 mb-3">Part Information</h4>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 p-1 text-center font-semibold w-12">LINE</th>
                  <th className="border border-slate-300 p-1 text-center font-semibold w-24">PART NUMBER</th>
                  <th className="border border-slate-300 p-1 text-center font-semibold">DESCRIPTION</th>
                  <th className="border border-slate-300 p-1 text-center font-semibold w-20">S/N</th>
                  <th className="border border-slate-300 p-1 text-center font-semibold w-10">QTY</th>
                  <th className="border border-slate-300 p-1 text-center font-semibold w-16">CONDITION</th>
                </tr>
              </thead>
              <tbody>
                {traceableItems.map((item) => (
                  <tr key={`basic-${item.line_number}`}>
                    <td className="border border-slate-300 p-1 text-center font-semibold">{item.line_number}</td>
                    <td className="border border-slate-300 p-1 font-mono font-bold text-xs">
                      {item.inventory.pn_master_table.pn}
                    </td>
                    <td className="border border-slate-300 p-1 text-xs">
                      {item.inventory.pn_master_table.description || 'N/A'}
                    </td>
                    <td className="border border-slate-300 p-1 font-mono text-center text-xs">
                      {item.inventory.serial_number || 'N/A'}
                    </td>
                    <td className="border border-slate-300 p-1 text-center">
                      {item.inventory.quantity}
                    </td>
                    <td className="border border-slate-300 p-1 text-center text-xs">
                      {item.inventory.condition || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Traceability Information Table */}
          <div className="p-3">
            <h4 className="font-semibold text-slate-900 mb-3">Traceability Information</h4>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 p-1 text-center font-semibold w-12">LINE</th>
                  <th className="border border-slate-300 p-1 text-center font-semibold">OBTAINED FROM</th>
                  <th className="border border-slate-300 p-1 text-center font-semibold">TRACEABLE TO</th>
                  <th className="border border-slate-300 p-1 text-center font-semibold">LAST CERTIFIED AGENCY</th>
                  <th className="border border-slate-300 p-1 text-center font-semibold w-20">APPLICATION</th>
                  <th className="border border-slate-300 p-1 text-center font-semibold w-20">DIMENSIONS</th>
                </tr>
              </thead>
              <tbody>
                {traceableItems.map((item) => (
                  <tr key={`trace-${item.line_number}`}>
                    <td className="border border-slate-300 p-1 text-center font-semibold">{item.line_number}</td>
                    <td className="border border-slate-300 p-1 text-xs">
                      {item.inventory.obtained_from || 'N/S'}
                    </td>
                    <td className="border border-slate-300 p-1 text-xs">
                      {item.inventory.traceable_to || 'N/S'}
                    </td>
                    <td className="border border-slate-300 p-1 text-xs">
                      {item.inventory.last_certified_agency || 'N/S'}
                    </td>
                    <td className="border border-slate-300 p-1 text-center text-xs">
                      {item.inventory.application_code || 'N/S'}
                    </td>
                    <td className="border border-slate-300 p-1 text-center text-xs">
                      {item.inventory.dimensions || 'N/S'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Conditional Verification Sections */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <h3 className="font-bold text-blue-900 mb-2">VERIFICATION SECTIONS:</h3>
          <div className="text-sm text-blue-800">
            {newParts.length > 0 && (
              <div>• <strong>New Parts:</strong> {newParts.length} part(s) requiring Section 14 verification</div>
            )}
            {usedParts.length > 0 && (
              <div>• <strong>Used/Repaired/Overhaul Parts:</strong> {usedParts.length} part(s) requiring Section 18 verification</div>
            )}
            {newParts.length === 0 && usedParts.length === 0 && (
              <div>• <strong>General Certification:</strong> Parts with unclassified conditions</div>
            )}
          </div>
        </div>
        
        {/* Section IV - New Parts/Material Verification (if applicable) */}
        {newParts.length > 0 && (
          <div className="border border-slate-300 mb-6">
            <div className="bg-slate-100 p-3 border-b border-slate-300">
              <h3 className="font-bold text-slate-900 text-center">
                14. New Parts/Material Verification:
              </h3>
            </div>
            
            {/* Attestation Statement */}
            <div className="p-4 border-b border-slate-300">
              <div className="text-xs text-slate-700 leading-relaxed mb-4 font-semibold">
                THE FOLLOWING SIGNATURE ATTESTS THAT PART(S) OR MATERIAL(S) IDENTIFIED ABOVE WAS(WERE) MANUFACTURED BY 
                A FAA PRODUCTION APPROVAL HOLDER (PAH), OR TO AN INDUSTRY COMMERCIAL STANDARD.
              </div>
              
              {/* Enhanced Traceability Info */}
              <div className="mb-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <strong>13B. Obtained from:</strong> {newParts[0]?.inventory.obtained_from || 'ACTC'}
                  </div>
                  <div>
                    <strong>13C. Last Certified Agency:</strong> {newParts[0]?.inventory.last_certified_agency || 'AERO INSTRUMENTS & AVIONICS'}
                  </div>
                </div>
                <div className="mt-2">
                  <strong>Traceable to:</strong> {newParts[0]?.inventory.traceable_to || 'EASYJET AIRBUS A320 MSN 2010'}
                </div>
              </div>
            </div>
            
            {/* Signature Block */}
            <div className="p-4">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="font-semibold mb-2">15. Signature</div>
                  <div className="border-b border-slate-400 h-8 mb-3"></div>
                </div>
                <div>
                  <div className="font-semibold mb-2">19. Signature</div>
                  <div className="border-b border-slate-400 h-8 mb-3"></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-8 mt-4">
                <div>
                  <div className="font-semibold mb-1">16. Name</div>
                  <div className="border-b border-slate-400 h-6 mb-2"></div>
                  <div className="font-semibold mb-1">17. Date</div>
                  <div className="border-b border-slate-400 h-6"></div>
                </div>
                <div>
                  <div className="font-semibold mb-1">20. Name: SALIH INCE</div>
                  <div className="border-b border-slate-400 h-6 mb-2"></div>
                  <div className="font-semibold mb-1">21. Date: APR 17, 2025</div>
                  <div className="border-b border-slate-400 h-6"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section V - Used, Repaired or Overhaul Parts Verification (if applicable) */}
        {usedParts.length > 0 && (
          <div className="border border-slate-300 mb-6">
            <div className="bg-slate-100 p-3 border-b border-slate-300">
              <h3 className="font-bold text-slate-900 text-center">
                18. Used, Repaired or Overhaul Parts Verification:
              </h3>
            </div>
            
            {/* Attestation Statement */}
            <div className="p-4 border-b border-slate-300">
              <div className="text-xs text-slate-700 leading-relaxed mb-4 font-semibold">
                THE FOLLOWING SIGNATURE ATTESTS THAT DOCUMENTATION SPECIFIED ABOVE OR ATTACHED IS ACCURATE WITH REGARD 
                TO THE ITEM(S) DESCRIBED.
              </div>
            </div>
            
            {/* Signature Block */}
            <div className="p-4">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="font-semibold mb-2">15. Signature</div>
                  <div className="border-b border-slate-400 h-8 mb-3"></div>
                </div>
                <div>
                  <div className="font-semibold mb-2">19. Signature</div>
                  <div className="border-b border-slate-400 h-8 mb-3"></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-8 mt-4">
                <div>
                  <div className="font-semibold mb-1">16. Name</div>
                  <div className="border-b border-slate-400 h-6 mb-2"></div>
                  <div className="font-semibold mb-1">17. Date</div>
                  <div className="border-b border-slate-400 h-6"></div>
                </div>
                <div>
                  <div className="font-semibold mb-1">20. Name</div>
                  <div className="border-b border-slate-400 h-6 mb-2"></div>
                  <div className="font-semibold mb-1">21. Date</div>
                  <div className="border-b border-slate-400 h-6"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* General Certification Section (for mixed or unclassified parts) */}
        {(newParts.length === 0 && usedParts.length === 0 && traceableItems.length > 0) && (
          <div className="border border-slate-300 mb-6">
            <div className="bg-slate-100 p-3 border-b border-slate-300">
              <h3 className="font-bold text-slate-900 text-center">SECTION IV - CERTIFICATION AND COMPLIANCE</h3>
            </div>
            
            {/* General Certification Statement */}
            <div className="p-4 border-b border-slate-300">
              <div className="text-sm text-slate-900 font-semibold mb-3">CERTIFICATION STATEMENT:</div>
              <div className="text-xs text-slate-700 leading-relaxed mb-4">
                I hereby certify that the information contained in this Aircraft Parts Traceability Form is complete and accurate to the best of my knowledge and belief. 
                The parts described herein have been maintained in accordance with applicable airworthiness regulations, manufacturer&apos;s instructions, and industry standards.
              </div>
            </div>
            
            {/* General Signature Blocks */}
            <div className="grid grid-cols-2 gap-6 p-4">
              <div className="border border-slate-300 p-4">
                <h4 className="font-bold text-slate-900 mb-4 text-center bg-slate-50 p-2">
                  TRANSFEROR CERTIFICATION
                </h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="font-semibold mb-1">AUTHORIZED SIGNATURE:</div>
                    <div className="mb-2">
                      <Image
                        src="/signature.png"
                        alt="Signature"
                        width={110}
                        height={60}
                        className="object-contain"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold mb-1">PRINT NAME:</div>
                    <div className="border-b border-slate-400 h-6 mb-2"></div>
                  </div>
                  <div>
                    <div className="font-semibold mb-1">DATE:</div>
                    <div className="border-b border-slate-400 h-6 mb-2"></div>
                  </div>
                </div>
              </div>

              <div className="border border-slate-300 p-4">
                <h4 className="font-bold text-slate-900 mb-4 text-center bg-slate-50 p-2">
                  TRANSFEREE ACCEPTANCE
                </h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="font-semibold mb-1">AUTHORIZED SIGNATURE:</div>
                    <div className="mb-2">
                      <Image
                        src="/signature.png"
                        alt="Signature"
                        width={110}
                        height={60}
                        className="object-contain"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold mb-1">PRINT NAME:</div>
                    <div className="border-b border-slate-400 h-6 mb-2"></div>
                  </div>
                  <div>
                    <div className="font-semibold mb-1">DATE:</div>
                    <div className="border-b border-slate-400 h-6 mb-2"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Regulatory Compliance Notice */}
        <div className="border border-slate-300 mb-6">
          <div className="bg-slate-100 p-3 border-b border-slate-300">
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

        <PDFFooter
          documentType="ATA 106 Form"
          documentNumber={`ATA106-${salesOrder.invoice_number}`}
          additionalInfo={[
            { label: 'Compliance', value: 'This form complies with ATA Specification 106 for Aircraft Parts Traceability' }
          ]}
        />
      </PDFLayout>
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
    </>
  )
}