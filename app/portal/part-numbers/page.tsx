import { createSupabaseServer } from '@/lib/supabase/server'
import { Database } from '@/lib/supabase/database.types'
import PartNumbersList from './part-numbers-list'

export const dynamic = 'force-dynamic'

type PartNumber = Database['public']['Tables']['pn_master_table']['Row']

async function getPartNumbers() {
  const supabase = createSupabaseServer()
  const { data, error } = await supabase
    .from('pn_master_table')
    .select('*')
    .order('pn')

  if (error) {
    console.error('Error fetching part numbers:', error)
    return []
  }
  return (data as any) || []
}

export default async function PartNumbersPage() {
  const partNumbers = await getPartNumbers()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-4 pb-4">
        <h1 className="text-2xl font-bold text-slate-900">Part Numbers</h1>
      </div>
      <PartNumbersList initialPartNumbers={partNumbers} />
    </div>
  )
}