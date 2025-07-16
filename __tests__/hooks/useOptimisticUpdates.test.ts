import { renderHook, act } from '@testing-library/react'
import { useOptimisticUpdates } from '../../hooks/useOptimisticUpdates'

// Mock toast notifications
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
  },
}))

interface TestItem {
  id: string
  name: string
  value: number
}

const mockItems: TestItem[] = [
  { id: '1', name: 'Item 1', value: 100 },
  { id: '2', name: 'Item 2', value: 200 },
]

describe('useOptimisticUpdates', () => {
  it('should initialize with provided data', () => {
    const { result } = renderHook(() => useOptimisticUpdates(mockItems, 'id'))

    expect(result.current.data).toEqual(mockItems)
  })

  it('should add item from realtime', () => {
    const { result } = renderHook(() => useOptimisticUpdates<TestItem>([], 'id'))
    const newItem = { id: '3', name: 'Item 3', value: 300 }

    act(() => {
      result.current.addFromRealtime(newItem)
    })

    expect(result.current.data).toContain(newItem)
  })

  it('should update item from realtime', () => {
    const { result } = renderHook(() => useOptimisticUpdates(mockItems, 'id'))
    const updatedItem = { id: '1', name: 'Updated Item 1', value: 150 }

    act(() => {
      result.current.updateFromRealtimeItem(updatedItem)
    })

    expect(result.current.data.find(item => item.id === '1')).toEqual(updatedItem)
  })

  it('should handle optimistic delete with success', async () => {
    const { result } = renderHook(() => useOptimisticUpdates(mockItems, 'id'))
    const mockAsyncOperation = jest.fn(() => Promise.resolve())

    await act(async () => {
      await result.current.deleteOptimistic('1', mockAsyncOperation, {
        successMessage: 'Deleted successfully',
        errorMessage: 'Failed to delete'
      })
    })

    expect(mockAsyncOperation).toHaveBeenCalled()
    expect(result.current.data.find(item => item.id === '1')).toBeUndefined()
  })

  it('should handle optimistic delete with error', async () => {
    const { result } = renderHook(() => useOptimisticUpdates(mockItems, 'id'))
    const mockAsyncOperation = jest.fn(() => Promise.reject(new Error('Delete failed')))

    await act(async () => {
      try {
        await result.current.deleteOptimistic('1', mockAsyncOperation, {
          successMessage: 'Deleted successfully',
          errorMessage: 'Failed to delete'
        })
      } catch (error) {
        // Expected to throw
      }
    })

    expect(mockAsyncOperation).toHaveBeenCalled()
    // Item should be restored after failed delete
    expect(result.current.data.find(item => item.id === '1')).toEqual(mockItems[0])
  })

  it('should track optimistic items', () => {
    const { result } = renderHook(() => useOptimisticUpdates(mockItems, 'id'))

    // Initially no items are optimistic
    expect(result.current.isOptimistic('1')).toBe(false)

    act(() => {
      // Simulate an optimistic update by directly calling the internal state
      // This would normally happen during a delete operation
      result.current.deleteOptimistic('1', () => new Promise(resolve => {
        setTimeout(resolve, 100) // Delay to keep it optimistic temporarily
      }), {
        successMessage: 'Success',
        errorMessage: 'Error'
      })
    })

    // During the async operation, the item should be marked as optimistic
    expect(result.current.isOptimistic('1')).toBe(true)
  })

  it('should handle add optimistic update', async () => {
    const { result } = renderHook(() => useOptimisticUpdates<TestItem>([], 'id'))
    const newItem = { id: '1', name: 'New Item', value: 100 }
    const mockAsyncOperation = jest.fn(() => Promise.resolve())

    await act(async () => {
      await result.current.addOptimistic(newItem, mockAsyncOperation, {
        successMessage: 'Added successfully',
        errorMessage: 'Failed to add'
      })
    })

    expect(mockAsyncOperation).toHaveBeenCalled()
    expect(result.current.data).toContain(newItem)
  })

  it('should handle update optimistic with success', async () => {
    const { result } = renderHook(() => useOptimisticUpdates(mockItems, 'id'))
    const updatedItem = { id: '1', name: 'Optimistically Updated', value: 999 }
    const mockAsyncOperation = jest.fn(() => Promise.resolve())

    await act(async () => {
      await result.current.updateOptimistic(updatedItem, mockAsyncOperation, {
        successMessage: 'Updated successfully',
        errorMessage: 'Failed to update'
      })
    })

    expect(mockAsyncOperation).toHaveBeenCalled()
    expect(result.current.data.find(item => item.id === '1')).toEqual(updatedItem)
  })
})