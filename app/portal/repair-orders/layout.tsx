'use client'

import { ReactNode, useEffect, useState } from 'react'
import { RepairOrdersProvider } from '@/hooks/useRepairOrdersContext'
import { supabase } from '@/lib/supabase/client'

interface RepairOrder {
  repair_order_id: string
  repair_order_number: string
  vendor_company_id: string
  status: string | null
  expected_return_date: string | null
  actual_return_date: string | null
  total_cost: number | null
  currency: string | null
  created_at: string | null
  companies: {
    company_name: string
    company_code: string | null
  }
  repair_order_items: Array<{
    workscope: string
    estimated_cost: number | null
    inventory: {
      pn_master_table: {
        pn: string
      }
    }
  }>
}

interface RepairOrdersLayoutProps {
  children: ReactNode
}

export default function RepairOrdersLayout({ children }: RepairOrdersLayoutProps) {
  const [repairOrders, setRepairOrders] = useState<RepairOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchRepairOrders = async () => {
      try {
        const { data, error } = await supabase
          .from('repair_orders')
          .select(`
            *,
            companies(company_name, company_code),
            repair_order_items(
              workscope,
              estimated_cost,
              inventory(
                pn_master_table(pn)
              )
            )
          `)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching repair orders:', error)
          setRepairOrders([])
        } else {
          setRepairOrders((data as any) || [])
        }
      } catch (error) {
        console.error('Error fetching repair orders:', error)
        setRepairOrders([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchRepairOrders()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  return (
    <RepairOrdersProvider initialRepairOrders={repairOrders}>
      {children}
    </RepairOrdersProvider>
  )
}