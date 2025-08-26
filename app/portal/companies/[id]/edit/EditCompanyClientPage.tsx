'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { CompanyForm } from '@/components/companies/CompanyForm'
import { toast } from 'sonner'

interface EditCompanyClientPageProps {
  companyId: string
}

type ExternalCompany = {
  company_id?: string
  company_name: string
  company_code?: string | null
  company_type?: string | null
  created_at?: string | null
  updated_at?: string | null
  company_contacts?: Array<{
    contact_id?: string
    contact_name: string | null
    email?: string | null
    phone?: string | null
    role?: string | null
  }>
  company_addresses?: Array<{
    address_id?: string
    address_line1: string
    address_line2?: string | null
    city?: string | null
    country?: string | null
    zip_code?: string | null
    is_primary?: boolean | null
  }>
}

export default function EditCompanyClientPage({ companyId }: EditCompanyClientPageProps) {
  const [company, setCompany] = useState<ExternalCompany | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        // Fetch the company
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('company_id', companyId)
          .or('is_self.is.false,is_self.is.null') // Only external companies
          .single()

        if (companyError) {
          if (companyError.code === 'PGRST116') {
            setError('Company not found')
            return
          }
          throw companyError
        }

        // Fetch addresses
        const { data: addressData } = await supabase
          .from('company_addresses')
          .select('*')
          .eq('company_id', companyId)

        // Fetch contacts
        const { data: contactData } = await supabase
          .from('company_contacts')
          .select('*')
          .eq('company_id', companyId)

        // Combine the data
        const companyWithRelations: ExternalCompany = {
          ...companyData,
          company_addresses: addressData || [],
          company_contacts: contactData || []
        }

        setCompany(companyWithRelations)
      } catch (error: any) {
        console.error('Error fetching company:', error)
        setError(error.message || 'Failed to load company')
        toast.error('Failed to load company')
      } finally {
        setLoading(false)
      }
    }

    fetchCompany()
  }, [companyId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading company...</p>
        </div>
      </div>
    )
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-4">{error || 'Company not found'}</div>
          <button
            onClick={() => router.push('/portal/companies')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Back to Companies
          </button>
        </div>
      </div>
    )
  }

  return (
    <CompanyForm 
      company={company} 
      type="external_company" 
      mode="edit" 
    />
  )
}