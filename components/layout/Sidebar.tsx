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
  Home
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'My Companies', href: '/my-companies', icon: Building2 },
  { name: 'External Companies', href: '/companies', icon: Building2 },
  { name: 'Part Numbers', href: '/part-numbers', icon: Package },
  { name: 'Inventory', href: '/inventory', icon: BarChart3 },
  { name: 'Purchase Orders', href: '/purchase-orders', icon: ShoppingCart },
  { name: 'Ship Via', href: '/ship-via', icon: Truck },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-slate-900 text-white min-h-screen">
      <div className="p-6">
        <div className="flex items-center space-x-3">
          <Image
            src="/logo.png"
            alt="TASAVIA"
            width={120}
            height={40}
            className="h-10 w-auto"
          />
        </div>
        <p className="text-slate-400 text-sm mt-2">Internal Dashboard</p>
      </div>
      
      <nav className="px-3 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              )}
            >
              <item.icon className="h-5 w-5 mr-3" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}