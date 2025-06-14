"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShoppingCart, Home, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { name: 'Home', href: '/portal/dashboard', icon: Home },
  { name: 'Purchase Orders', href: '/portal/purchase-orders', icon: ShoppingCart },
  { name: 'Profile', href: '/portal/my-companies', icon: User },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-around bg-white border-t border-slate-200 shadow-lg md:hidden">
      {navItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center py-2 flex-1 transition-colors',
              isActive ? 'text-blue-600' : 'text-slate-500 hover:text-blue-600'
            )}
            aria-label={item.name}
          >
            <item.icon className="h-6 w-6 mb-1" />
            <span className="text-xs font-medium">{item.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}
