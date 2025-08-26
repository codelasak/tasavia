'use client'

import { CompanyForm } from '@/components/companies/CompanyForm'

export default function NewCompanyClientPage() {
  return (
    <CompanyForm 
      type="external_company" 
      mode="create" 
    />
  )
}