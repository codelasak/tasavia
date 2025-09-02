import { createSupabaseServer } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import SalesOrderViewClientPage from './SalesOrderViewClientPage'

export const dynamic = 'force-dynamic'

interface SalesOrderViewPageProps {
  params: {
    id: string
  }
}

export default async function SalesOrderViewPage({ params }: SalesOrderViewPageProps) {
  const supabase = createSupabaseServer()

  // Fetch sales order with related items and terms (no my_companies join)
  const { data: salesOrder, error } = await supabase
    .from('sales_orders')
    .select(`
      *,
      terms_and_conditions(title, version),
      sales_order_items(
        *,
        inventory(
          *,
          pn_master_table(pn, description)
        )
      )
    `)
    .eq('sales_order_id', params.id as any)
    .single()

  if (error || !salesOrder) {
    console.error('Error fetching sales order:', error)
    notFound()
  }

  // Fetch seller and customer companies separately and enrich to expected shape
  const [sellerCompanyResult, customerCompanyResult] = await Promise.all([
    supabase.from('companies').select('company_id, company_name, company_code').eq('company_id', (salesOrder as any).company_id).single(),
    supabase.from('companies').select('company_id, company_name, company_code').eq('company_id', (salesOrder as any).customer_company_id).single()
  ])

  const enriched = {
    ...salesOrder,
    my_companies: sellerCompanyResult.data ? {
      my_company_name: sellerCompanyResult.data.company_name,
      my_company_code: sellerCompanyResult.data.company_code,
      bank_details: null,
    } : null,
    companies: customerCompanyResult.data ? {
      company_name: customerCompanyResult.data.company_name,
      company_code: customerCompanyResult.data.company_code,
    } : null,
  }

  return <SalesOrderViewClientPage salesOrder={enriched as any} />
}
