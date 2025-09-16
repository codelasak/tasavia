import { createSupabaseServer } from '@/lib/supabase/server'
import { Database } from '@/lib/supabase/database.types'

export interface PurchaseOrderWithDetails {
  po_id: string
  po_number: string
  po_date: string
  company_id: string
  vendor_company_id: string
  currency: string
  status: string
  total_amount: number | null
  payment_term: string | null
  freight_charge: number | null
  misc_charge: number | null
  vat_percentage: number | null
  awb_no: string | null
  remarks_1: string | null
  remarks_2: string | null
  aviation_compliance_notes: string | null
  origin_country_code: string | null
  end_use_country_code: string | null
  traceable_to_airline: string | null
  traceable_to_msn: string | null
  last_certificate: string | null
  certificate_expiry_date: string | null
  ship_via_id: string | null
  company_ship_via?: {
    ship_company_name: string
    ship_model: string | null
  } | null
  // Related data
  companies: {
    company_id: string
    company_name: string
    company_code: string | null
    company_type: string | null
  }
}

export interface InheritedPOData {
  vendor_company_id: string
  currency: string
  origin_country_code: string | null
  end_use_country_code: string | null
  traceable_to_airline: string | null
  traceable_to_msn: string | null
  aviation_compliance_notes: string | null
  last_certificate: string | null
  certificate_expiry_date: string | null
}

/**
 * Fetch purchase orders that can be referenced for repair orders
 * Only returns completed POs
 */
export async function getAvailablePurchaseOrdersForRO(): Promise<PurchaseOrderWithDetails[]> {
  const supabase = createSupabaseServer()

  const { data, error } = await supabase
    .from('purchase_orders')
    .select(`
      po_id,
      po_number,
      po_date,
      company_id,
      vendor_company_id,
      currency,
      status,
      total_amount,
      payment_term,
      freight_charge,
      misc_charge,
      vat_percentage,
      awb_no,
      remarks_1,
      remarks_2,
      aviation_compliance_notes,
      origin_country_code,
      end_use_country_code,
      traceable_to_airline,
      traceable_to_msn,
      last_certificate,
      certificate_expiry_date,
      ship_via_id,
      company_ship_via:company_ship_via!purchase_orders_ship_via_id_fkey (
        ship_company_name,
        ship_model
      ),
      companies!purchase_orders_vendor_company_id_fkey (
        company_id,
        company_name,
        company_code,
        company_type
      )
    `)
    .eq('status', 'Completed')
    .order('po_date', { ascending: false })

  if (error) {
    console.error('Error fetching available purchase orders:', error)
    throw new Error('Failed to fetch purchase orders')
  }

  return (data || []) as unknown as PurchaseOrderWithDetails[]
}

/**
 * Get a specific purchase order with details for repair order inheritance
 */
export async function getPurchaseOrderForInheritance(poId: string): Promise<PurchaseOrderWithDetails | null> {
  const supabase = createSupabaseServer()

  const { data, error } = await supabase
    .from('purchase_orders')
    .select(`
      po_id,
      po_number,
      po_date,
      company_id,
      vendor_company_id,
      currency,
      status,
      total_amount,
      payment_term,
      freight_charge,
      misc_charge,
      vat_percentage,
      awb_no,
      remarks_1,
      remarks_2,
      aviation_compliance_notes,
      origin_country_code,
      end_use_country_code,
      traceable_to_airline,
      traceable_to_msn,
      last_certificate,
      certificate_expiry_date,
      ship_via_id,
      company_ship_via:company_ship_via!purchase_orders_ship_via_id_fkey (
        ship_company_name,
        ship_model
      ),
      companies!purchase_orders_vendor_company_id_fkey (
        company_id,
        company_name,
        company_code,
        company_type
      ),
      purchase_order_items (
        po_item_id,
        pn_id,
        condition,
        sn,
        quantity,
        unit_price,
        pn_master_table (pn, description)
      ),
      inventory (
        inventory_id,
        pn_id,
        sn,
        condition,
        status,
        location,
        traceability_source,
        traceable_to,
        last_certified_agency,
        part_status_certification,
        pn_master_table (pn, description)
      )
    `)
    .eq('po_id', poId)
    .eq('status', 'Completed')
    .single()

  if (error) {
    console.error('Error fetching purchase order for inheritance:', error)
    return null
  }

  return (data as unknown as PurchaseOrderWithDetails)
}

/**
 * Extract inheritable data from a purchase order for repair order creation
 */
export function extractInheritedPOData(po: PurchaseOrderWithDetails): InheritedPOData {
  return {
    vendor_company_id: po.vendor_company_id,
    currency: po.currency,
    origin_country_code: po.origin_country_code,
    end_use_country_code: po.end_use_country_code,
    traceable_to_airline: po.traceable_to_airline,
    traceable_to_msn: po.traceable_to_msn,
    aviation_compliance_notes: po.aviation_compliance_notes,
    last_certificate: po.last_certificate,
    certificate_expiry_date: po.certificate_expiry_date
  }
}

/**
 * Search purchase orders by number or vendor name
 */
export async function searchPurchaseOrdersForRO(query: string): Promise<PurchaseOrderWithDetails[]> {
  const supabase = createSupabaseServer()

  const { data, error } = await supabase
    .from('purchase_orders')
    .select(`
      po_id,
      po_number,
      po_date,
      vendor_company_id,
      currency,
      status,
      total_amount,
      aviation_compliance_notes,
      origin_country_code,
      end_use_country_code,
      traceable_to_airline,
      traceable_to_msn,
      last_certificate,
      certificate_expiry_date,
      companies!purchase_orders_vendor_company_id_fkey (
        company_id,
        company_name,
        company_code,
        company_type
      ),
      purchase_order_items (
        po_item_id,
        pn_id,
        condition,
        sn,
        quantity,
        unit_price,
        pn_master_table (pn, description)
      ),
      inventory (
        inventory_id,
        pn_id,
        sn,
        condition,
        status,
        location,
        traceability_source,
        traceable_to,
        last_certified_agency,
        part_status_certification,
        pn_master_table (pn, description)
      )
    `)
    .eq('status', 'Completed')
    .or(`po_number.ilike.%${query}%,companies.company_name.ilike.%${query}%`)
    .order('po_date', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Error searching purchase orders:', error)
    throw new Error('Failed to search purchase orders')
  }

  return (data || []) as unknown as PurchaseOrderWithDetails[]
}
