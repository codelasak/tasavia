import { createSupabaseServer } from '@/lib/supabase/server'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import { redirect } from 'next/navigation'

interface DashboardStats {
  totalCompanies: number
  totalParts: number
  totalPOs: number
  totalInventoryValue: number
  recentPOs: number
  pendingPOs: number
}

export default async function DashboardPage() {
  const supabase = createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }
  
  const stats: DashboardStats = await fetchDashboardStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
      </div>
      
      <DashboardClient initialStats={stats} />
    </div>
  );
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  const supabase = createSupabaseServer()
  try {
    // Get companies count (internal + external companies from unified table)
    const [internalCompaniesResult, externalCompaniesResult, partsResult, posResult, inventoryResult] = await Promise.all([
      supabase.from('companies').select('company_id', { count: 'exact', head: true }).eq('is_self', true),
      supabase.from('companies').select('company_id', { count: 'exact', head: true }).neq('is_self', true),
      supabase.from('pn_master_table').select('pn_id', { count: 'exact', head: true }),
      supabase.from('purchase_orders').select('total_amount, status, created_at'),
      supabase.from('inventory').select('total_value')
    ])

    const totalCompanies = (internalCompaniesResult.count || 0) + (externalCompaniesResult.count || 0)
    const totalParts = partsResult.count || 0
    const totalPOs = posResult.data?.length || 0
    
    // Calculate inventory value
    const totalInventoryValue = inventoryResult.data?.reduce((sum, item: any) => sum + (item.total_value || 0), 0) || 0
    
    // Calculate recent POs (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentPOs = posResult.data?.filter((po: any) => po.created_at && new Date(po.created_at) >= thirtyDaysAgo).length || 0
    
    // Calculate pending POs
    const pendingPOs = posResult.data?.filter((po: any) => po.status === 'Draft' || po.status === 'Sent').length || 0

    return {
      totalCompanies,
      totalParts,
      totalPOs,
      totalInventoryValue,
      recentPOs,
      pendingPOs
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return {
      totalCompanies: 0,
      totalParts: 0,
      totalPOs: 0,
      totalInventoryValue: 0,
      recentPOs: 0,
      pendingPOs: 0
    }
  }
}