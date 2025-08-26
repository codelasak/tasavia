'use client'

import { ReactNode, useEffect, useState } from 'react'
import { PurchaseOrdersProvider } from '@/hooks/usePurchaseOrdersContext'
import { supabase } from '@/lib/supabase/client'

interface PurchaseOrder {
  po_id: string
  po_number: string
  po_date: string
  status: string
  total_amount: number
  buyer_company: {
    company_name: string
    company_code: string
  } | null
  vendor_company: {
    company_name: string
    company_code: string
  } | null
  created_at: string
}

interface PurchaseOrdersLayoutProps {
  children: ReactNode
}

export default function PurchaseOrdersLayout({ children }: PurchaseOrdersLayoutProps) {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchPurchaseOrders = async () => {
      try {
        const { data, error } = await supabase
          .from('purchase_orders')
          .select(`
            po_id,
            po_number,
            po_date,
            status,
            total_amount,
            created_at,
            buyer_company:companies!company_id (
              company_name,
              company_code
            ),
            vendor_company:companies!vendor_company_id (
              company_name,
              company_code
            )
          `)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching purchase orders:', error)
          setPurchaseOrders([])
        } else {
          setPurchaseOrders(data as any || [])
        }
      } catch (error) {
        console.error('Error fetching purchase orders:', error)
        setPurchaseOrders([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchPurchaseOrders()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  return (
    <PurchaseOrdersProvider initialPurchaseOrders={purchaseOrders}>
      {children}
    </PurchaseOrdersProvider>
  )
}