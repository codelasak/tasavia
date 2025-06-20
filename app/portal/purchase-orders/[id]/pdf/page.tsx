import { supabase } from '@/lib/supabase/server'
import PurchaseOrderPdfClientPage from './PurchaseOrderPdfClientPage'

export async function generateStaticParams() {
  // Skip static generation for dynamic routes that require authentication
  // These pages will be generated on-demand
  return []
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