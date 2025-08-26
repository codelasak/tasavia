import { Suspense } from 'react'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import EditMyCompanyClientPage from './EditMyCompanyClientPage'

export const metadata: Metadata = {
  title: 'Edit My Company | TASAVIA Portal',
  description: 'Edit internal company information',
}

interface EditMyCompanyPageProps {
  params: {
    id: string
  }
}

export default function EditMyCompanyPage({ params }: EditMyCompanyPageProps) {
  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(params.id)) {
    notFound()
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading company form...</p>
        </div>
      </div>
    }>
      <EditMyCompanyClientPage companyId={params.id} />
    </Suspense>
  )
}