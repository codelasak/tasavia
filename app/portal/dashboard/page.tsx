import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Package, ShoppingCart, BarChart3, DollarSign, TrendingUp } from 'lucide-react'
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

  return <DashboardClient initialStats={stats} />;
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  const supabase = createSupabaseServer()
  try {
    // Get companies count (my companies + external companies)
    const [myCompaniesResult, companiesResult, partsResult, posResult, inventoryResult] = await Promise.all([
      supabase.from('my_companies').select('my_company_id', { count: 'exact', head: true }),
      supabase.from('companies').select('company_id', { count: 'exact', head: true }),
      supabase.from('pn_master_table').select('pn_id', { count: 'exact', head: true }),
      supabase.from('purchase_orders').select('total_amount, status, created_at'),
      supabase.from('inventory').select('total_value')
    ])

    const totalCompanies = (myCompaniesResult.count || 0) + (companiesResult.count || 0)
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