'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  RealtimeStatusSyncManager,
  StatusUpdate,
  UserActivity,
  ConnectionStatus,
  StatusSyncCallback,
  UserActivityCallback
} from '@/lib/realtime-status-sync'

export interface UseRealtimeStatusOptions {
  userId?: string
  userName?: string
  enableInventorySync?: boolean
  enableOrderSync?: boolean
  enablePartModificationSync?: boolean
  enableUserActivity?: boolean
  autoReconnect?: boolean
  reconnectInterval?: number
}

export interface UseRealtimeStatusReturn {
  // Connection status
  connectionStatus: ConnectionStatus
  isConnected: boolean
  
  // Status updates
  inventoryUpdates: StatusUpdate[]
  orderUpdates: StatusUpdate[]
  partModificationUpdates: StatusUpdate[]
  
  // User activity
  userActivities: UserActivity[]
  
  // Actions
  broadcastActivity: (table: string, recordId: string, action: UserActivity['action'], metadata?: Record<string, any>) => Promise<void>
  reconnect: () => Promise<void>
  clearUpdates: (type?: 'inventory' | 'orders' | 'parts' | 'all') => void
  
  // Subscription management
  subscribeToInventory: (callback: StatusSyncCallback) => () => void
  subscribeToOrders: (orderType: 'purchase' | 'sales' | 'repair', callback: StatusSyncCallback) => () => void
  subscribeToPartModifications: (callback: StatusSyncCallback) => () => void
  subscribeToUserActivity: (table: string, recordId: string, callback: UserActivityCallback) => () => void
  
  // Statistics
  stats: {
    totalSubscriptions: number
    activeSubscriptions: number
    statusCallbacks: number
    activityCallbacks: number
    connectionCallbacks: number
  }
}

/**
 * React hook for real-time status synchronization
 * Provides easy access to Supabase real-time features for status updates and user activity
 */
export function useRealtimeStatus({
  userId,
  userName,
  enableInventorySync = true,
  enableOrderSync = true,
  enablePartModificationSync = true,
  enableUserActivity = false,
  autoReconnect = true,
  reconnectInterval = 30000
}: UseRealtimeStatusOptions = {}): UseRealtimeStatusReturn {
  
  const managerRef = useRef<RealtimeStatusSyncManager | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // State
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    lastHeartbeat: new Date().toISOString(),
    subscriptions: [],
    reconnectAttempts: 0,
    connectionQuality: 'disconnected'
  })
  
  const [inventoryUpdates, setInventoryUpdates] = useState<StatusUpdate[]>([])
  const [orderUpdates, setOrderUpdates] = useState<StatusUpdate[]>([])
  const [partModificationUpdates, setPartModificationUpdates] = useState<StatusUpdate[]>([])
  const [userActivities, setUserActivities] = useState<UserActivity[]>([])
  const [stats, setStats] = useState({
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    statusCallbacks: 0,
    activityCallbacks: 0,
    connectionCallbacks: 0
  })

  // Initialize manager
  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = new RealtimeStatusSyncManager(userId, userName)
      
      // Subscribe to connection status
      const unsubscribeConnection = managerRef.current.subscribeToConnectionStatus((status) => {
        setConnectionStatus(status)
        
        // Update stats
        if (managerRef.current) {
          setStats(managerRef.current.getSubscriptionStats())
        }
        
        // Handle auto-reconnect
        if (autoReconnect && !status.isConnected && status.connectionQuality === 'disconnected') {
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (managerRef.current) {
              managerRef.current.reconnectAll()
            }
          }, reconnectInterval)
        }
      })

      return () => {
        unsubscribeConnection()
      }
    }
  }, [userId, userName, autoReconnect, reconnectInterval])

  // Auto-subscribe to enabled features
  useEffect(() => {
    if (!managerRef.current) return

    const unsubscribeFunctions: (() => void)[] = []

    // Inventory sync
    if (enableInventorySync) {
      const unsubscribe = managerRef.current.subscribeToInventoryStatus((update) => {
        setInventoryUpdates(prev => [update, ...prev.slice(0, 99)]) // Keep last 100 updates
      })
      unsubscribeFunctions.push(unsubscribe)
    }

    // Order sync
    if (enableOrderSync) {
      const orderTypes: ('purchase' | 'sales' | 'repair')[] = ['purchase', 'sales', 'repair']
      
      orderTypes.forEach(orderType => {
        const unsubscribe = managerRef.current!.subscribeToOrderStatus(orderType, (update) => {
          setOrderUpdates(prev => [update, ...prev.slice(0, 99)]) // Keep last 100 updates
        })
        unsubscribeFunctions.push(unsubscribe)
      })
    }

    // Part modification sync
    if (enablePartModificationSync) {
      const unsubscribe = managerRef.current.subscribeToPartNumberModifications((update) => {
        setPartModificationUpdates(prev => [update, ...prev.slice(0, 99)]) // Keep last 100 updates
      })
      unsubscribeFunctions.push(unsubscribe)
    }

    return () => {
      unsubscribeFunctions.forEach(fn => fn())
    }
  }, [enableInventorySync, enableOrderSync, enablePartModificationSync])

  // Broadcast user activity
  const broadcastActivity = useCallback(async (
    table: string, 
    recordId: string, 
    action: UserActivity['action'], 
    metadata?: Record<string, any>
  ) => {
    if (managerRef.current && enableUserActivity) {
      await managerRef.current.broadcastUserActivity(table, recordId, action, metadata)
    }
  }, [enableUserActivity])

  // Manual reconnect
  const reconnect = useCallback(async () => {
    if (managerRef.current) {
      await managerRef.current.reconnectAll()
    }
  }, [])

  // Clear updates
  const clearUpdates = useCallback((type: 'inventory' | 'orders' | 'parts' | 'all' = 'all') => {
    switch (type) {
      case 'inventory':
        setInventoryUpdates([])
        break
      case 'orders':
        setOrderUpdates([])
        break
      case 'parts':
        setPartModificationUpdates([])
        break
      case 'all':
        setInventoryUpdates([])
        setOrderUpdates([])
        setPartModificationUpdates([])
        setUserActivities([])
        break
    }
  }, [])

  // Direct subscription methods for advanced usage
  const subscribeToInventory = useCallback((callback: StatusSyncCallback) => {
    return managerRef.current?.subscribeToInventoryStatus(callback) || (() => {})
  }, [])

  const subscribeToOrders = useCallback((orderType: 'purchase' | 'sales' | 'repair', callback: StatusSyncCallback) => {
    return managerRef.current?.subscribeToOrderStatus(orderType, callback) || (() => {})
  }, [])

  const subscribeToPartModifications = useCallback((callback: StatusSyncCallback) => {
    return managerRef.current?.subscribeToPartNumberModifications(callback) || (() => {})
  }, [])

  const subscribeToUserActivity = useCallback((table: string, recordId: string, callback: UserActivityCallback) => {
    return managerRef.current?.subscribeToUserActivity(table, recordId, callback) || (() => {})
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      
      if (managerRef.current) {
        managerRef.current.cleanup()
      }
    }
  }, [])

  return {
    // Connection status
    connectionStatus,
    isConnected: connectionStatus.isConnected,
    
    // Status updates
    inventoryUpdates,
    orderUpdates,
    partModificationUpdates,
    
    // User activity
    userActivities,
    
    // Actions
    broadcastActivity,
    reconnect,
    clearUpdates,
    
    // Subscription management
    subscribeToInventory,
    subscribeToOrders,
    subscribeToPartModifications,
    subscribeToUserActivity,
    
    // Statistics
    stats
  }
}

/**
 * Hook for tracking specific inventory item status in real-time
 */
export function useInventoryItemStatus(inventoryId: string) {
  const [status, setStatus] = useState<{
    business_status?: string
    physical_status?: string
    last_updated?: string
  }>({})
  
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { subscribeToInventory } = useRealtimeStatus({
    enableInventorySync: true,
    enableOrderSync: false,
    enablePartModificationSync: false
  })

  useEffect(() => {
    const unsubscribe = subscribeToInventory((update) => {
      if (update.recordId === inventoryId) {
        setStatus(prev => ({
          ...prev,
          ...update.newStatus,
          last_updated: update.timestamp
        }))
      }
    })

    // Load initial status
    const loadInitialStatus = async () => {
      try {
        const { supabase } = await import('@/lib/supabase/client')
        
        const { data, error } = await supabase
          .from('inventory')
          .select('business_status, physical_status, updated_at')
          .eq('id', inventoryId)
          .single()

        if (error) throw error

        setStatus({
          business_status: data.business_status,
          physical_status: data.physical_status,
          last_updated: data.updated_at || undefined
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load status')
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialStatus()

    return unsubscribe
  }, [inventoryId, subscribeToInventory])

  return { status, isLoading, error }
}

/**
 * Hook for tracking order status in real-time
 */
export function useOrderStatus(
  orderType: 'purchase' | 'sales' | 'repair',
  orderId: string
) {
  const [status, setStatus] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  const { subscribeToOrders } = useRealtimeStatus({
    enableInventorySync: false,
    enableOrderSync: true,
    enablePartModificationSync: false
  })

  useEffect(() => {
    const unsubscribe = subscribeToOrders(orderType, (update) => {
      if (update.recordId === orderId) {
        setStatus(update.newStatus.status)
        setLastUpdated(update.timestamp)
      }
    })

    // Load initial status
    const loadInitialStatus = async () => {
      try {
        const { supabase } = await import('@/lib/supabase/client')
        
        const { data, error } = await supabase
          .from(`${orderType}_orders`)
          .select('status, updated_at')
          .eq(`${orderType}_order_id`, orderId)
          .single()

        if (error) throw error

        setStatus(data.status || '')
        setLastUpdated(data.updated_at || '')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load status')
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialStatus()

    return unsubscribe
  }, [orderType, orderId, subscribeToOrders])

  return { status, isLoading, error, lastUpdated }
}

/**
 * Hook for collaborative editing features
 */
export function useCollaborativeEditing(table: string, recordId: string) {
  const [activeUsers, setActiveUsers] = useState<UserActivity[]>([])
  const [isViewing, setIsViewing] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const { subscribeToUserActivity, broadcastActivity } = useRealtimeStatus({
    enableUserActivity: true
  })

  useEffect(() => {
    const unsubscribe = subscribeToUserActivity(table, recordId, (activity) => {
      setActiveUsers(prev => {
        // Remove old activity from same user
        const filtered = prev.filter(a => a.userId !== activity.userId)
        
        // Add new activity if it's recent (within last 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
        if (activity.timestamp > fiveMinutesAgo) {
          return [...filtered, activity]
        }
        
        return filtered
      })
    })

    return unsubscribe
  }, [table, recordId, subscribeToUserActivity])

  const startViewing = useCallback(async () => {
    setIsViewing(true)
    await broadcastActivity(table, recordId, 'viewing')
  }, [table, recordId, broadcastActivity])

  const stopViewing = useCallback(async () => {
    setIsViewing(false)
    // Don't broadcast stop viewing to reduce noise
  }, [])

  const startEditing = useCallback(async (metadata?: Record<string, any>) => {
    setIsEditing(true)
    await broadcastActivity(table, recordId, 'editing', metadata)
  }, [table, recordId, broadcastActivity])

  const stopEditing = useCallback(async () => {
    setIsEditing(false)
    // Don't broadcast stop editing to reduce noise
  }, [])

  const broadcastUpdate = useCallback(async (metadata?: Record<string, any>) => {
    await broadcastActivity(table, recordId, 'updating', metadata)
  }, [table, recordId, broadcastActivity])

  return {
    activeUsers,
    isViewing,
    isEditing,
    startViewing,
    stopViewing,
    startEditing,
    stopEditing,
    broadcastUpdate
  }
}