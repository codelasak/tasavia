'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import PDFLayout from '@/components/pdf/PDFLayout'
import PDFFooter from '@/components/pdf/PDFFooter'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth/AuthProvider'
import Image from 'next/image'

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
  const [overrides, setOverrides] = useState<any | null>(null)

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

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(`ro_pdf_overrides_${params.id}`) : null
      if (raw) setOverrides(JSON.parse(raw))
    } catch {}
  }, [params.id])

  const handleDownload = () => {
    window.print()
  }

  // legacy util kept for compatibility (unused in new template)
  const formatAddress = (company: any) => {
    if (!company.company_addresses || company.company_addresses.length === 0) return ''
    const a = company.company_addresses[0]
    return [a.address_line1, a.address_line2, a.city, a.zip_code, a.country].filter(Boolean).join(', ')
  }

  // Precompute recipient blocks safely for hook rules
  const toBlock = useMemo(() => {
    if (!repairOrder) return { company_name: null as any, address: undefined as any }
    const addr = (repairOrder.companies.company_addresses?.[0] || null) as any
    return {
      company_name: repairOrder.companies.company_name,
      address: addr ? {
        line1: addr.address_line1 || undefined,
        line2: addr.address_line2 || undefined,
        city: addr.city || undefined,
        postal_code: addr.zip_code || undefined,
        country: addr.country || undefined
      } : undefined
    }
  }, [repairOrder])
  const shipToBlock = toBlock

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

  // Derive recipient blocks for new RO template
  // Moved above to satisfy React hook rules

  // Map items to RO table shape and pull basic packing slip info
  const items = repairOrder.repair_order_items
    .sort((a, b) => a.line_number - b.line_number)
    .map((it) => ({
      line_number: it.line_number,
      description: it.inventory.pn_master_table.description || undefined,
      pn: it.inventory.pn_master_table.pn,
      sn: (it.inventory as any).sn || undefined,
      workscope: it.workscope,
      price: it.estimated_cost ?? 'TBD'
    }))

  const firstOrigin = repairOrder.repair_order_items.find(i => i.inventory.country_of_origin)?.inventory.country_of_origin || null

  return (
    <PDFLayout 
      title="Repair Order PDF" 
      documentNumber={repairOrder.repair_order_number}
      onDownload={handleDownload}
    >
      {/* Header: Logo + TASAVIA info (left), RO meta (right) */}
      <div className="grid grid-cols-2 gap-4 border border-slate-300 mb-4">
        <div className="p-4">
          <div className="mb-2">
            <Image src="/tasavia-logo-black.png" alt="TASAVIA" width={220} height={80} className="w-auto h-16" />
          </div>
          <div className="text-sm">
            <div className="font-bold text-slate-900">TASAVIA LLC</div>
            <div className="text-slate-900">18815 LANTERN COVE LN TOMBALL TX 77375 USA</div>
            <div className="text-slate-900">sales@tasavia.com</div>
          </div>
        </div>
        <div className="p-4 border-l border-slate-300">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold">REPAIR ORDER NO:</span>
              <span className="font-extrabold text-slate-900 text-lg">{repairOrder.repair_order_number}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">DATE</span>
              <span className="font-extrabold text-slate-900">{new Date(repairOrder.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">SHIP INVOICE</span>
              <span className="font-extrabold text-slate-900">{overrides?.shipInvoiceNumber || `RO${repairOrder.repair_order_number.replace(/^[^0-9]*/, '')}`}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recipients: TO and SHIP TO/CONSIGNEE */}
      <div className="grid grid-cols-2 gap-4 border border-slate-300 mb-4">
        <div className="p-3">
          <div className="border-b border-slate-300 pb-1 mb-2 text-sm">
            <span className="font-semibold">TO :</span>
            <span className="font-bold text-slate-900"> {toBlock.company_name || '—'}</span>
          </div>
          <div className="text-sm text-slate-900 whitespace-pre-line leading-5">
            {toBlock.address?.line1 || ''}
            {toBlock.address?.line2 ? `\n${toBlock.address.line2}` : ''}
            {(toBlock.address?.city || toBlock.address?.postal_code || toBlock.address?.country) ? `\n${[toBlock.address?.city, toBlock.address?.postal_code].filter(Boolean).join(' ')}` : ''}
            {toBlock.address?.country ? ` ${toBlock.address.country}` : ''}
          </div>
        </div>
        <div className="p-3 border-l border-slate-300">
          <div className="border-b border-slate-300 pb-1 mb-2 text-sm">
            <span className="font-semibold">SHIP TO/ CONSIGNEE:</span>
            <span className="font-bold text-slate-900"> {shipToBlock.company_name || '—'}</span>
          </div>
          <div className="text-sm text-slate-900 whitespace-pre-line leading-5">
            {shipToBlock.address?.line1 || ''}
            {shipToBlock.address?.line2 ? `\n${shipToBlock.address.line2}` : ''}
            {(shipToBlock.address?.city || shipToBlock.address?.postal_code || shipToBlock.address?.country) ? `\n${[shipToBlock.address?.city, shipToBlock.address?.postal_code].filter(Boolean).join(' ')}` : ''}
            {shipToBlock.address?.country ? ` ${shipToBlock.address.country}` : ''}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="border border-slate-300 mb-4">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-200 text-slate-900">
              <th className="border border-slate-300 p-2 text-left w-12">ITEM</th>
              <th className="border border-slate-300 p-2 text-left">DESCRIPTION</th>
              <th className="border border-slate-300 p-2 text-left w-40">P/N</th>
              <th className="border border-slate-300 p-2 text-left w-32">S/N</th>
              <th className="border border-slate-300 p-2 text-left w-32">WORKSCOPE</th>
              <th className="border border-slate-300 p-2 text-right w-32">PRICE</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row: any, idx: number) => {
              const renderPrice = (v: any) => v === undefined || v === null || v === '' ? '—' : (typeof v === 'number' ? v.toFixed(2) : v)
              return (
                <tr key={idx}>
                  <td className="border border-slate-300 p-2 font-semibold">{row.line_number || idx + 1}</td>
                  <td className="border border-slate-300 p-2 text-sm">{row.description ? <span className="text-slate-900 font-semibold">{row.description}</span> : ''}</td>
                  <td className="border border-slate-300 p-2 font-mono text-sm font-bold text-slate-900">{row.pn || ''}</td>
                  <td className="border border-slate-300 p-2 font-mono text-sm text-slate-900">{row.sn || ''}</td>
                  <td className="border border-slate-300 p-2 text-sm text-slate-900">{row.workscope || ''}</td>
                  <td className="border border-slate-300 p-2 text-right text-sm">{renderPrice(row.price)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Certification Requirements */}
      <div className="border border-slate-300 mb-4">
        <div className="bg-slate-200 font-bold text-slate-900 text-sm p-2 text-center">CERTIFICATION REQUIREMENTS: TCCA RELEASE</div>
        <div className="p-3 text-xs leading-relaxed">
          PART OR MATERIAL DECLARATION: NONE OF THE ABOVE PARTS HAVE BEEN SUBJECTED TO SEVERE STRESS OR HEAT (AS IN A MAJOR ENGINE FAILURE, ACCIDENT, INCIDENT OR FIRE). WE CERTIFY THAT EACH ARTICLE ORDERED IS NOT OF U.S. GOVERNMENT OR MILITARY SURPLUS ORIGIN.
        </div>
      </div>

      {/* Packing Slip */}
      <div className="border border-slate-300 mb-4">
        <div className="bg-slate-200 font-bold text-slate-900 text-sm p-2 text-center">PACKING SLIP</div>
        <table className="w-full text-sm">
          <tbody>
            <tr>
              <td className="border border-slate-300 p-2 w-1/2">End-Use / Buyer Country</td>
              <td className="border border-slate-300 p-2 text-slate-900 font-semibold">{overrides?.endUseCountry || '—'}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2">Country of Origin</td>
              <td className="border border-slate-300 p-2 text-slate-900 font-semibold">{overrides?.countryOfOrigin || firstOrigin || '—'}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2">Freighter AWB #</td>
              <td className="border border-slate-300 p-2">{overrides?.freighterAwb || ''}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2">Dimensions || L W H || Gr.wgt/ Kgs</td>
              <td className="border border-slate-300 p-2 whitespace-pre-line">{overrides?.dimensionsNote || ''}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Remarks + Financial Summary */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-sm">
          <div className="font-bold text-slate-900 mb-1">REMARKS:</div>
          <div className="whitespace-pre-line text-slate-700 min-h-[4rem]">{repairOrder.remarks || '—'}</div>
        </div>
        <div className="text-sm">
          <table className="w-full">
            <tbody>
              <tr>
                <td className="py-1">Sub Total</td>
                <td className="py-1 text-right">: {(overrides?.subtotal ?? repairOrder.total_cost)?.toFixed ? (overrides?.subtotal ?? repairOrder.total_cost).toFixed(2) : '-'} {(overrides?.currency ?? repairOrder.currency) || 'USD'}</td>
              </tr>
              <tr>
                <td className="py-1">Misc Charge</td>
                <td className="py-1 text-right">: {overrides?.miscCharge?.toFixed ? overrides.miscCharge.toFixed(2) : '-'} {(overrides?.currency ?? repairOrder.currency) || 'USD'}</td>
              </tr>
              <tr>
                <td className="py-1">Freight/ Forwarding</td>
                <td className="py-1 text-right">: {overrides?.freightCharge?.toFixed ? overrides.freightCharge.toFixed(2) : '-'} {(overrides?.currency ?? repairOrder.currency) || 'USD'}</td>
              </tr>
              <tr>
                <td className="py-1">VAT ({overrides?.vatPercentage ?? 0}%)</td>
                <td className="py-1 text-right">: {overrides?.vatAmount?.toFixed ? overrides.vatAmount.toFixed(2) : '-'} {(overrides?.currency ?? repairOrder.currency) || 'USD'}</td>
              </tr>
              <tr className="border-top border-slate-300">
                <td className="py-2 font-bold">Total NET</td>
                <td className="py-2 text-right font-bold">: {(overrides?.totalNet ?? repairOrder.total_cost)?.toFixed ? (overrides?.totalNet ?? repairOrder.total_cost).toFixed(2) : '-'} {(overrides?.currency ?? repairOrder.currency) || 'USD'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Signature row */}
      <div className="grid grid-cols-2 gap-4 border border-slate-300 p-3 mb-4">
        <div>
          <div className="text-sm">Authorized Sign:</div>
          <div className="mt-2">
            <Image src="/signature.png" alt="Authorized Signature" width={180} height={80} className="w-auto h-16 object-contain" />
          </div>
          <div className="mt-2 border-t border-slate-300 w-64" />
        </div>
        <div className="text-right">
          <div className="text-sm italic text-slate-600">Confirmation:</div>
          <div className="mt-8 border-t border-slate-300 ml-auto w-64" />
        </div>
      </div>

      <PDFFooter
        documentType="Repair Order"
        documentNumber={repairOrder.repair_order_number}
        status={repairOrder.status}
      />
    </PDFLayout>
  )
}
