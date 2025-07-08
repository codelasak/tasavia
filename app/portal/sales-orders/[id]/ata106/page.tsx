import { supabase } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ATA106ClientPage from './ATA106ClientPage'

export const dynamic = 'force-dynamic'

interface ATA106PageProps {
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

export default async function ATA106Page({ params }: ATA106PageProps) {
  const salesOrder = await fetchSalesOrder(params.id)

  if (!salesOrder) {
    notFound()
  }

  return <ATA106ClientPage salesOrder={salesOrder} />
}