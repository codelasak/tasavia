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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertTriangle, XCircle, Package } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface InventoryItem {
  inventory_id: string
  status: string
  pn_master_table: {
    pn: string
  } | null
}

interface PODeletionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  poId: string
  poNumber: string
  isDeleting?: boolean
}

export default function PODeletionModal({
  isOpen,
  onClose,
  onConfirm,
  poId,
  poNumber,
  isDeleting = false
}: PODeletionModalProps) {
  const [loading, setLoading] = useState(false)
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [canDelete, setCanDelete] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      checkInventoryReferences()
    }
  }, [isOpen, poId])

  const checkInventoryReferences = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { data: inventoryReferences, error } = await supabase
        .from('inventory')
        .select(`
          inventory_id,
          status,
          pn_master_table (
            pn
          )
        `)
        .eq('po_id_original', poId)

      if (error) {
        console.error('Error checking inventory references:', error)
        setError('Failed to check inventory references')
        return
      }

      setInventoryItems(inventoryReferences || [])
      
      // Check if there are any sold items (these prevent deletion)
      const soldItems = inventoryReferences?.filter(item => item.status === 'Sold') || []
      setCanDelete(soldItems.length === 0)
    } catch (error) {
      console.error('Unexpected error checking inventory:', error)
      setError('Failed to check inventory references')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!canDelete) return
    
    try {
      await onConfirm()
      onClose()
    } catch (error) {
      console.error('Error deleting PO:', error)
      // Error handling is done by parent component
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      'Available': 'bg-green-100 text-green-800 border-green-200',
      'Reserved': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Sold': 'bg-blue-100 text-blue-800 border-blue-200',
      'Damaged': 'bg-red-100 text-red-800 border-red-200',
      'Under Repair': 'bg-purple-100 text-purple-800 border-purple-200'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const soldItems = inventoryItems.filter(item => item.status === 'Sold')
  const reservedItems = inventoryItems.filter(item => item.status === 'Reserved')
  const availableItems = inventoryItems.filter(item => item.status === 'Available')

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Delete Purchase Order {poNumber}
          </DialogTitle>
          <DialogDescription>
            This action will permanently delete the purchase order and cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Checking inventory references...
            </div>
          ) : (
            <>
              {inventoryItems.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50 text-slate-400" />
                  <p className="text-slate-600">No inventory items found for this PO</p>
                  <p className="text-sm text-slate-500">Safe to delete</p>
                </div>
              ) : (
                <>
                  {!canDelete && (
                    <Alert className="border-red-200 bg-red-50">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        <div className="font-medium mb-1">Cannot delete this purchase order</div>
                        <div>{soldItems.length} inventory items from this PO have been sold and cannot be removed.</div>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Inventory Impact ({inventoryItems.length} items)
                    </h4>
                    
                    <div className="space-y-2">
                      {availableItems.length > 0 && (
                        <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                          <span className="text-sm">Available Items</span>
                          <Badge className="bg-green-100 text-green-800">
                            {availableItems.length} items will be deleted
                          </Badge>
                        </div>
                      )}
                      
                      {reservedItems.length > 0 && (
                        <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                          <span className="text-sm">Reserved Items</span>
                          <Badge className="bg-yellow-100 text-yellow-800">
                            {reservedItems.length} items will be deleted ⚠️
                          </Badge>
                        </div>
                      )}
                      
                      {soldItems.length > 0 && (
                        <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                          <span className="text-sm">Sold Items</span>
                          <Badge className="bg-red-100 text-red-800">
                            {soldItems.length} items (blocks deletion)
                          </Badge>
                        </div>
                      )}
                    </div>

                    {reservedItems.length > 0 && canDelete && (
                      <Alert className="border-yellow-200 bg-yellow-50 mt-4">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-800">
                          <div className="font-medium mb-1">Warning</div>
                          <div>Deleting reserved items may affect active sales orders. Please verify no sales orders depend on these items.</div>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Show sample of items being deleted */}
                    {inventoryItems.length > 0 && canDelete && (
                      <div className="mt-4">
                        <div className="text-sm text-slate-600 mb-2">Items to be deleted:</div>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {inventoryItems.slice(0, 10).map((item) => (
                            <div key={item.inventory_id} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded">
                              <span className="font-mono">{item.pn_master_table?.pn || 'N/A'}</span>
                              <Badge className={`${getStatusBadge(item.status)} border text-xs`}>
                                {item.status}
                              </Badge>
                            </div>
                          ))}
                          {inventoryItems.length > 10 && (
                            <div className="text-xs text-slate-500 text-center">
                              ... and {inventoryItems.length - 10} more items
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={handleConfirm} 
            disabled={!canDelete || isDeleting || loading}
          >
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {canDelete 
              ? (inventoryItems.length > 0 
                  ? `Delete PO & ${inventoryItems.length} Items`
                  : 'Delete Purchase Order'
                )
              : 'Cannot Delete'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}