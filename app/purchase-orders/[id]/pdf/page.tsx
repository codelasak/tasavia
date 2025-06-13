import { supabase } from '@/lib/supabase'
import PurchaseOrderPdfClientPage from './PurchaseOrderPdfClientPage'

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

interface PurchaseOrderPdfPageProps {
  params: {
    id: string
  }
}

export default function PurchaseOrderPdfPage({ params }: PurchaseOrderPdfPageProps) {
  return <PurchaseOrderPdfClientPage poId={params.id} />
}