'use client'

import { supabase } from '@/lib/supabase/client'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface StatusUpdate {
  id: string
  table: string
  recordId: string
  oldStatus?: any
  newStatus: any
  timestamp: string
  userId?: string
  userName?: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
}

export interface UserActivity {
  userId: string
  userName: string
  table: string
  recordId: string
  action: 'viewing' | 'editing' | 'updating'
  timestamp: string
  metadata?: Record<string, any>
}

export interface ConnectionStatus {
  isConnected: boolean
  lastHeartbeat: string
  subscriptions: string[]
  reconnectAttempts: number
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected'
}

export type StatusSyncCallback = (update: StatusUpdate) => void
export type UserActivityCallback = (activity: UserActivity) => void
export type ConnectionCallback = (status: ConnectionStatus) => void

/**
 * Real-time status synchronization manager for Supabase
 * Handles inventory status, order status, and user activity tracking
 */
export class RealtimeStatusSyncManager {
  private supabaseClient = supabase
  private subscriptions = new Map<string, RealtimeChannel>()
  private statusCallbacks = new Map<string, StatusSyncCallback[]>()
  private activityCallbacks = new Map<string, UserActivityCallback[]>()
  private connectionCallbacks: ConnectionCallback[] = []
  
  private connectionStatus: ConnectionStatus = {
    isConnected: false,
    lastHeartbeat: new Date().toISOString(),
    subscriptions: [],
    reconnectAttempts: 0,
    connectionQuality: 'disconnected'
  }

  private heartbeatInterval?: NodeJS.Timeout
  private userId?: string
  private userName?: string

  constructor(userId?: string, userName?: string) {
    this.userId = userId
    this.userName = userName
    this.initializeHeartbeat()
  }

  /**
   * Initialize heartbeat monitoring
   */
  private initializeHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.updateConnectionStatus()
      this.notifyConnectionCallbacks()
    }, 30000) // Check every 30 seconds
  }

  /**
   * Update connection status based on subscription states
   */
  private updateConnectionStatus(): void {
    const activeSubscriptions = Array.from(this.subscriptions.values())
    const connectedSubscriptions = activeSubscriptions.filter(sub => sub.state === 'subscribed' as any)
    
    this.connectionStatus = {
      ...this.connectionStatus,
      isConnected: connectedSubscriptions.length > 0,
      lastHeartbeat: new Date().toISOString(),
      subscriptions: Array.from(this.subscriptions.keys()),
      connectionQuality: this.calculateConnectionQuality(connectedSubscriptions.length, activeSubscriptions.length)
    }
  }

  /**
   * Calculate connection quality based on subscription success rate
   */
  private calculateConnectionQuality(connected: number, total: number): ConnectionStatus['connectionQuality'] {
    if (total === 0) return 'disconnected'
    
    const ratio = connected / total
    if (ratio >= 0.9) return 'excellent'
    if (ratio >= 0.7) return 'good'
    if (ratio >= 0.3) return 'poor'
    return 'disconnected'
  }

  /**
   * Subscribe to inventory status changes
   */
  subscribeToInventoryStatus(callback: StatusSyncCallback): () => void {
    const subscriptionKey = 'inventory_status'
    
    if (!this.subscriptions.has(subscriptionKey)) {
      const channel = this.supabaseClient
        .channel(`inventory_status_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'inventory',
            filter: 'business_status=neq.null OR physical_status=neq.null'
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            this.handleInventoryStatusChange(payload)
          }
        )
        .subscribe((status) => {
          console.log('Inventory status subscription:', status)
          this.updateConnectionStatus()
        })

      this.subscriptions.set(subscriptionKey, channel)
    }

    // Add callback
    if (!this.statusCallbacks.has(subscriptionKey)) {
      this.statusCallbacks.set(subscriptionKey, [])
    }
    this.statusCallbacks.get(subscriptionKey)!.push(callback)

    // Return unsubscribe function
    return () => {
      const callbacks = this.statusCallbacks.get(subscriptionKey)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index > -1) {
          callbacks.splice(index, 1)
        }
      }
    }
  }

  /**
   * Handle inventory status change events
   */
  private handleInventoryStatusChange(payload: RealtimePostgresChangesPayload<any>): void {
    const { eventType, new: newRecord, old: oldRecord } = payload

    // Determine what status changed
    let statusChange: any = {}
    let oldStatus: any = {}

    if (eventType === 'UPDATE') {
      if (oldRecord?.business_status !== newRecord?.business_status) {
        statusChange.business_status = newRecord?.business_status
        oldStatus.business_status = oldRecord?.business_status
      }
      if (oldRecord?.physical_status !== newRecord?.physical_status) {
        statusChange.physical_status = newRecord?.physical_status
        oldStatus.physical_status = oldRecord?.physical_status
      }
    } else if (eventType === 'INSERT') {
      statusChange = {
        business_status: newRecord?.business_status,
        physical_status: newRecord?.physical_status
      }
    }

    const statusUpdate: StatusUpdate = {
      id: `inv_${(newRecord as any)?.id || (oldRecord as any)?.id}_${Date.now()}`,
      table: 'inventory',
      recordId: (newRecord as any)?.id || (oldRecord as any)?.id,
      oldStatus,
      newStatus: statusChange,
      timestamp: new Date().toISOString(),
      operation: eventType as any
    }

    this.notifyStatusCallbacks('inventory_status', statusUpdate)
  }

  /**
   * Subscribe to order status changes (purchase, sales, repair orders)
   */
  subscribeToOrderStatus(orderType: 'purchase' | 'sales' | 'repair', callback: StatusSyncCallback): () => void {
    const subscriptionKey = `${orderType}_order_status`
    const tableName = `${orderType}_orders`
    
    if (!this.subscriptions.has(subscriptionKey)) {
      const channel = this.supabaseClient
        .channel(`${orderType}_order_status_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: tableName,
            filter: 'status=neq.null'
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            this.handleOrderStatusChange(payload, orderType)
          }
        )
        .subscribe((status) => {
          console.log(`${orderType} order status subscription:`, status)
          this.updateConnectionStatus()
        })

      this.subscriptions.set(subscriptionKey, channel)
    }

    // Add callback
    if (!this.statusCallbacks.has(subscriptionKey)) {
      this.statusCallbacks.set(subscriptionKey, [])
    }
    this.statusCallbacks.get(subscriptionKey)!.push(callback)

    // Return unsubscribe function
    return () => {
      const callbacks = this.statusCallbacks.get(subscriptionKey)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index > -1) {
          callbacks.splice(index, 1)
        }
      }
    }
  }

  /**
   * Handle order status change events
   */
  private handleOrderStatusChange(
    payload: RealtimePostgresChangesPayload<any>, 
    orderType: 'purchase' | 'sales' | 'repair'
  ): void {
    const { new: newRecord, old: oldRecord } = payload

    const statusUpdate: StatusUpdate = {
      id: `${orderType}_${(newRecord as any)?.id}_${Date.now()}`,
      table: `${orderType}_orders`,
      recordId: (newRecord as any)?.id,
      oldStatus: { status: (oldRecord as any)?.status },
      newStatus: { status: (newRecord as any)?.status },
      timestamp: new Date().toISOString(),
      operation: 'UPDATE'
    }

    this.notifyStatusCallbacks(`${orderType}_order_status`, statusUpdate)
  }

  /**
   * Subscribe to part number modification updates
   */
  subscribeToPartNumberModifications(callback: StatusSyncCallback): () => void {
    const subscriptionKey = 'part_number_modifications'
    
    if (!this.subscriptions.has(subscriptionKey)) {
      const channel = this.supabaseClient
        .channel(`part_modifications_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'part_number_modifications'
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            this.handlePartModificationChange(payload)
          }
        )
        .subscribe((status) => {
          console.log('Part modification subscription:', status)
          this.updateConnectionStatus()
        })

      this.subscriptions.set(subscriptionKey, channel)
    }

    // Add callback
    if (!this.statusCallbacks.has(subscriptionKey)) {
      this.statusCallbacks.set(subscriptionKey, [])
    }
    this.statusCallbacks.get(subscriptionKey)!.push(callback)

    // Return unsubscribe function
    return () => {
      const callbacks = this.statusCallbacks.get(subscriptionKey)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index > -1) {
          callbacks.splice(index, 1)
        }
      }
    }
  }

  /**
   * Handle part number modification changes
   */
  private handlePartModificationChange(payload: RealtimePostgresChangesPayload<any>): void {
    const { eventType, new: newRecord, old: oldRecord } = payload

    const statusUpdate: StatusUpdate = {
      id: `part_mod_${(newRecord as any)?.id || (oldRecord as any)?.id}_${Date.now()}`,
      table: 'part_number_modifications',
      recordId: (newRecord as any)?.id || (oldRecord as any)?.id,
      oldStatus: eventType === 'UPDATE' ? { status: (oldRecord as any)?.status } : undefined,
      newStatus: eventType !== 'DELETE' ? { 
        status: (newRecord as any)?.status,
        current_part_number: (newRecord as any)?.current_part_number,
        new_part_number: (newRecord as any)?.new_part_number
      } : undefined,
      timestamp: new Date().toISOString(),
      operation: eventType as any
    }

    this.notifyStatusCallbacks('part_number_modifications', statusUpdate)
  }

  /**
   * Track user activity for collaborative features
   */
  async broadcastUserActivity(
    table: string, 
    recordId: string, 
    action: UserActivity['action'],
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.userId || !this.userName) return

    const activity: UserActivity = {
      userId: this.userId,
      userName: this.userName,
      table,
      recordId,
      action,
      timestamp: new Date().toISOString(),
      metadata
    }

    // Broadcast to user activity channel
    const activityChannel = this.getOrCreateActivityChannel()
    await activityChannel.send({
      type: 'broadcast',
      event: 'user_activity',
      payload: activity
    })
  }

  /**
   * Subscribe to user activity for a specific table/record
   */
  subscribeToUserActivity(
    table: string, 
    recordId: string, 
    callback: UserActivityCallback
  ): () => void {
    const subscriptionKey = `activity_${table}_${recordId}`
    
    if (!this.activityCallbacks.has(subscriptionKey)) {
      this.activityCallbacks.set(subscriptionKey, [])
    }
    this.activityCallbacks.get(subscriptionKey)!.push(callback)

    // Make sure activity channel is set up
    this.getOrCreateActivityChannel()

    // Return unsubscribe function
    return () => {
      const callbacks = this.activityCallbacks.get(subscriptionKey)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index > -1) {
          callbacks.splice(index, 1)
        }
      }
    }
  }

  /**
   * Get or create user activity channel
   */
  private getOrCreateActivityChannel(): RealtimeChannel {
    const channelKey = 'user_activity'
    
    if (!this.subscriptions.has(channelKey)) {
      const channel = this.supabaseClient
        .channel(`user_activity_${Date.now()}`)
        .on('broadcast', { event: 'user_activity' }, (payload) => {
          this.handleUserActivity(payload.payload as UserActivity)
        })
        .subscribe((status) => {
          console.log('User activity subscription:', status)
          this.updateConnectionStatus()
        })

      this.subscriptions.set(channelKey, channel)
    }

    return this.subscriptions.get(channelKey)!
  }

  /**
   * Handle user activity events  
   */
  private handleUserActivity(activity: UserActivity): void {
    // Don't notify about our own activity
    if (activity.userId === this.userId) return

    const subscriptionKey = `activity_${activity.table}_${activity.recordId}`
    this.notifyActivityCallbacks(subscriptionKey, activity)
  }

  /**
   * Subscribe to connection status changes
   */
  subscribeToConnectionStatus(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.push(callback)
    
    // Immediately notify with current status
    callback(this.connectionStatus)

    return () => {
      const index = this.connectionCallbacks.indexOf(callback)
      if (index > -1) {
        this.connectionCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Force reconnection of all subscriptions
   */
  async reconnectAll(): Promise<void> {
    console.log('Forcing reconnection of all subscriptions...')
    
    this.connectionStatus.reconnectAttempts++
    
    const reconnectPromises = Array.from(this.subscriptions.entries()).map(async ([key, channel]) => {
      try {
        await channel.unsubscribe()
        // Small delay to allow cleanup
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Recreate subscription based on key
        if (key === 'inventory_status') {
          // Recreate inventory subscription
          this.subscriptions.delete(key)
          // Will be recreated on next callback registration
        } else if (key.includes('_order_status')) {
          // Recreate order subscriptions
          this.subscriptions.delete(key)
        } else if (key === 'part_number_modifications') {
          // Recreate part modification subscription
          this.subscriptions.delete(key)
        } else if (key === 'user_activity') {
          // Recreate activity channel
          this.subscriptions.delete(key)
        }
      } catch (error) {
        console.error(`Failed to reconnect subscription ${key}:`, error)
      }
    })

    await Promise.all(reconnectPromises)
    this.updateConnectionStatus()
    this.notifyConnectionCallbacks()
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus }
  }

  /**
   * Notify status callbacks
   */
  private notifyStatusCallbacks(subscriptionKey: string, update: StatusUpdate): void {
    const callbacks = this.statusCallbacks.get(subscriptionKey)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(update)
        } catch (error) {
          console.error('Error in status callback:', error)
        }
      })
    }
  }

  /**
   * Notify activity callbacks
   */
  private notifyActivityCallbacks(subscriptionKey: string, activity: UserActivity): void {
    const callbacks = this.activityCallbacks.get(subscriptionKey)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(activity)
        } catch (error) {
          console.error('Error in activity callback:', error)
        }
      })
    }
  }

  /**
   * Notify connection callbacks
   */
  private notifyConnectionCallbacks(): void {
    this.connectionCallbacks.forEach(callback => {
      try {
        callback(this.connectionStatus)
      } catch (error) {
        console.error('Error in connection callback:', error)
      }
    })
  }

  /**
   * Clean up all subscriptions and intervals
   */
  async cleanup(): Promise<void> {
    console.log('Cleaning up realtime subscriptions...')
    
    // Clear heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    // Unsubscribe from all channels
    const unsubscribePromises = Array.from(this.subscriptions.values()).map(channel =>
      channel.unsubscribe()
    )

    await Promise.all(unsubscribePromises)
    
    // Clear all maps
    this.subscriptions.clear()
    this.statusCallbacks.clear()
    this.activityCallbacks.clear()
    this.connectionCallbacks.length = 0

    this.connectionStatus = {
      isConnected: false,
      lastHeartbeat: new Date().toISOString(),
      subscriptions: [],
      reconnectAttempts: 0,
      connectionQuality: 'disconnected'
    }
  }

  /**
   * Get subscription statistics
   */
  getSubscriptionStats(): {
    totalSubscriptions: number
    activeSubscriptions: number
    statusCallbacks: number
    activityCallbacks: number
    connectionCallbacks: number
  } {
    const activeSubscriptions = Array.from(this.subscriptions.values())
      .filter(channel => channel.state === 'subscribed' as any).length

    const statusCallbackCount = Array.from(this.statusCallbacks.values())
      .reduce((sum, callbacks) => sum + callbacks.length, 0)

    const activityCallbackCount = Array.from(this.activityCallbacks.values())
      .reduce((sum, callbacks) => sum + callbacks.length, 0)

    return {
      totalSubscriptions: this.subscriptions.size,
      activeSubscriptions,
      statusCallbacks: statusCallbackCount,
      activityCallbacks: activityCallbackCount,
      connectionCallbacks: this.connectionCallbacks.length
    }
  }
}