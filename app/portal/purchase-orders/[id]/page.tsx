import { supabase } from '@/lib/supabase/server'
import PurchaseOrderViewClientPage from './PurchaseOrderViewClientPage'

interface PurchaseOrderPageProps {
  params: {
    id: string
  }
}

export default async function PurchaseOrderPage({ params }: PurchaseOrderPageProps) {
  return <PurchaseOrderViewClientPage poId={params.id} />
}