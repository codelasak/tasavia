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
            company_id,
            vendor_company_id
          `)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching purchase orders:', error)
          setPurchaseOrders([])
        } else if (data) {
          // Get unique company IDs
          const companyIds = [...new Set([
            ...data.map((po: any) => po.company_id),
            ...data.map((po: any) => po.vendor_company_id)
          ].filter(Boolean))]

          // Fetch company data
          const { data: companiesData, error: companiesError } = await supabase
            .from('companies')
            .select('company_id, company_name, company_code')
            .in('company_id', companyIds)

          if (companiesError) {
            console.error('Error fetching companies:', companiesError)
            setPurchaseOrders([])
          } else {
            // Create a map of companies for quick lookup
            const companiesMap = (companiesData || []).reduce((acc: any, company: any) => {
              acc[company.company_id] = company
              return acc
            }, {})

            // Merge purchase orders with company data
            const enrichedData = data.map((po: any) => ({
              ...po,
              buyer_company: companiesMap[po.company_id] || null,
              vendor_company: companiesMap[po.vendor_company_id] || null
            }))

            setPurchaseOrders(enrichedData)
          }
        } else {
          setPurchaseOrders([])
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