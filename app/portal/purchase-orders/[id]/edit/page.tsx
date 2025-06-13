import { supabase } from '@/lib/supabase'
import PurchaseOrderEditClientPage from './PurchaseOrderEditClientPage'

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

interface PurchaseOrderEditPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function PurchaseOrderEditPage({ params }: PurchaseOrderEditPageProps) {
  const resolvedParams = await params
  return <PurchaseOrderEditClientPage poId={resolvedParams.id} />
}