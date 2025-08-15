'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, Check, Clock, History, Loader2, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'

interface PartNumber {
  pn_id: string
  pn: string
  description: string | null
}

interface ModificationHistory {
  history_id: string
  modification_date: string
  modification_reason: string
  traceability_notes: string | null
  business_value_adjustment: number | null
  approved_by_user_id: string | null
  approval_date: string | null
  original_pn: PartNumber
  modified_pn: PartNumber
  modified_by_user_id: string | null
}

interface InventoryItem {
  inventory_id: string
  serial_number: string | null
  condition: string | null
  quantity: number
  pn_master_table: PartNumber
}

interface PartNumberModificationModalProps {
  inventoryItem: InventoryItem
  repairOrderId: string
  trigger: React.ReactNode
  onModificationComplete?: () => void
}

const MODIFICATION_REASONS = [
  'Repair/Overhaul Process Change',
  'Technical Upgrade/Improvement',
  'Supersession/Part Number Update',
  'Configuration Change',
  'Engineering Change Order (ECO)',
  'Service Bulletin Compliance',
  'Airworthiness Directive Compliance',
  'Other (specify in notes)'
]

export default function PartNumberModificationModal({
  inventoryItem,
  repairOrderId,
  trigger,
  onModificationComplete
}: PartNumberModificationModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // Form state
  const [selectedPartNumber, setSelectedPartNumber] = useState<PartNumber | null>(null)
  const [modificationReason, setModificationReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [traceabilityNotes, setTraceabilityNotes] = useState('')
  const [businessValueAdjustment, setBusinessValueAdjustment] = useState<number | null>(null)
  
  // Search and history state
  const [partNumberSearch, setPartNumberSearch] = useState('')
  const [partNumberOptions, setPartNumberOptions] = useState<PartNumber[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [modificationHistory, setModificationHistory] = useState<ModificationHistory[]>([])

  // Search for part numbers
  const searchPartNumbers = useCallback(async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setPartNumberOptions([])
      return
    }

    setIsSearching(true)
    try {
      const { data, error } = await supabase
        .from('pn_master_table')
        .select('pn_id, pn, description')
        .or(`pn.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .neq('pn_id', inventoryItem.pn_master_table.pn_id) // Exclude current part number
        .limit(20)
        .order('pn')

      if (error) throw error
      setPartNumberOptions(data || [])
    } catch (error) {
      console.error('Error searching part numbers:', error)
      toast.error('Failed to search part numbers')
    } finally {
      setIsSearching(false)
    }
  }, [inventoryItem.pn_master_table.pn_id])

  // Fetch modification history
  const fetchModificationHistory = useCallback(async () => {
    try {
      const response = await fetch(`/api/part-number-history?inventory_id=${inventoryItem.inventory_id}`)
      if (!response.ok) throw new Error('Failed to fetch history')
      
      const result = await response.json()
      setModificationHistory(result.data || [])
    } catch (error) {
      console.error('Error fetching modification history:', error)
    }
  }, [inventoryItem.inventory_id])

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      fetchModificationHistory().finally(() => setIsLoading(false))
    }
  }, [isOpen, fetchModificationHistory])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchPartNumbers(partNumberSearch)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [partNumberSearch, searchPartNumbers])

  const resetForm = () => {
    setSelectedPartNumber(null)
    setModificationReason('')
    setCustomReason('')
    setTraceabilityNotes('')
    setBusinessValueAdjustment(null)
    setPartNumberSearch('')
    setPartNumberOptions([])
  }

  const handleSubmit = async () => {
    if (!selectedPartNumber) {
      toast.error('Please select a new part number')
      return
    }

    if (!modificationReason) {
      toast.error('Please provide a modification reason')
      return
    }

    if (modificationReason === 'Other (specify in notes)' && !customReason.trim()) {
      toast.error('Please specify the custom reason')
      return
    }

    setIsSubmitting(true)
    try {
      const reasonText = modificationReason === 'Other (specify in notes)' 
        ? customReason.trim() 
        : modificationReason

      const response = await fetch('/api/part-number-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventory_id: inventoryItem.inventory_id,
          repair_order_id: repairOrderId,
          original_pn_id: inventoryItem.pn_master_table.pn_id,
          modified_pn_id: selectedPartNumber.pn_id,
          modification_reason: reasonText,
          traceability_notes: traceabilityNotes.trim() || null,
          business_value_adjustment: businessValueAdjustment
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to modify part number')
      }

      const result = await response.json()
      toast.success(result.message || 'Part number modified successfully')
      
      resetForm()
      setIsOpen(false)
      onModificationComplete?.()
      await fetchModificationHistory()
    } catch (error) {
      console.error('Error modifying part number:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to modify part number')
    } finally {
      setIsSubmitting(false)
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Modify Part Number
          </DialogTitle>
          <DialogDescription>
            Modify the part number for inventory item with proper traceability and approval workflow.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Part Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Current Part Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-slate-500">Part Number</Label>
                    <div className="font-mono font-bold">{inventoryItem.pn_master_table.pn}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Serial Number</Label>
                    <div>{inventoryItem.serial_number || 'N/A'}</div>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-slate-500">Description</Label>
                    <div>{inventoryItem.pn_master_table.description || 'N/A'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Modification Form */}
            <div className="space-y-4">
              <h3 className="font-medium">New Part Number Selection</h3>
              
              {/* Part Number Search */}
              <div>
                <Label htmlFor="partNumberSearch">Search Part Numbers</Label>
                <div className="relative">
                  <Input
                    id="partNumberSearch"
                    placeholder="Search by part number or description..."
                    value={partNumberSearch}
                    onChange={(e) => setPartNumberSearch(e.target.value)}
                    className="pl-10"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
                  )}
                </div>
              </div>

              {/* Part Number Options */}
              {partNumberOptions.length > 0 && (
                <div className="space-y-2">
                  <Label>Select New Part Number</Label>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {partNumberOptions.map((pn) => (
                      <div
                        key={pn.pn_id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedPartNumber?.pn_id === pn.pn_id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => setSelectedPartNumber(pn)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-mono font-bold">{pn.pn}</div>
                            <div className="text-sm text-slate-600">{pn.description || 'No description'}</div>
                          </div>
                          {selectedPartNumber?.pn_id === pn.pn_id && (
                            <Check className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Part Number Display */}
              {selectedPartNumber && (
                <Alert>
                  <Check className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Selected:</strong> {selectedPartNumber.pn} - {selectedPartNumber.description}
                  </AlertDescription>
                </Alert>
              )}

              <Separator />

              {/* Modification Reason */}
              <div>
                <Label htmlFor="modificationReason">Modification Reason *</Label>
                <Select value={modificationReason} onValueChange={setModificationReason}>
                  <SelectTrigger id="modificationReason">
                    <SelectValue placeholder="Select reason for modification" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODIFICATION_REASONS.map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Reason */}
              {modificationReason === 'Other (specify in notes)' && (
                <div>
                  <Label htmlFor="customReason">Custom Reason *</Label>
                  <Input
                    id="customReason"
                    placeholder="Specify the custom reason for modification"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                  />
                </div>
              )}

              {/* Traceability Notes */}
              <div>
                <Label htmlFor="traceabilityNotes">Traceability Notes</Label>
                <Textarea
                  id="traceabilityNotes"
                  placeholder="Additional notes for traceability and compliance..."
                  value={traceabilityNotes}
                  onChange={(e) => setTraceabilityNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Business Value Adjustment */}
              <div>
                <Label htmlFor="businessValue">Business Value Adjustment ($)</Label>
                <Input
                  id="businessValue"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={businessValueAdjustment || ''}
                  onChange={(e) => setBusinessValueAdjustment(
                    e.target.value ? parseFloat(e.target.value) : null
                  )}
                />
                <div className="text-xs text-slate-500 mt-1">
                  Optional: Adjustment to inventory value due to part number change
                </div>
              </div>
            </div>

            {/* Modification History */}
            {modificationHistory.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Modification History
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {modificationHistory.map((history) => (
                    <Card key={history.history_id} className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {history.original_pn.pn} → {history.modified_pn.pn}
                            </Badge>
                            {history.approved_by_user_id ? (
                              <Badge className="bg-green-100 text-green-800 text-xs">
                                <Check className="h-3 w-3 mr-1" />
                                Approved
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-slate-600">
                            <strong>Reason:</strong> {history.modification_reason}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {formatDate(history.modification_date)} by System User
                            {history.approved_by_user_id && history.approval_date && (
                              <span> • Approved by System User on {formatDate(history.approval_date)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Warning */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Part number modifications will update the inventory record immediately 
                and create a permanent audit trail. This action cannot be undone. Ensure the new part number 
                is correct and compliant with aviation regulations.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !selectedPartNumber || !modificationReason}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Modifying...
              </>
            ) : (
              'Modify Part Number'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}