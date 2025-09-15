'use client'

import { useEffect, useState, useCallback } from 'react'
import PDFLayout from '@/components/pdf/PDFLayout'
import PDFHeader from '@/components/pdf/PDFHeader'
import PDFCompanyGrid from '@/components/pdf/PDFCompanyGrid'
import PDFFooter from '@/components/pdf/PDFFooter'
import PDFSignatureBlock from '@/components/pdf/PDFSignatureBlock'
import PDFFinancialSummary from '@/components/pdf/PDFFinancialSummary'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { useAuth } from '@/components/auth/AuthProvider'

interface RepairOrderPDFData {
  repair_order_id: string
  repair_order_number: string
  status: string
  expected_return_date: string | null
  actual_return_date: string | null
  total_cost: number
  currency: string
  remarks: string | null
  created_at: string
  companies: {
    company_name: string
    company_code: string
    company_addresses: Array<{
      address_line1: string
      address_line2: string | null
      city: string | null
      zip_code: string | null
      country: string | null
    }>
    company_contacts: Array<{
      contact_name: string
      email: string | null
      phone: string | null
    }>
  }
  repair_order_items: Array<{
    line_number: number
    workscope: string
    estimated_cost: number | null
    actual_cost: number | null
    notes: string | null
    inventory: {
      inventory_id: string
      pn_id: string
      sn: string | null
      physical_status: string
      business_status: string
      country_of_origin: string | null
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

interface RepairOrderPDFPageProps {
  params: {
    id: string
  }
}

export default function RepairOrderPDFPage({ params }: RepairOrderPDFPageProps) {
  const [repairOrder, setRepairOrder] = useState<RepairOrderPDFData | null>(null)
  const [loading, setLoading] = useState(true)
  const { user, loading: authLoading } = useAuth()

  const fetchRepairOrder = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('repair_orders')
        .select(`
          *,
          companies(
            *,
            company_addresses(
              address_line1,
              address_line2,
              city,
              zip_code,
              country
            ),
            company_contacts(
              contact_name,
              email,
              phone
            )
          ),
          repair_order_items(
            *,
            inventory(
              *,
              pn_master_table(pn, description)
            )
          )
        `)
        .eq('repair_order_id', params.id)
        .single()

      if (error) throw error
      setRepairOrder(data as any)
    } catch (error) {
      console.error('Error fetching repair order:', error)
      toast.error('Failed to fetch repair order')
    } finally {
      setLoading(false)
    }
  }, [params.id]);

  useEffect(() => {
    // Only fetch once auth is ready and user exists
    if (!authLoading && user) {
      fetchRepairOrder()
    }
  }, [authLoading, user, fetchRepairOrder])

  const handleDownload = () => {
    window.print()
  }

  const formatAddress = (company: any) => {
    if (!company.company_addresses || company.company_addresses.length === 0) {
      return ''
    }

    const address = company.company_addresses[0] // Use primary address
    const parts = [
      address.address_line1,
      address.address_line2,
      address.city,
      address.zip_code,
      address.country
    ].filter(Boolean)

    return parts.join(', ')
  }

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading repair order...</div>
      </div>
    )
  }

  if (!repairOrder) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Repair order not found</div>
      </div>
    )
  }

  // Create TASAVIA company info for the FROM section
  const tasaviaCompany = {
    company_name: 'TASAVIA',
    my_company_name: 'TASAVIA',
    my_company_code: 'TASAVIA',
    company_code: 'TASAVIA',
    company_addresses: [{
      address_line1: 'Aircraft Parts & Services',
      address_line2: null,
      city: null,
      country: null
    }],
    company_contacts: []
  }

  // Format vendor company for consistent structure
  const vendorCompany = {
    company_name: repairOrder.companies.company_name,
    company_code: repairOrder.companies.company_code,
    company_addresses: repairOrder.companies.company_addresses || [],
    company_contacts: repairOrder.companies.company_contacts || []
  }

  const companySections = [
    {
      title: 'FROM',
      company: tasaviaCompany
    },
    {
      title: 'REPAIR VENDOR',
      company: vendorCompany
    }
  ]

  // Prepare additional header info
  const additionalHeaderInfo = [
    { label: 'Status', value: repairOrder.status },
    { label: 'Ship Invoice', value: repairOrder.repair_order_number }
  ]

  return (
    <PDFLayout 
      title="Repair Order PDF" 
      documentNumber={repairOrder.repair_order_number}
      onDownload={handleDownload}
    >
      <PDFHeader
        documentType="REPAIR ORDER"
        documentNumber={repairOrder.repair_order_number}
        documentDate={repairOrder.created_at}
        additionalInfo={additionalHeaderInfo}
      />

      <PDFCompanyGrid sections={companySections} />

      {/* Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {repairOrder.expected_return_date && (
          <div className="bg-blue-50 p-4 rounded">
            <div className="font-semibold text-blue-900">Expected Return Date</div>
            <div className="text-blue-800 font-medium">
              {format(new Date(repairOrder.expected_return_date), 'MMMM dd, yyyy')}
            </div>
          </div>
        )}
        {repairOrder.actual_return_date && (
          <div className="bg-green-50 p-4 rounded">
            <div className="font-semibold text-green-900">Actual Return Date</div>
            <div className="text-green-800 font-medium">
              {format(new Date(repairOrder.actual_return_date), 'MMMM dd, yyyy')}
            </div>
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className="mb-8">
        <h3 className="font-bold text-slate-900 mb-4">Items for Repair</h3>
        <table className="w-full border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 p-3 text-left font-semibold">Line</th>
              <th className="border border-slate-300 p-3 text-left font-semibold">Part Number</th>
              <th className="border border-slate-300 p-3 text-left font-semibold">Description</th>
              <th className="border border-slate-300 p-3 text-left font-semibold">S/N</th>
              <th className="border border-slate-300 p-3 text-center font-semibold">Qty</th>
              <th className="border border-slate-300 p-3 text-left font-semibold">Workscope</th>
              <th className="border border-slate-300 p-3 text-right font-semibold">Est. Cost</th>
            </tr>
          </thead>
          <tbody>
            {repairOrder.repair_order_items
              .sort((a, b) => a.line_number - b.line_number)
              .map((item) => (
              <tr key={item.line_number}>
                <td className="border border-slate-300 p-3">{item.line_number}</td>
                <td className="border border-slate-300 p-3 font-mono font-bold">
                  {item.inventory.pn_master_table.pn}
                </td>
                <td className="border border-slate-300 p-3">
                  {item.inventory.pn_master_table.description || 'N/A'}
                  {item.inventory.physical_status && (
                    <div className="text-sm text-slate-600">Status: {item.inventory.physical_status}</div>
                  )}
                </td>
                <td className="border border-slate-300 p-3 font-mono">
                  {item.inventory.sn || 'N/A'}
                </td>
                <td className="border border-slate-300 p-3 text-center">
                  1
                </td>
                <td className="border border-slate-300 p-3 font-medium">
                  {item.workscope}
                </td>
                <td className="border border-slate-300 p-3 text-right">
                  {item.estimated_cost ? `$${item.estimated_cost.toFixed(2)}` : 'TBD'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Traceability Information */}
      <div className="mb-8">
        <h3 className="font-bold text-slate-900 mb-4">Traceability Information</h3>
        {repairOrder.repair_order_items.map((item) => (
          <div key={item.line_number} className="mb-4">
            {(item.inventory.traceability_source || 
              item.inventory.traceable_to || 
              item.inventory.last_certified_agency || 
              item.inventory.part_status_certification) ? (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
                <div className="font-semibold text-yellow-900 mb-2">
                  Line {item.line_number}: {item.inventory.pn_master_table.pn}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {item.inventory.traceability_source && (
                    <div>
                      <span className="font-medium">Source:</span> {item.inventory.traceability_source}
                    </div>
                  )}
                  {item.inventory.traceable_to && (
                    <div>
                      <span className="font-medium">Traceable to:</span> {item.inventory.traceable_to}
                    </div>
                  )}
                  {item.inventory.last_certified_agency && (
                    <div>
                      <span className="font-medium">Last Certified:</span> {item.inventory.last_certified_agency}
                    </div>
                  )}
                  {item.inventory.part_status_certification && (
                    <div>
                      <span className="font-medium">Status:</span> {item.inventory.part_status_certification}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 p-4 rounded">
                <div className="text-slate-600 text-sm">
                  Line {item.line_number}: {item.inventory.pn_master_table.pn} - No traceability information available
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Certification and Origin */}
      <div className="mb-8">
        <h3 className="font-bold text-slate-900 mb-4">Certification and Origin</h3>
        {repairOrder.repair_order_items.map((item) => (
          <div key={item.line_number} className="mb-4">
            {item.inventory.country_of_origin ? (
              <div className="bg-green-50 border border-green-200 p-4 rounded">
                <div className="font-semibold text-green-900 mb-2">
                  Line {item.line_number}: {item.inventory.pn_master_table.pn}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Country of Origin:</span> {item.inventory.country_of_origin}
                  </div>
                  <div>
                    <span className="font-medium">Certification Requirements:</span> TCCA RELEASE
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 p-4 rounded">
                <div className="text-slate-600 text-sm">
                  Line {item.line_number}: {item.inventory.pn_master_table.pn} - No country of origin information available
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <PDFFinancialSummary
        subtotal={repairOrder.total_cost}
        freight_charge={null}
        misc_charge={null}
        vat_percentage={null}
        vat_amount={null}
        total_net={repairOrder.total_cost}
        currency={repairOrder.currency}
      />

      {/* Work Instructions */}
      <div className="mb-8">
        <h3 className="font-bold text-slate-900 mb-4">Work Instructions</h3>
        <div className="bg-slate-50 p-4 rounded">
          <div className="text-sm text-slate-700 space-y-2">
            <div>• All work must be performed in accordance with applicable aviation regulations and manufacturer specifications.</div>
            <div>• Parts must be returned with appropriate certification and documentation.</div>
            <div>• Any deviations from the specified workscope must be approved in writing before proceeding.</div>
            <div>• Upon completion, provide detailed work performed documentation and updated traceability records.</div>
          </div>
        </div>
      </div>

      {/* Remarks */}
      {repairOrder.remarks && (
        <div className="mb-8">
          <h3 className="font-semibold text-slate-900 mb-2">Special Instructions</h3>
          <div className="text-sm text-slate-600 whitespace-pre-line bg-slate-50 p-3 rounded border">
            {repairOrder.remarks}
          </div>
        </div>
      )}

      <PDFSignatureBlock 
        sections={[
          {
            title: "CUSTOMER AUTHORIZATION",
            fields: [
              { label: "Authorized by (Customer)", type: "signature" },
              { label: "Print Name", type: "text" },
              { label: "Date", type: "date" }
            ]
          },
          {
            title: "VENDOR ACCEPTANCE",
            fields: [
              { label: "Accepted by (Vendor)", type: "signature" },
              { label: "Print Name", type: "text" },
              { label: "Date", type: "date" }
            ]
          }
        ]}
        columns={2}
        className="mb-8"
      />

      <PDFFooter
        documentType="Repair Order"
        documentNumber={repairOrder.repair_order_number}
        status={repairOrder.status}
      />
    </PDFLayout>
  )
}