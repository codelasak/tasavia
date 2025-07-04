'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Printer } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format } from 'date-fns'

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
    address_line_1: string | null
    address_line_2: string | null
    city: string | null
    state: string | null
    postal_code: string | null
    country: string | null
    phone: string | null
    email: string | null
  }
  repair_order_items: Array<{
    line_number: number
    workscope: string
    estimated_cost: number | null
    actual_cost: number | null
    status: string | null
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

interface RepairOrderPDFPageProps {
  params: {
    id: string
  }
}

export default function RepairOrderPDFPage({ params }: RepairOrderPDFPageProps) {
  const router = useRouter()
  const [repairOrder, setRepairOrder] = useState<RepairOrderPDFData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRepairOrder()
  }, [params.id])

  const fetchRepairOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('repair_orders')
        .select(`
          *,
          companies(*),
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
      router.push('/portal/repair-orders')
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
    
    return parts.join('\n')
  }

  if (loading) {
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

      {/* Repair Order Document */}
      <div className="max-w-4xl mx-auto bg-white p-8 shadow-lg print:shadow-none print:p-0">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">REPAIR ORDER</h1>
            <div className="text-slate-600">
              <div className="font-mono font-bold text-lg">{repairOrder.repair_order_number}</div>
              <div>Date: {format(new Date(repairOrder.created_at), 'MMMM dd, yyyy')}</div>
              <div className="mt-2">
                <span className={`px-2 py-1 rounded text-sm font-medium ${
                  repairOrder.status === 'Draft' ? 'bg-gray-100 text-gray-800' :
                  repairOrder.status === 'Sent' ? 'bg-blue-100 text-blue-800' :
                  repairOrder.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                  repairOrder.status === 'Completed' ? 'bg-green-100 text-green-800' :
                  repairOrder.status === 'Received' ? 'bg-purple-100 text-purple-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  Status: {repairOrder.status}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-900">TASAVIA</div>
            <div className="text-slate-600">
              Aircraft Parts & Services
            </div>
          </div>
        </div>

        {/* Vendor Information */}
        <div className="mb-8">
          <div className="bg-slate-50 p-4 rounded">
            <div className="font-semibold text-slate-900 mb-2">Repair Vendor:</div>
            <div className="font-bold">{repairOrder.companies.company_name}</div>
            <div className="text-slate-600">({repairOrder.companies.company_code})</div>
            <div className="text-slate-600 whitespace-pre-line mt-1">
              {formatAddress(repairOrder.companies)}
            </div>
            {repairOrder.companies.phone && (
              <div className="text-slate-600 mt-1">Tel: {repairOrder.companies.phone}</div>
            )}
            {repairOrder.companies.email && (
              <div className="text-slate-600">Email: {repairOrder.companies.email}</div>
            )}
          </div>
        </div>

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
                    {item.inventory.condition && (
                      <div className="text-sm text-slate-600">Condition: {item.inventory.condition}</div>
                    )}
                  </td>
                  <td className="border border-slate-300 p-3 font-mono">
                    {item.inventory.serial_number || 'N/A'}
                  </td>
                  <td className="border border-slate-300 p-3 text-center">
                    {item.inventory.quantity}
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

        {/* Cost Summary */}
        <div className="flex justify-end mb-8">
          <div className="w-64">
            <div className="bg-slate-50 p-4 rounded">
              <div className="flex justify-between py-2 font-bold text-lg border-t border-slate-300">
                <span>Total Estimated Cost ({repairOrder.currency}):</span>
                <span>${repairOrder.total_cost.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

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

        {/* Signature Section */}
        <div className="border-2 border-slate-400 p-6 mb-8">
          <h3 className="font-bold text-slate-900 mb-4 text-center">AUTHORIZATION</h3>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="mb-4">
                <div className="font-semibold">Authorized by (Customer):</div>
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
                <div className="font-semibold">Accepted by (Vendor):</div>
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
          <div>This repair order was generated on {format(new Date(), 'PPP')} by TASAVIA</div>
          <div className="mt-1">Repair Order Number: {repairOrder.repair_order_number}</div>
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