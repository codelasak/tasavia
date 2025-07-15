'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useOptimisticUpdates } from './useOptimisticUpdates'

interface PurchaseOrder {
  po_id: string
  po_number: string
  po_date: string
  status: string
  total_amount: number
  my_companies: {
    my_company_name: string
    my_company_code: string
  } | null
  companies: {
    company_name: string
    company_code: string
  } | null
  created_at: string
}

interface PurchaseOrdersContextType {
  purchaseOrders: PurchaseOrder[]
  addPurchaseOrder: (po: PurchaseOrder) => void
  updatePurchaseOrder: (po: PurchaseOrder) => void
  deletePurchaseOrder: (poId: string, asyncOperation: () => Promise<void>) => Promise<void>
  isOptimistic: (poId: string) => boolean
}

const PurchaseOrdersContext = createContext<PurchaseOrdersContextType | null>(null)

interface PurchaseOrdersProviderProps {
  children: ReactNode
  initialPurchaseOrders: PurchaseOrder[]
}

export function PurchaseOrdersProvider({ children, initialPurchaseOrders }: PurchaseOrdersProviderProps) {
  const {
    data: purchaseOrders,
    addFromRealtime: addPurchaseOrder,
    updateFromRealtimeItem: updatePurchaseOrder,
    deleteOptimistic,
    isOptimistic
  } = useOptimisticUpdates<PurchaseOrder>(initialPurchaseOrders, 'po_id')

  const deletePurchaseOrder = async (poId: string, asyncOperation: () => Promise<void>) => {
    return deleteOptimistic(poId, asyncOperation, {
      successMessage: 'Purchase order deleted successfully',
      errorMessage: 'Failed to delete purchase order'
    })
  }

  const value: PurchaseOrdersContextType = {
    purchaseOrders,
    addPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
    isOptimistic
  }

  return (
    <PurchaseOrdersContext.Provider value={value}>
      {children}
    </PurchaseOrdersContext.Provider>
  )
}

export function usePurchaseOrdersContext() {
  const context = useContext(PurchaseOrdersContext)
  if (!context) {
    throw new Error('usePurchaseOrdersContext must be used within a PurchaseOrdersProvider')
  }
  return context
}