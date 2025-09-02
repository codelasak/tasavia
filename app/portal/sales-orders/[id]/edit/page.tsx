import { createSupabaseServer } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import SalesOrderEditClientPage from './SalesOrderEditClientPage'

export const dynamic = 'force-dynamic'

interface SalesOrderEditPageProps {
  params: {
    id: string
  }
}

async function getSalesOrderData(salesOrderId: string) {
  const supabase = createSupabaseServer()
  try {
    // Fetch sales order data with related information
    const { data: salesOrderData, error: salesOrderError } = await supabase
      .from('sales_orders')
      .select(`
        *,
        terms_and_conditions(*)
      `)
      .eq('sales_order_id', salesOrderId as any)
      .single()

    if (salesOrderError) {
      return null
    }

    // Fetch company data separately
    const [sellerCompanyResult, customerCompanyResult] = await Promise.all([
      supabase.from('companies').select('*').eq('company_id', salesOrderData.company_id).single(),
      supabase.from('companies').select('*').eq('company_id', salesOrderData.customer_company_id).single()
    ])

    // Enrich sales order with company data for compatibility
    const enrichedSalesOrderData = {
      ...salesOrderData,
      // Add legacy field for compatibility
      my_company_id: salesOrderData.company_id,
      // Add company objects for compatibility
      my_companies: sellerCompanyResult.data,
      companies: customerCompanyResult.data
    }

    // Fetch sales order items with inventory and part number details
    const { data: itemsData, error: itemsError } = await supabase
      .from('sales_order_items')
      .select(`
        *,
        inventory(
          *,
          pn_master_table(
            pn_id,
            pn,
            description
          )
        )
      `)
      .eq('sales_order_id', salesOrderId as any)
      .order('line_number')

    if (itemsError) {
      return null
    }

    return {
      salesOrder: enrichedSalesOrderData,
      items: itemsData || []
    }
  } catch (error) {
    return null
  }
}

async function getEditFormData() {
  const supabase = createSupabaseServer()
  const [myCompaniesResult, customersResult, inventoryResult, termsResult] = await Promise.all([
    supabase
      .from('companies')
      .select('my_company_id:company_id, my_company_name:company_name, my_company_code:company_code')
      .eq('is_self', true)
      .order('company_name'),
    supabase.from('companies').select('*, customer_number').neq('is_self', true).order('company_name'),
    supabase.from('inventory')
      .select(`
        *,
        pn_master_table(pn, description)
      `)
      .in('status', ['Available'] as any)
      .order('pn_master_table(pn)'),
    supabase.from('terms_and_conditions').select('*').eq('is_active', true as any).order('title')
  ])

  if (myCompaniesResult.error) throw myCompaniesResult.error
  if (customersResult.error) throw customersResult.error
  if (inventoryResult.error) throw inventoryResult.error
  if (termsResult.error) throw termsResult.error

  return {
    myCompanies: (myCompaniesResult.data || []) as any,
    customers: (customersResult.data || []) as any,
    inventoryItems: (inventoryResult.data || []) as any,
    termsAndConditions: (termsResult.data || []) as any,
  }
}

export default async function SalesOrderEditPage({ params }: SalesOrderEditPageProps) {
  const [salesOrderData, formData] = await Promise.all([
    getSalesOrderData(params.id),
    getEditFormData()
  ])

  if (!salesOrderData) {
    notFound()
  }

  return (
    <SalesOrderEditClientPage
      salesOrderId={params.id}
      initialSalesOrder={salesOrderData.salesOrder}
      initialItems={salesOrderData.items}
      myCompanies={formData.myCompanies}
      customers={formData.customers}
      inventoryItems={formData.inventoryItems}
      termsAndConditions={formData.termsAndConditions}
    />
  )
}
