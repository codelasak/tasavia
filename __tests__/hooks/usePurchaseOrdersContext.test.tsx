import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { PurchaseOrdersProvider, usePurchaseOrdersContext } from '../../hooks/usePurchaseOrdersContext'
import { mockPurchaseOrders } from '../test-utils'

// Mock the useOptimisticUpdates hook
jest.mock('../../hooks/useOptimisticUpdates', () => ({
  useOptimisticUpdates: jest.fn(() => ({
    data: mockPurchaseOrders,
    addFromRealtime: jest.fn(),
    updateFromRealtimeItem: jest.fn(),
    deleteOptimistic: jest.fn(() => Promise.resolve()),
    isOptimistic: jest.fn(() => false),
  })),
}))

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PurchaseOrdersProvider initialPurchaseOrders={mockPurchaseOrders}>
    {children}
  </PurchaseOrdersProvider>
)

describe('usePurchaseOrdersContext', () => {
  it('should provide purchase orders data', () => {
    const { result } = renderHook(() => usePurchaseOrdersContext(), { wrapper })

    expect(result.current.purchaseOrders).toEqual(mockPurchaseOrders)
    expect(typeof result.current.addPurchaseOrder).toBe('function')
    expect(typeof result.current.updatePurchaseOrder).toBe('function')
    expect(typeof result.current.deletePurchaseOrder).toBe('function')
    expect(typeof result.current.isOptimistic).toBe('function')
  })

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    const { result } = renderHook(() => usePurchaseOrdersContext())

    expect(result.error).toEqual(
      Error('usePurchaseOrdersContext must be used within a PurchaseOrdersProvider')
    )
    
    consoleSpy.mockRestore()
  })

  it('should handle delete purchase order with async operation', async () => {
    const { result } = renderHook(() => usePurchaseOrdersContext(), { wrapper })
    const mockAsyncOperation = jest.fn(() => Promise.resolve())

    await act(async () => {
      await result.current.deletePurchaseOrder('1', mockAsyncOperation)
    })

    expect(mockAsyncOperation).toHaveBeenCalled()
  })

  it('should check if purchase order is optimistic', () => {
    const { result } = renderHook(() => usePurchaseOrdersContext(), { wrapper })

    const isOptimistic = result.current.isOptimistic('1')
    expect(typeof isOptimistic).toBe('boolean')
  })
})