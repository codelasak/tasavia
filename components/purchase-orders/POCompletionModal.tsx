'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Package, AlertTriangle, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface POItem {
  quantity: number
  unit_price: number
  condition: string | null
  description: string | null
  pn_master_table: {
    pn: string
    description: string | null
  } | null
}

interface POCompletionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  poId: string
  poNumber: string
  currentStatus: string
}

export default function POCompletionModal({
  isOpen,
  onClose,
  onConfirm,
  poId,
  poNumber,
  currentStatus
}: POCompletionModalProps) {
  const [loading, setLoading] = useState(false)
  const [previewItems, setPreviewItems] = useState<POItem[]>([])
  const [fetchingPreview, setFetchingPreview] = useState(false)
  const [inventoryExists, setInventoryExists] = useState(false)

  useEffect(() => {
    if (isOpen && currentStatus !== 'Completed') {
      fetchPreview()
      checkExistingInventory()
    }
  }, [isOpen, poId, currentStatus])

  const fetchPreview = async () => {
    setFetchingPreview(true)
    try {
      // Get PO items that would be created as inventory
      const { data: poItems, error } = await supabase
        .from('po_items')
        .select(`
          quantity,
          unit_price,
          condition,
          description,
          pn_master_table (
            pn,
            description
          )
        `)
        .eq('po_id', poId)

      if (error) {
        console.error('Error fetching PO items:', error)
        toast.error('Failed to load PO items preview')
        return
      }

      // Transform the data to handle potential array response from Supabase
      const transformedItems = (poItems || []).map(item => ({
        ...item,
        pn_master_table: Array.isArray(item.pn_master_table) 
          ? item.pn_master_table[0] || null 
          : item.pn_master_table
      }))
      setPreviewItems(transformedItems)
    } catch (error) {
      console.error('Error fetching preview:', error)
      toast.error('Failed to load preview')
    } finally {
      setFetchingPreview(false)
    }
  }

  const checkExistingInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('inventory_id')
        .eq('po_id_original', poId)
        .limit(1)

      if (error) {
        console.error('Error checking existing inventory:', error)
        return
      }

      setInventoryExists(data && data.length > 0)
    } catch (error) {
      console.error('Error checking inventory:', error)
    }
  }

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
      onClose()
    } catch (error) {
      console.error('Error confirming PO completion:', error)
    } finally {
      setLoading(false)
    }
  }

  const getConditionBadgeColor = (condition: string | null) => {
    switch (condition) {
      case 'AR': return 'bg-green-100 text-green-800'
      case 'SVC': return 'bg-blue-100 text-blue-800'
      case 'OHC': return 'bg-yellow-100 text-yellow-800'
      case 'REP': return 'bg-orange-100 text-orange-800'
      case 'AS-IS': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const calculateTotalValue = () => {
    return previewItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  }

  // Don't show modal if PO is already completed
  if (currentStatus === 'Completed') {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Complete Purchase Order {poNumber}
          </DialogTitle>
          <DialogDescription>
            Marking this purchase order as completed will automatically create inventory items for all line items.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {inventoryExists && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <span className="font-medium text-orange-800">
                  Inventory items already exist for this PO
                </span>
              </div>
              <p className="text-sm text-orange-700 mt-1">
                This purchase order has already been processed and inventory items have been created.
              </p>
            </div>
          )}

          {fetchingPreview ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading items preview...
            </div>
          ) : (
            <>
              <div>
                <h4 className="font-medium mb-3">Items to be added to inventory:</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {previewItems.map((item, index) => (
                    <Card key={index} className="p-3">
                      <CardContent className="p-0">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium font-mono text-sm">
                              {item.pn_master_table?.pn || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-600">
                              {item.description || item.pn_master_table?.description || 'No description'}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">Qty: {item.quantity}</span>
                              <span className="text-xs text-gray-500">•</span>
                              <span className="text-xs text-gray-500">
                                Unit: ${item.unit_price.toFixed(2)}
                              </span>
                              {item.condition && (
                                <>
                                  <span className="text-xs text-gray-500">•</span>
                                  <Badge className={`text-xs ${getConditionBadgeColor(item.condition)}`}>
                                    {item.condition}
                                  </Badge>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">
                              ${(item.quantity * item.unit_price).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {previewItems.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-blue-800">
                        Summary
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-blue-700">
                    <div>Total items: {previewItems.length}</div>
                    <div>Total quantity: {previewItems.reduce((sum, item) => sum + item.quantity, 0)}</div>
                    <div>Total value: ${calculateTotalValue().toFixed(2)}</div>
                  </div>
                </div>
              )}

              {previewItems.length === 0 && !fetchingPreview && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No items found in this purchase order</p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={loading || fetchingPreview || inventoryExists}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {inventoryExists ? 'Already Processed' : 'Complete & Create Inventory'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}