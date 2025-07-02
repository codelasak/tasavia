'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import {
  Building2,
  Package,
  ShoppingCart,
  Truck,
  BarChart3,
  Home,
  ArrowLeft,
  Users,
  Shield
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth/AuthProvider'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

// Grouped and ordered navigation for better UX
const groupedNavigation = [
  {
    label: 'Main',
    items: [
      { name: 'Dashboard', href: '/portal/dashboard', icon: Home },
      { name: 'Purchase Orders', href: '/portal/purchase-orders', icon: ShoppingCart },
      { name: 'Inventory', href: '/portal/inventory', icon: BarChart3 },
    ],
  },
  {
    label: 'Companies',
    items: [
      { name: 'My Companies', href: '/portal/my-companies', icon: Building2 },
      { name: 'External Companies', href: '/portal/companies', icon: Building2 },
    ],
  },
  {
    label: 'Parts',
    items: [
      { name: 'Part Numbers', href: '/portal/part-numbers', icon: Package },
    ],
  },
]

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)

  // Check if user is admin
  useEffect(() => {
    async function checkAdminStatus() {
      if (user) {
        try {
          const { data, error } = await supabase
            .rpc('is_admin', { user_id: user.id });
          
          if (!error) {
            setIsAdmin(data || false);
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    }
    
    checkAdminStatus();
  }, [user]);

  // Prevent scroll on mobile when sidebar is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  // Dynamic navigation based on user role
  const getNavigation = () => {
    const baseNav = [...groupedNavigation];
    
    if (isAdmin) {
      baseNav.push({
        label: 'Administration',
        items: [
          { name: 'User Management', href: '/portal/admin/users', icon: Users },
          { name: 'System Settings', href: '/portal/admin/settings', icon: Shield },
        ],
      });
    }
    
    return baseNav;
  };

  // Sidebar content
  const sidebarContent = (
    <div className="w-64 bg-slate-900 text-white h-full flex flex-col">
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Image
            src="/logo.png"
            alt="TASAVIA"
            width={120}
            height={40}
            className="h-10 w-auto"
          />
        </div>
        {/* Close button for mobile */}
        <button
          className="md:hidden ml-2 p-1 rounded hover:bg-slate-800 focus:outline-none"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
      </div>
      <p className="text-slate-400 text-sm mt-2 px-6">Internal Dashboard</p>
      <nav className="px-3 mt-4" role="navigation" aria-label="Sidebar">
        {getNavigation().map((group, groupIdx) => (
          <div key={group.label} className={groupIdx > 0 ? 'mt-6' : ''}>
            <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold px-2 mb-2 select-none">
              {group.label}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400',
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                    tabIndex={0}
                    onClick={onClose}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  )

  // Responsive rendering
  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:block h-full min-h-screen">
        {sidebarContent}
      </div>
      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={onClose}
            aria-label="Close sidebar overlay"
          />
          {/* Drawer */}
          <div className="relative h-full animate-slide-in-left">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}