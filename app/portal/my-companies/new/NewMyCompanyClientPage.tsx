'use client'

import { CompanyForm } from '@/components/companies/CompanyForm'

export default function NewMyCompanyClientPage() {
  return (
    <CompanyForm 
      type="my_company" 
      mode="create" 
    />
  )
}