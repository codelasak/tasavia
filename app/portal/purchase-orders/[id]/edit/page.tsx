import { createSupabaseServer } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PurchaseOrderEditClientPage from './PurchaseOrderEditClientPage'

export const dynamic = 'force-dynamic'

interface PurchaseOrderEditPageProps {
  params: {
    id: string
  }
}

async function getEditPageData(poId: string) {
  const supabase = createSupabaseServer()
  
  try {
    // Fetch all data in parallel with simple structure
    const [
      purchaseOrderResult,
      poItemsResult,
      companiesResult,
      partNumbersResult,
      shipViaResult
    ] = await Promise.all([
      // Purchase order basic data
      supabase
        .from('purchase_orders')
        .select('*')
        .eq('po_id', poId)
        .single(),
        
      // PO items with part number reference
      supabase
        .from('po_items')
        .select(`
          *,
          pn_master_table (pn_id, pn, description)
        `)
        .eq('po_id', poId)
        .order('line_number'),
        
      // All companies with related data
      supabase
        .from('companies')
        .select(`
          *,
          company_addresses(*),
          company_contacts(*)
        `)
        .order('company_name'),
        
      // Part numbers
      supabase
        .from('pn_master_table')
        .select('pn_id, pn, description')
        .order('pn'),
        
      // Ship via options
      supabase
        .from('company_ship_via')
        .select('*')
        .order('ship_company_name')
    ])

    // Check for errors
    if (purchaseOrderResult.error) {
      console.error('PO fetch error:', purchaseOrderResult.error)
      throw new Error(`Failed to fetch purchase order: ${purchaseOrderResult.error.message}`)
    }
    
    if (!purchaseOrderResult.data) {
      throw new Error('Purchase order not found')
    }

    if (poItemsResult.error) {
      console.error('PO items error:', poItemsResult.error)
      throw new Error(`Failed to fetch PO items: ${poItemsResult.error.message}`)
    }

    if (companiesResult.error) {
      console.error('Companies error:', companiesResult.error)
      throw new Error(`Failed to fetch companies: ${companiesResult.error.message}`)
    }

    if (partNumbersResult.error) {
      console.error('Part numbers error:', partNumbersResult.error)
      throw new Error(`Failed to fetch part numbers: ${partNumbersResult.error.message}`)
    }

    if (shipViaResult.error) {
      console.error('Ship via error:', shipViaResult.error)
      throw new Error(`Failed to fetch ship via options: ${shipViaResult.error.message}`)
    }

    // Separate companies by type (minimal processing)
    const companies = companiesResult.data || []
    const myCompanies = companies.filter(c => c.is_self === true)
    const externalCompanies = companies.filter(c => c.is_self !== true)

    return {
      purchaseOrder: purchaseOrderResult.data,
      items: poItemsResult.data || [],
      myCompanies,
      externalCompanies,
      partNumbers: partNumbersResult.data || [],
      shipViaList: shipViaResult.data || []
    }
  } catch (error) {
    console.error('Failed to fetch edit page data:', error)
    throw error
  }
}

export default async function PurchaseOrderEditPage({ params }: PurchaseOrderEditPageProps) {
  try {
    const data = await getEditPageData(params.id)

    // Validate required data
    if (!data.myCompanies.length) {
      throw new Error('No internal companies configured')
    }

    console.log('Purchase order edit page data loaded:', {
      poId: params.id,
      poNumber: data.purchaseOrder.po_number,
      myCompanies: data.myCompanies.length,
      externalCompanies: data.externalCompanies.length,
      items: data.items.length,
      partNumbers: data.partNumbers.length,
      shipViaOptions: data.shipViaList.length
    })

    return (
      <PurchaseOrderEditClientPage
        poId={params.id}
        initialData={data}
      />
    )
  } catch (error) {
    console.error('Failed to load purchase order edit page:', error)
    if ((error as any)?.message?.includes('not found')) {
      notFound()
    }
    throw error
  }
}
