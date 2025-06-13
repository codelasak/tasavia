import PurchaseOrderEditClientPage from './PurchaseOrderEditClientPage'

interface PurchaseOrderEditPageProps {
  params: {
    id: string
  }
}

export default function PurchaseOrderEditPage({ params }: PurchaseOrderEditPageProps) {
  return <PurchaseOrderEditClientPage poId={params.id} />
}