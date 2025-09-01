'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useOptimisticUpdates } from './useOptimisticUpdates'

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

interface RepairOrdersContextType {
  repairOrders: RepairOrder[]
  addRepairOrder: (ro: RepairOrder) => void
  updateRepairOrder: (ro: RepairOrder) => void
  deleteRepairOrder: (roId: string, asyncOperation: () => Promise<void>) => Promise<void>
  isOptimistic: (roId: string) => boolean
}

const RepairOrdersContext = createContext<RepairOrdersContextType | null>(null)

interface RepairOrdersProviderProps {
  children: ReactNode
  initialRepairOrders: RepairOrder[]
}

export function RepairOrdersProvider({ children, initialRepairOrders }: RepairOrdersProviderProps) {
  const {
    data: repairOrders,
    addFromRealtime: addRepairOrder,
    updateFromRealtimeItem: updateRepairOrder,
    deleteOptimistic,
    isOptimistic
  } = useOptimisticUpdates<RepairOrder>(initialRepairOrders, 'repair_order_id')

  const deleteRepairOrder = async (roId: string, asyncOperation: () => Promise<void>) => {
    return deleteOptimistic(roId, asyncOperation, {
      successMessage: 'Repair order deleted successfully',
      errorMessage: 'Failed to delete repair order'
    })
  }

  const value: RepairOrdersContextType = {
    repairOrders,
    addRepairOrder,
    updateRepairOrder,
    deleteRepairOrder,
    isOptimistic
  }

  return (
    <RepairOrdersContext.Provider value={value}>
      {children}
    </RepairOrdersContext.Provider>
  )
}

export function useRepairOrdersContext() {
  const context = useContext(RepairOrdersContext)
  if (!context) {
    throw new Error('useRepairOrdersContext must be used within a RepairOrdersProvider')
  }
  return context
}