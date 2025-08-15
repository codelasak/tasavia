'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Clock, History, Info, Loader2, MapPin, Package2, RefreshCw } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'

interface DualStatus {
  physical_status: 'depot' | 'in_repair' | 'in_transit'
  business_status: 'available' | 'reserved' | 'sold'
  status_updated_at?: string
  status_updated_by?: string
}

interface StatusChange {
  timestamp: string
  physical_status: string
  business_status: string
  changed_by: string
  reason?: string
}

interface DualStatusBadgesProps {
  inventory_id: string
  physical_status: string
  business_status: string
  status_updated_at?: string
  status_updated_by?: string
  size?: 'sm' | 'md' | 'lg'
  showHistory?: boolean
  onStatusChange?: (newStatus: DualStatus) => void
}

const PHYSICAL_STATUS_CONFIG = {
  depot: { label: 'At Depot', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Package2 },
  in_repair: { label: 'In Repair', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: RefreshCw },
  in_transit: { label: 'In Transit', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: MapPin }
}

const BUSINESS_STATUS_CONFIG = {
  available: { label: 'Available', color: 'bg-green-100 text-green-800 border-green-200' },
  reserved: { label: 'Reserved', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  sold: { label: 'Sold', color: 'bg-slate-100 text-slate-800 border-slate-200' }
}

const STATUS_UPDATE_REASONS = [
  'Received at depot',
  'Sent to repair facility',
  'Shipped to customer',
  'Reserved for order',
  'Sale completed',
  'Quality check',
  'Inventory adjustment',
  'Other (specify in notes)'
]

export default function DualStatusBadges({
  inventory_id,
  physical_status,
  business_status,
  status_updated_at,
  status_updated_by,
  size = 'md',
  showHistory = true,
  onStatusChange
}: DualStatusBadgesProps) {
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [statusHistory, setStatusHistory] = useState<StatusChange[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Form state
  const [newPhysicalStatus, setNewPhysicalStatus] = useState(physical_status)
  const [newBusinessStatus, setNewBusinessStatus] = useState(business_status)
  const [updateReason, setUpdateReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [updateNotes, setUpdateNotes] = useState('')

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-2.5 py-1.5'
  }

  const physicalConfig = PHYSICAL_STATUS_CONFIG[physical_status as keyof typeof PHYSICAL_STATUS_CONFIG] || 
    { label: physical_status, color: 'bg-gray-100 text-gray-800 border-gray-200', icon: Package2 }
  
  const businessConfig = BUSINESS_STATUS_CONFIG[business_status as keyof typeof BUSINESS_STATUS_CONFIG] || 
    { label: business_status, color: 'bg-gray-100 text-gray-800 border-gray-200' }

  const fetchStatusHistory = useCallback(async () => {
    if (!showHistory) return
    
    setLoadingHistory(true)
    try {
      const response = await fetch(`/api/inventory/status-history?inventory_id=${inventory_id}`)
      if (!response.ok) throw new Error('Failed to fetch status history')
      
      const result = await response.json()
      if (result.success) {
        setStatusHistory(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching status history:', error)
      toast.error('Failed to load status history')
    } finally {
      setLoadingHistory(false)
    }
  }, [inventory_id, showHistory])

  useEffect(() => {
    if (historyDialogOpen) {
      fetchStatusHistory()
    }
  }, [historyDialogOpen, fetchStatusHistory])

  const resetForm = () => {
    setNewPhysicalStatus(physical_status)
    setNewBusinessStatus(business_status)
    setUpdateReason('')
    setCustomReason('')
    setUpdateNotes('')
  }

  const handleStatusUpdate = async () => {
    if (newPhysicalStatus === physical_status && newBusinessStatus === business_status) {
      toast.error('No status changes detected')
      return
    }

    if (!updateReason) {
      toast.error('Please provide a reason for the status update')
      return
    }

    if (updateReason === 'Other (specify in notes)' && !customReason.trim()) {
      toast.error('Please specify the custom reason')
      return
    }

    setIsUpdating(true)
    try {
      const reasonText = updateReason === 'Other (specify in notes)' 
        ? customReason.trim() 
        : updateReason

      const response = await fetch('/api/inventory/dual-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventory_id,
          physical_status: newPhysicalStatus !== physical_status ? newPhysicalStatus : undefined,
          business_status: newBusinessStatus !== business_status ? newBusinessStatus : undefined,
          notes: updateNotes.trim() || reasonText
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update status')
      }

      const result = await response.json()
      toast.success(result.message || 'Status updated successfully')
      
      // Notify parent component
      onStatusChange?.({
        physical_status: newPhysicalStatus as any,
        business_status: newBusinessStatus as any,
        status_updated_at: new Date().toISOString()
      })
      
      resetForm()
      setStatusDialogOpen(false)
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusTransitionIcon = (from: string, to: string, type: 'physical' | 'business') => {
    if (from === to) return null
    
    if (type === 'physical') {
      if (to === 'in_transit') return <MapPin className="h-3 w-3" />
      if (to === 'in_repair') return <RefreshCw className="h-3 w-3" />
      if (to === 'depot') return <Package2 className="h-3 w-3" />
    }
    
    return <Clock className="h-3 w-3" />
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {/* Physical Status Badge */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              className={`${physicalConfig.color} border ${sizeClasses[size]} flex items-center gap-1`}
              variant="outline"
            >
              <physicalConfig.icon className="h-3 w-3" />
              {physicalConfig.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Physical Status: {physicalConfig.label}</p>
            {status_updated_at && <p className="text-xs">Updated: {formatDate(status_updated_at)}</p>}
          </TooltipContent>
        </Tooltip>

        {/* Business Status Badge */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              className={`${businessConfig.color} border ${sizeClasses[size]}`}
              variant="outline"
            >
              {businessConfig.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Business Status: {businessConfig.label}</p>
            {status_updated_at && <p className="text-xs">Updated: {formatDate(status_updated_at)}</p>}
          </TooltipContent>
        </Tooltip>

        {/* Status Actions */}
        <div className="flex gap-1">
          {/* Update Status */}
          <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-slate-100">
                <RefreshCw className="h-3 w-3" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Update Status</DialogTitle>
                <DialogDescription>
                  Update the physical and business status for this inventory item.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="physicalStatus">Physical Status</Label>
                  <Select value={newPhysicalStatus} onValueChange={setNewPhysicalStatus}>
                    <SelectTrigger id="physicalStatus">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="depot">At Depot</SelectItem>
                      <SelectItem value="in_repair">In Repair</SelectItem>
                      <SelectItem value="in_transit">In Transit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="businessStatus">Business Status</Label>
                  <Select value={newBusinessStatus} onValueChange={setNewBusinessStatus}>
                    <SelectTrigger id="businessStatus">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="reserved">Reserved</SelectItem>
                      <SelectItem value="sold">Sold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="updateReason">Reason for Update *</Label>
                  <Select value={updateReason} onValueChange={setUpdateReason}>
                    <SelectTrigger id="updateReason">
                      <SelectValue placeholder="Select reason..." />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_UPDATE_REASONS.map((reason) => (
                        <SelectItem key={reason} value={reason}>
                          {reason}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {updateReason === 'Other (specify in notes)' && (
                  <div>
                    <Label htmlFor="customReason">Custom Reason *</Label>
                    <input
                      id="customReason"
                      className="w-full p-2 border rounded-md"
                      placeholder="Specify custom reason..."
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="updateNotes">Additional Notes</Label>
                  <Textarea
                    id="updateNotes"
                    placeholder="Optional additional notes..."
                    value={updateNotes}
                    onChange={(e) => setUpdateNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleStatusUpdate}
                  disabled={isUpdating || !updateReason}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    'Update Status'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Status History */}
          {showHistory && (
            <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-slate-100">
                  <History className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-96 overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Status History</DialogTitle>
                  <DialogDescription>
                    Complete history of status changes for this inventory item.
                  </DialogDescription>
                </DialogHeader>
                
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Loading history...
                  </div>
                ) : statusHistory.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    No status history available
                  </div>
                ) : (
                  <div className="space-y-3">
                    {statusHistory.map((change, index) => (
                      <Card key={index} className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {getStatusTransitionIcon(
                                index < statusHistory.length - 1 ? statusHistory[index + 1].physical_status : '', 
                                change.physical_status, 
                                'physical'
                              )}
                              <Badge className={`${PHYSICAL_STATUS_CONFIG[change.physical_status as keyof typeof PHYSICAL_STATUS_CONFIG]?.color || 'bg-gray-100 text-gray-800'} border text-xs`}>
                                {PHYSICAL_STATUS_CONFIG[change.physical_status as keyof typeof PHYSICAL_STATUS_CONFIG]?.label || change.physical_status}
                              </Badge>
                              <Badge className={`${BUSINESS_STATUS_CONFIG[change.business_status as keyof typeof BUSINESS_STATUS_CONFIG]?.color || 'bg-gray-100 text-gray-800'} border text-xs`}>
                                {BUSINESS_STATUS_CONFIG[change.business_status as keyof typeof BUSINESS_STATUS_CONFIG]?.label || change.business_status}
                              </Badge>
                            </div>
                            <div className="text-xs text-slate-500">
                              {formatDate(change.timestamp)} by {change.changed_by || 'System'}
                            </div>
                            {change.reason && (
                              <div className="text-xs text-slate-600 mt-1">
                                <strong>Reason:</strong> {change.reason}
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}