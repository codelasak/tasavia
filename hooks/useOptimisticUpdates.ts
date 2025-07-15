'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'

interface OptimisticUpdateOptions<T> {
  onSuccess?: (data: T) => void
  onError?: (error: Error, originalState: T[]) => void
  successMessage?: string
  errorMessage?: string
}

export function useOptimisticUpdates<T extends { [key: string]: any }>(
  initialData: T[],
  idKey: keyof T = 'id' as keyof T
) {
  const [data, setData] = useState<T[]>(initialData)
  const [optimisticOperations, setOptimisticOperations] = useState<Set<string>>(new Set())

  // Add item optimistically
  const addOptimistic = useCallback(async <R = T>(
    item: T,
    asyncOperation: () => Promise<R>,
    options: OptimisticUpdateOptions<R> = {}
  ) => {
    const tempId = `temp_${Date.now()}`
    const itemWithTempId = { ...item, [idKey]: tempId }
    
    // Add to optimistic operations
    setOptimisticOperations(prev => new Set(prev).add(tempId))
    
    // Add optimistically to local state
    setData(prev => [itemWithTempId, ...prev])
    
    try {
      const result = await asyncOperation()
      
      // Replace temp item with real item
      setData(prev => {
        const filtered = prev.filter(d => d[idKey] !== tempId)
        return [result as any as T, ...filtered]
      })
      
      if (options.successMessage) {
        toast.success(options.successMessage)
      }
      
      options.onSuccess?.(result)
      return result
    } catch (error) {
      // Remove temp item on error
      setData(prev => prev.filter(d => d[idKey] !== tempId))
      
      const errorMessage = options.errorMessage || 'Operation failed'
      toast.error(errorMessage)
      
      options.onError?.(error as Error, initialData as any)
      throw error
    } finally {
      // Remove from optimistic operations
      setOptimisticOperations(prev => {
        const next = new Set(prev)
        next.delete(tempId)
        return next
      })
    }
  }, [initialData, idKey])

  // Update item optimistically
  const updateOptimistic = useCallback(async <R = T>(
    itemId: string,
    updates: Partial<T>,
    asyncOperation: () => Promise<R>,
    options: OptimisticUpdateOptions<R> = {}
  ) => {
    const originalData = [...data]
    const itemIndex = data.findIndex(item => item[idKey] === itemId)
    
    if (itemIndex === -1) {
      throw new Error('Item not found for update')
    }

    const originalItem = data[itemIndex]
    
    // Add to optimistic operations
    setOptimisticOperations(prev => new Set(prev).add(itemId))
    
    // Update optimistically
    setData(prev => {
      const next = [...prev]
      next[itemIndex] = { ...originalItem, ...updates }
      return next
    })
    
    try {
      const result = await asyncOperation()
      
      // Update with real data
      setData(prev => {
        const next = [...prev]
        const currentIndex = next.findIndex(item => item[idKey] === itemId)
        if (currentIndex !== -1) {
          next[currentIndex] = result as any as T
        }
        return next
      })
      
      if (options.successMessage) {
        toast.success(options.successMessage)
      }
      
      options.onSuccess?.(result)
      return result
    } catch (error) {
      // Revert to original state
      setData(originalData)
      
      const errorMessage = options.errorMessage || 'Update failed'
      toast.error(errorMessage)
      
      options.onError?.(error as Error, originalData as any)
      throw error
    } finally {
      // Remove from optimistic operations
      setOptimisticOperations(prev => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }, [data, idKey])

  // Delete item optimistically
  const deleteOptimistic = useCallback(async <R = void>(
    itemId: string,
    asyncOperation: () => Promise<R>,
    options: OptimisticUpdateOptions<R> = {}
  ) => {
    const originalData = [...data]
    const itemToDelete = data.find(item => item[idKey] === itemId)
    
    if (!itemToDelete) {
      throw new Error('Item not found for deletion')
    }

    // Add to optimistic operations
    setOptimisticOperations(prev => new Set(prev).add(itemId))
    
    // Remove optimistically
    setData(prev => prev.filter(item => item[idKey] !== itemId))
    
    try {
      await asyncOperation()
      
      if (options.successMessage) {
        toast.success(options.successMessage)
      }
      
      options.onSuccess?.(undefined as any)
    } catch (error) {
      // Restore item on error
      setData(originalData)
      
      const errorMessage = options.errorMessage || 'Delete failed'
      toast.error(errorMessage)
      
      options.onError?.(error as Error, originalData as any)
      throw error
    } finally {
      // Remove from optimistic operations
      setOptimisticOperations(prev => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }, [data, idKey])

  // Check if an item is in an optimistic state
  const isOptimistic = useCallback((itemId: string) => {
    return optimisticOperations.has(itemId)
  }, [optimisticOperations])

  // Update data from external source (like real-time updates)
  const updateFromRealtime = useCallback((newData: T[]) => {
    setData(newData)
  }, [])

  // Add single item from real-time
  const addFromRealtime = useCallback((item: T) => {
    setData(prev => {
      // Avoid duplicates
      const exists = prev.some(existing => existing[idKey] === item[idKey])
      if (exists) {
        return prev.map(existing => existing[idKey] === item[idKey] ? item : existing)
      }
      return [item, ...prev]
    })
  }, [idKey])

  // Update single item from real-time
  const updateFromRealtimeItem = useCallback((item: T) => {
    setData(prev => {
      const index = prev.findIndex(existing => existing[idKey] === item[idKey])
      if (index !== -1) {
        const next = [...prev]
        next[index] = item
        return next
      }
      return prev
    })
  }, [idKey])

  // Remove single item from real-time
  const removeFromRealtime = useCallback((itemId: string) => {
    setData(prev => prev.filter(item => item[idKey] !== itemId))
  }, [idKey])

  return {
    data,
    addOptimistic,
    updateOptimistic,
    deleteOptimistic,
    isOptimistic,
    updateFromRealtime,
    addFromRealtime,
    updateFromRealtimeItem,
    removeFromRealtime
  }
}