import { supabase } from '@/lib/supabase/server'
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
  params: Promise<{
    id: string
  }>
}

export default async function PurchaseOrderPdfPage({ params }: PurchaseOrderPdfPageProps) {
  const resolvedParams = await params
  return <PurchaseOrderPdfClientPage poId={resolvedParams.id} />
}