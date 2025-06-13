import { supabase } from '@/lib/supabase'
import PurchaseOrderViewClientPage from './PurchaseOrderViewClientPage'

export async function generateStaticParams() {
  try {
    const { data: purchaseOrders, error } = await supabase
      .from('purchase_orders')
      .select('po_id')

    if (error) {
      console.error('Error fetching purchase orders for static generation:', error)
      return []
    }

    return purchaseOrders.map((po) => ({
      id: po.po_id,
    }))
  } catch (error) {
    console.error('Error in generateStaticParams:', error)
    return []
  }
}

interface PurchaseOrderPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function PurchaseOrderPage({ params }: PurchaseOrderPageProps) {
  const resolvedParams = await params
  return <PurchaseOrderViewClientPage poId={resolvedParams.id} />
}