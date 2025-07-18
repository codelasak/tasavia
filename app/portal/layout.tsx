'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'

export const dynamic = 'force-dynamic'

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar for desktop, drawer for mobile */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col min-h-screen md:ml-64">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto p-6 pb-20 md:pb-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
        {/* Sticky bottom nav for mobile */}
        <BottomNav />
      </div>
    </div>
  )
}