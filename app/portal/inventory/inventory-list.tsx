'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Edit, Trash2, MapPin, Eye, Wifi, WifiOff, RefreshCw, Activity, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { RealtimeStatusSyncManager, ConnectionStatus } from '@/lib/realtime-status-sync'
import { toast } from 'sonner'
import { InventoryDialog } from '@/components/inventory/InventoryDialog'
import DualStatusBadges from '@/components/inventory/DualStatusBadges'
import { canCancelInventoryItem, canDeleteInventoryItem } from '@/lib/types/inventory'

interface InventoryItem {
  inventory_id: string
  pn_id: string
  sn: string | null
  location: string | null
  po_price: number | null
  remarks: string | null
  status: string | null
  physical_status: 'depot' | 'in_repair' | 'in_transit'
  business_status: 'available' | 'reserved' | 'sold' | 'cancelled'
  status_updated_at: string | null
  status_updated_by: string | null
  po_id_original: string | null
  po_number_original: string | null 
  created_at: string | null
  updated_at: string | null
  pn_master_table?: {
    pn: string
    description: string | null
  }
}

interface InventoryListProps {
  initialInventory: InventoryItem[]
}

export default function InventoryList({ initialInventory }: InventoryListProps) {
  const router = useRouter()
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory)
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>(initialInventory)
  const [searchTerm, setSearchTerm] = useState('')
  const [locationFilter, setLocationFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [locations, setLocations] = useState<string[]>([])
  const [statuses, setStatuses] = useState<string[]>([])
  const [physicalStatuses, setPhysicalStatuses] = useState<string[]>([])
  const [businessStatuses, setBusinessStatuses] = useState<string[]>([])
  const [physicalStatusFilter, setPhysicalStatusFilter] = useState<string>('all')
  const [businessStatusFilter, setBusinessStatusFilter] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [cancelLoading, setCancelLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Real-time state
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    lastHeartbeat: new Date().toISOString(),
    subscriptions: [],
    reconnectAttempts: 0,
    connectionQuality: 'disconnected'
  })
  const [realtimeSync, setRealtimeSync] = useState<RealtimeStatusSyncManager | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)

  useEffect(() => {
    // Extract unique locations and statuses for filters
    const locationData = inventory?.map(item => item.location).filter(Boolean) || []
    const statusData = inventory?.map(item => item.status).filter(Boolean) || []
    const physicalStatusData = inventory?.map(item => item.physical_status).filter(Boolean) || []
    const businessStatusData = inventory?.map(item => item.business_status).filter(Boolean) || []

    const uniqueLocations = Array.from(new Set(locationData)) as string[]
    const uniqueStatuses = Array.from(new Set(statusData)) as string[]
    const uniquePhysicalStatuses = Array.from(new Set(physicalStatusData)) as string[]
    const uniqueBusinessStatuses = Array.from(new Set(businessStatusData)) as string[]

    setLocations(uniqueLocations)
    setStatuses(uniqueStatuses)
    setPhysicalStatuses(uniquePhysicalStatuses)
    setBusinessStatuses(uniqueBusinessStatuses)
  }, [inventory])

  // Initialize real-time synchronization
  useEffect(() => {
    const initializeRealtime = async () => {
      try {
        // Get current user for real-time tracking
        const { data: { user } } = await supabase.auth.getUser()

        const syncManager = new RealtimeStatusSyncManager(
          user?.id,
          user?.email?.split('@')[0] || 'Unknown'
        )

        setRealtimeSync(syncManager)

        // Subscribe to ALL inventory changes (INSERT, UPDATE, DELETE) - including PO completion
        const unsubscribeAllChanges = syncManager.subscribeToAllInventoryChanges((update) => {
          handleInventoryUpdate(update)
        })

        // Subscribe to inventory status changes (for detailed status notifications)
        const unsubscribeStatusChanges = syncManager.subscribeToInventoryStatus((update) => {
          handleInventoryStatusUpdate(update)
        })

        // Subscribe to connection status changes
        const unsubscribeConnection = syncManager.subscribeToConnectionStatus((status) => {
          setConnectionStatus(status)

          // Show connection status notifications
          if (status.isConnected && connectionStatus.connectionQuality === 'disconnected') {
            toast.success('Real-time connection established', {
              description: 'Inventory updates will appear in real-time'
            })
          } else if (!status.isConnected && connectionStatus.isConnected) {
            toast.error('Real-time connection lost', {
              description: 'Manual refresh may be required for updates'
            })
          }
        })

        // Set up periodic connection check
        const connectionCheckInterval = setInterval(() => {
          const currentStatus = syncManager.getConnectionStatus()
          if (!currentStatus.isConnected && connectionStatus.isConnected) {
            // Connection lost, try to reconnect
            syncManager.reconnectAll()
          }
        }, 30000) // Check every 30 seconds

        // Clean up on unmount
        return () => {
          clearInterval(connectionCheckInterval)
          unsubscribeAllChanges()
          unsubscribeStatusChanges()
          unsubscribeConnection()
          syncManager.cleanup()
        }
      } catch (error) {
        console.error('Failed to initialize real-time sync:', error)
        toast.error('Failed to enable real-time updates', {
          description: 'Manual refresh will be used for inventory updates'
        })

        // Set connection status to disconnected
        setConnectionStatus(prev => ({
          ...prev,
          isConnected: false,
          connectionQuality: 'disconnected'
        }))
      }
    }

    initializeRealtime()
  }, [])

  useEffect(() => {
    let filtered = inventory.filter(item =>
      (item.pn_master_table?.pn && item.pn_master_table.pn.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.pn_master_table?.description && item.pn_master_table.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.sn && item.sn.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.location && item.location.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    if (locationFilter !== 'all') {
      filtered = filtered.filter(item => item.location === locationFilter)
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter)
    }

    if (physicalStatusFilter !== 'all') {
      filtered = filtered.filter(item => item.physical_status === physicalStatusFilter)
    }

    if (businessStatusFilter !== 'all') {
      filtered = filtered.filter(item => item.business_status === businessStatusFilter)
    }

    setFilteredInventory(filtered)
  }, [inventory, searchTerm, locationFilter, statusFilter, physicalStatusFilter, businessStatusFilter])

  // Handle real-time inventory status updates (specific status changes)
  const handleInventoryStatusUpdate = async (update: any) => {
    console.log('Real-time inventory status update:', update)

    setLastUpdate(new Date().toISOString())

    // Only handle UPDATE operations for status changes
    if (update.operation === 'UPDATE' && update.newStatus) {
      try {
        // Update existing record in state with status changes
        setInventory(prev => prev.map(item => {
          if (item.inventory_id === update.recordId) {
            const updatedItem = {
              ...item,
              ...(update.newStatus.physical_status && { physical_status: update.newStatus.physical_status }),
              ...(update.newStatus.business_status && { business_status: update.newStatus.business_status }),
              status_updated_at: update.timestamp,
              status_updated_by: update.userId
            }
            return updatedItem
          }
          return item
        }))

        // Show detailed notification for status changes
        if (update.newStatus.physical_status || update.newStatus.business_status) {
          toast.info('Inventory status updated', {
            description: `Item status changed to ${update.newStatus.physical_status || update.newStatus.business_status}`
          })
        }
      } catch (error) {
        console.error('Error handling status UPDATE:', error)
        toast.error('Failed to process inventory status update')
      }
    }
  }

  // Handle real-time inventory updates (all changes including PO completion)
  const handleInventoryUpdate = async (update: any) => {
    console.log('Real-time inventory update:', update)

    setLastUpdate(new Date().toISOString())

    // Handle different operation types
    switch (update.operation) {
      case 'INSERT':
        // Fetch the complete new record with part number details
        try {
          const { data: newRecord, error } = await supabase
            .rpc('get_inventory_with_parts')
            .eq('inventory_id', update.recordId)
            .single()

          if (error) {
            console.error('Error fetching new inventory record:', error)
            // Fallback: fetch basic record
            const { data: basicRecord, error: basicError } = await supabase
              .from('inventory')
              .select('*')
              .eq('inventory_id', update.recordId)
              .single()

            if (basicError) {
              console.error('Error fetching basic record:', basicError)
              toast.error('Failed to fetch new inventory item')
              return
            }

            if (basicRecord) {
              const castRecord = basicRecord as any
              setInventory(prev => [castRecord, ...prev])

              // Check if this is from PO completion
              if (castRecord.po_id_original && castRecord.po_number_original) {
                toast.success('New inventory item from PO completion', {
                  description: `Item ${castRecord.pn_id || 'Unknown'} added from PO ${castRecord.po_number_original}`
                })
              } else {
                toast.success('New inventory item added')
              }
            }
            return
          }

          if (newRecord) {
            const castRecord = newRecord as any
            setInventory(prev => [castRecord, ...prev])

            // Check if this is from PO completion
            if (castRecord.po_id_original && castRecord.po_number_original) {
              toast.success('New inventory item from PO completion', {
                description: `Item ${castRecord.pn_master_table?.pn || castRecord.pn_id || 'Unknown'} added from PO ${castRecord.po_number_original}`
              })
            } else {
              toast.success('New inventory item added')
            }
          }
        } catch (error) {
          console.error('Error handling INSERT:', error)
          toast.error('Failed to process new inventory item')
        }
        break

      case 'UPDATE':
        try {
          // Update existing record in state
          setInventory(prev => prev.map(item => {
            if (item.inventory_id === update.recordId) {
              // Apply the status updates from the real-time payload
              const updatedItem = {
                ...item,
                ...(update.newStatus.physical_status && { physical_status: update.newStatus.physical_status }),
                ...(update.newStatus.business_status && { business_status: update.newStatus.business_status }),
                status_updated_at: update.timestamp,
                status_updated_by: update.userId
              }
              return updatedItem
            }
            return item
          }))

          // Show notification for status changes
          if (update.newStatus.physical_status || update.newStatus.business_status) {
            toast.info('Inventory status updated', {
              description: `Item status changed to ${update.newStatus.physical_status || update.newStatus.business_status}`
            })
          }
        } catch (error) {
          console.error('Error handling UPDATE:', error)
          toast.error('Failed to process inventory update')
        }
        break

      case 'DELETE':
        try {
          // Remove record from state
          setInventory(prev => prev.filter(item => item.inventory_id !== update.recordId))
          toast.info('Inventory item removed')
        } catch (error) {
          console.error('Error handling DELETE:', error)
          toast.error('Failed to process inventory deletion')
        }
        break

      default:
        console.warn('Unknown operation type:', update.operation)
    }
  }

  const fetchInventory = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Use the RPC function to avoid PostgREST relationship ambiguity
      const { data, error } = await supabase.rpc('get_inventory_with_parts')

      if (error) {
        console.error('RPC query failed, trying direct query:', error)
        
        // Fallback to direct query without relationship
        const { data: inventoryData, error: inventoryError } = await supabase
          .from('inventory')
          .select(`
            inventory_id,
            pn_id,
            sn,
            location,
            po_price,
            remarks,
            status,
            physical_status,
            business_status,
            status_updated_at,
            status_updated_by,
            po_id_original,
            po_number_original,
            created_at,
            updated_at
          `)
          .order('updated_at', { ascending: false })

        if (inventoryError) {
          console.error('Direct inventory query error:', inventoryError)
          throw inventoryError
        }

        // Manually fetch part numbers for each inventory item
        if (inventoryData && inventoryData.length > 0) {
          const pnIds = inventoryData.map(item => item.pn_id)
          const { data: partNumbers, error: pnError } = await supabase
            .from('pn_master_table')
            .select('pn_id, pn, description')
            .in('pn_id', pnIds)

          if (pnError) {
            console.error('Part numbers query error:', pnError)
          } else {
            // Join the data manually
            const joinedData = inventoryData.map(item => ({
              ...item,
              pn_master_table: partNumbers?.find(pn => pn.pn_id === item.pn_id) || { pn: '', description: null }
            }))
            setInventory(joinedData as any || [])
            return
          }
        }

        setInventory(inventoryData as any || [])
        return
      }
      
      setInventory(data as any || [])
    } catch (error: any) {
      console.error('Error fetching inventory:', error)
      const errorMessage = error.message || 'Failed to fetch inventory'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item)
    setDialogOpen(true)
  }

  const handleDelete = async (item: InventoryItem) => {
    // Check if item can be deleted using the new deletion validation function
    if (!canDeleteInventoryItem(item.physical_status, item.business_status, item.status || undefined)) {
      toast.error('This item cannot be deleted', {
        description: 'Only cancelled items can be deleted'
      })
      return
    }

    // Enhanced confirmation based on business status
    let confirmMessage = ''

    if (item.business_status === 'cancelled') {
      confirmMessage = `Are you sure you want to delete this cancelled inventory item?`
    } else if (item.business_status === 'available') {
      // This case should not be reached due to validation, but keep for safety
      confirmMessage = `This available item cannot be deleted. Only cancelled items can be deleted.`
    } else if (item.business_status === 'reserved') {
      confirmMessage = `This inventory item is RESERVED for a sales order. Deleting it may cause issues. Are you sure you want to proceed?`
    } else if (item.business_status === 'sold') {
      confirmMessage = `This inventory item has been SOLD. Deleting it may cause data integrity issues. Are you sure you want to proceed?`
    } else {
      confirmMessage = `Are you sure you want to delete this inventory item?`
    }

    if (!confirm(confirmMessage)) return

    try {
      setDeleteLoading(item.inventory_id)
      
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('inventory_id', item.inventory_id)

      if (error) {
        console.error('Delete inventory error:', error)
        throw new Error(error.message || 'Failed to delete inventory item')
      }
      
      setInventory(inventory.filter(i => i.inventory_id !== item.inventory_id))
      toast.success('Inventory item deleted successfully')
    } catch (error: any) {
      console.error('Error deleting inventory item:', error)
      toast.error(error.message || 'Failed to delete inventory item')
    } finally {
      setDeleteLoading(null)
    }
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditingItem(null)
    fetchInventory()
  }

  const handleCancel = async (item: InventoryItem) => {
    // Check if item can be cancelled using our validation function
    if (!canCancelInventoryItem(item.physical_status, item.business_status, item.status || undefined)) {
      toast.error('This item cannot be cancelled', {
        description: 'Only available items at depot (In Stock) can be cancelled'
      })
      return
    }

    const cancelReason = prompt('Please provide a reason for cancellation:')
    if (!cancelReason) {
      return // User cancelled the operation
    }

    try {
      setCancelLoading(item.inventory_id)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()

      // Get current PO information before cancelling
      const { data: currentItem } = await supabase
        .from('inventory')
        .select('po_id_original, po_number_original')
        .eq('inventory_id', item.inventory_id)
        .single()

      // Update inventory status to cancelled using direct SQL
      // We need to update both business_status and status to work around the trigger
      const { error } = await supabase
        .from('inventory')
        .update({
          business_status: 'cancelled' as any,  // Update this first so trigger maps to 'Cancelled'
          status: 'Cancelled',
          status_updated_at: new Date().toISOString(),
          status_updated_by: user?.id,
          remarks: `Cancelled: ${cancelReason}`,
          updated_at: new Date().toISOString()
        })
        .eq('inventory_id', item.inventory_id)

      if (error) {
        console.error('Cancel inventory error:', error)
        throw new Error(error.message || 'Failed to cancel inventory item')
      }

      // Check if we need to update the PO status
      if (currentItem?.po_id_original) {
        const { data: remainingItems } = await supabase
          .from('inventory')
          .select('inventory_id')
          .eq('po_id_original', currentItem.po_id_original)
          .neq('status', 'Cancelled')

        // If all items from PO are cancelled, update PO status
        if (!remainingItems || remainingItems.length === 0) {
          await supabase
            .from('purchase_orders')
            .update({
              status: 'Cancelled',
              updated_at: new Date().toISOString()
            })
            .eq('po_id', currentItem.po_id_original)

          toast.success('Inventory item cancelled successfully. All items from PO are now cancelled, so PO status has been updated to Cancelled.')
        } else {
          toast.success('Inventory item cancelled successfully')
        }
      } else {
        toast.success('Inventory item cancelled successfully')
      }

      // Refresh the inventory list
      fetchInventory()
    } catch (error: any) {
      console.error('Error cancelling inventory item:', error)
      toast.error(error.message || 'Failed to cancel inventory item')
    } finally {
      setCancelLoading(null)
    }
  }


  const getStatusBadge = (status: string) => {
    const colors = {
      'Available': 'bg-green-100 text-green-800 border-green-200',
      'Reserved': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Sold': 'bg-blue-100 text-blue-800 border-blue-200',
      'Damaged': 'bg-red-100 text-red-800 border-red-200',
      'Under Repair': 'bg-purple-100 text-purple-800 border-purple-200',
      'Cancelled': 'bg-red-200 text-red-900 border-red-300'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Inventory
              {connectionStatus.isConnected && (
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${
                    connectionStatus.connectionQuality === 'excellent' ? 'bg-green-500' :
                    connectionStatus.connectionQuality === 'good' ? 'bg-yellow-500' :
                    connectionStatus.connectionQuality === 'poor' ? 'bg-orange-500' : 'bg-red-500'
                  }`} />
                  <Wifi className="h-4 w-4 text-green-600" />
                </div>
              )}
              {!connectionStatus.isConnected && (
                <WifiOff className="h-4 w-4 text-red-600" />
              )}
            </CardTitle>
            <CardDescription>
              {inventory.length} inventory items • {filteredInventory.length} shown
              {lastUpdate && (
                <span className="text-xs text-slate-500 ml-2">
                  • Last update: {new Date(lastUpdate).toLocaleTimeString()}
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => realtimeSync?.reconnectAll()}
              disabled={!connectionStatus.isConnected}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Reconnect
            </Button>
            <div className="text-xs text-slate-500">
              {connectionStatus.connectionQuality === 'excellent' && 'Excellent'}
              {connectionStatus.connectionQuality === 'good' && 'Good'}
              {connectionStatus.connectionQuality === 'poor' && 'Poor'}
              {connectionStatus.connectionQuality === 'disconnected' && 'Disconnected'}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-2 pt-4 pb-4">
          <div className="relative w-full sm:w-auto flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search part numbers, descriptions, serial numbers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map(location => (
                <SelectItem key={location} value={location}>{location}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Legacy Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Legacy</SelectItem>
              {statuses.map(status => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={physicalStatusFilter} onValueChange={setPhysicalStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Physical Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Physical</SelectItem>
              {physicalStatuses.map(status => (
                <SelectItem key={status} value={status}>
                  {status === 'depot' ? 'In Stock' : 
                   status === 'in_repair' ? 'In Repair' : 
                   status === 'in_transit' ? 'In Transit' : status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={businessStatusFilter} onValueChange={setBusinessStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Business Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Business</SelectItem>
              {businessStatuses.map(status => (
                <SelectItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          {filteredInventory.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-slate-500">No inventory items found</div>
              {(searchTerm || locationFilter !== 'all' || statusFilter !== 'all' || physicalStatusFilter !== 'all' || businessStatusFilter !== 'all') && (
                <Button
                  variant="link"
                  onClick={() => {
                    setSearchTerm('')
                    setLocationFilter('all')
                    setStatusFilter('all')
                    setPhysicalStatusFilter('all')
                    setBusinessStatusFilter('all')
                  }}
                  className="mt-2"
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredInventory.map((item) => (
                <Card key={item.inventory_id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-base text-slate-900">{item.pn_master_table?.pn || 'N/A'}</span>
                          <DualStatusBadges
                            inventory_id={item.inventory_id}
                            physical_status={item.physical_status}
                            business_status={item.business_status}
                            status_updated_at={item.status_updated_at}
                            status_updated_by={item.status_updated_by}
                            size="sm"
                            showHistory={true}
                            onStatusChange={(newStatus) => {
                              // Update the local state with the new status
                              setInventory(prev => prev.map(inv => 
                                inv.inventory_id === item.inventory_id 
                                  ? { 
                                      ...inv, 
                                      physical_status: newStatus.physical_status,
                                      business_status: newStatus.business_status,
                                      status_updated_at: newStatus.status_updated_at
                                    }
                                  : inv
                              ))
                            }}
                          />
                          {item.location && (
                            <span className="flex items-center text-xs text-slate-500"><MapPin className="h-4 w-4 mr-1" />{item.location}</span>
                          )}
                        </div>
                        {item.pn_master_table?.description && (
                          <div className="text-xs text-slate-500 line-clamp-2 mb-1">{item.pn_master_table.description}</div>
                        )}
                        <div className="flex gap-4 text-xs">
                          <span>Price: <b>${(item.po_price || 0).toFixed(2)}</b></span>
                          {item.sn && <span>S/N: <b>{item.sn}</b></span>}
                        </div>
                        {item.po_number_original && (
                          <div className="text-xs text-slate-400 mt-1">
                            From PO: <span className="font-mono">{item.po_number_original}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 ml-4">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => router.push(`/portal/inventory/${item.inventory_id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(item)}
                          disabled={deleteLoading === item.inventory_id || cancelLoading === item.inventory_id}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {/* Cancel button - only show for items that can be cancelled (not already cancelled) */}
                        {canCancelInventoryItem(item.physical_status, item.business_status, item.status || undefined) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            onClick={() => handleCancel(item)}
                            disabled={cancelLoading === item.inventory_id || deleteLoading === item.inventory_id}
                            title="Cancel item"
                          >
                            {cancelLoading === item.inventory_id ? (
                              <div className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        {/* Delete button - only show for items that can be deleted (cancelled items) */}
                        {canDeleteInventoryItem(item.physical_status, item.business_status, item.status || undefined) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(item)}
                            disabled={deleteLoading === item.inventory_id || cancelLoading === item.inventory_id}
                            title="Delete item"
                          >
                            {deleteLoading === item.inventory_id ? (
                              <div className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      <InventoryDialog open={dialogOpen} onClose={handleDialogClose} item={editingItem} />
    </Card>
  )
}
