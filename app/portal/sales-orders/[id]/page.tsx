import { supabase } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import SalesOrderViewClientPage from './SalesOrderViewClientPage'

export const dynamic = 'force-dynamic'

interface SalesOrderViewPageProps {
  params: {
    id: string
  }
}

async function fetchSalesOrder(id: string) {
  try {
    const { data, error } = await supabase
      .from('sales_orders')
      .select(`
        *,
        my_companies(*),
        companies(*),
        terms_and_conditions(title, version),
        sales_order_items(
          *,
          inventory(
            *,
            pn_master_table(pn, description)
          )
        )
      `)
      .eq('sales_order_id', id)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching sales order:', error)
    return null
  }
}

export default async function SalesOrderViewPage({ params }: SalesOrderViewPageProps) {
  const salesOrder = await fetchSalesOrder(params.id)

  if (!salesOrder) {
    notFound()
  }

  return <SalesOrderViewClientPage salesOrder={salesOrder} />
}