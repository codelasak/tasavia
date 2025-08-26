import { Suspense } from 'react'
import { Metadata } from 'next'
import NewMyCompanyClientPage from './NewMyCompanyClientPage'

export const metadata: Metadata = {
  title: 'New My Company | TASAVIA Portal',
  description: 'Create a new internal company',
}

export default function NewMyCompanyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading company form...</p>
        </div>
      </div>
    }>
      <NewMyCompanyClientPage />
    </Suspense>
  )
}