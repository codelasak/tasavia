import MyCompaniesList from './my-companies-list'
import { getInternalCompaniesServer } from '@/lib/services/company-service.server'

export const dynamic = 'force-dynamic'

export default async function MyCompaniesPage() {
  const companies = await getInternalCompaniesServer()

  return (
    <div className="space-y-4 px-2 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-900">My Companies</h1>
      </div>
      <MyCompaniesList initialCompanies={companies} />
    </div>
  )
}