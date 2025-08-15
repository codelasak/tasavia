'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Package, ShoppingCart, BarChart3, DollarSign, TrendingUp } from 'lucide-react'

interface DashboardStats {
  totalCompanies: number
  totalParts: number
  totalPOs: number
  totalInventoryValue: number
  recentPOs: number
  pendingPOs: number
}

interface DashboardClientProps {
  initialStats: DashboardStats;
}

export function DashboardClient({ initialStats }: DashboardClientProps) {
  const [stats, setStats] = useState<DashboardStats>(initialStats);

  // All client-side effects and UI interactions go here

  const statCards = [
    {
      title: 'Total Companies',
      value: stats.totalCompanies,
      description: 'Internal & External',
      icon: Building2,
      color: 'text-blue-600'
    },
    {
      title: 'Part Numbers',
      value: stats.totalParts,
      description: 'In master catalog',
      icon: Package,
      color: 'text-green-600'
    },
    {
      title: 'Purchase Orders',
      value: stats.totalPOs,
      description: 'Total created',
      icon: ShoppingCart,
      color: 'text-purple-600'
    },
    {
      title: 'Inventory Value',
      value: `$${stats.totalInventoryValue.toLocaleString()}`,
      description: 'Total value',
      icon: DollarSign,
      color: 'text-emerald-600'
    },
    {
      title: 'Recent POs',
      value: stats.recentPOs,
      description: 'Last 30 days',
      icon: TrendingUp,
      color: 'text-orange-600'
    },
    {
      title: 'Pending POs',
      value: stats.pendingPOs,
      description: 'Awaiting action',
      icon: BarChart3,
      color: 'text-red-600'
    }
  ]

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                {card.title}
              </CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {card.value}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks to get started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <a
              href="/portal/purchase-orders/new"
              className="flex items-center p-3 rounded-md border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <ShoppingCart className="h-5 w-5 text-blue-600 mr-3" />
              <div>
                <div className="font-medium">Create Purchase Order</div>
                <div className="text-sm text-slate-500">Generate a new PO</div>
              </div>
            </a>
            <a
              href="/portal/part-numbers"
              className="flex items-center p-3 rounded-md border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <Package className="h-5 w-5 text-green-600 mr-3" />
              <div>
                <div className="font-medium">Manage Part Numbers</div>
                <div className="text-sm text-slate-500">View and edit PN catalog</div>
              </div>
            </a>
            <a
              href="/portal/inventory"
              className="flex items-center p-3 rounded-md border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <BarChart3 className="h-5 w-5 text-purple-600 mr-3" />
              <div>
                <div className="font-medium">Check Inventory</div>
                <div className="text-sm text-slate-500">View stock levels</div>
              </div>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Current system health</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Database Connection</span>
                <span className="text-green-600 text-sm font-medium">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Last Data Sync</span>
                <span className="text-slate-600 text-sm">Just now</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Active Users</span>
                <span className="text-slate-600 text-sm">1</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 