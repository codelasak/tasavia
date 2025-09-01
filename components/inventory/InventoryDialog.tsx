'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/database.types'
import { toast } from 'sonner'

interface InventoryItem {
  inventory_id: string
  pn_id: string
  sn: string | null
  location: string | null
  po_price: number | null
  remarks: string | null
  status: string | null
  physical_status: 'depot' | 'in_repair' | 'in_transit'
  business_status: 'available' | 'reserved' | 'sold'
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

interface PartNumber {
  pn_id: string
  pn: string
  description: string | null
}


const inventorySchema = z.object({
  pn_id: z.string().min(1, 'Part number is required'),
  sn: z.string().optional(),
  location: z.string().optional(),
  po_price: z.number().min(0, 'Price must be positive'),
  remarks: z.string().optional(),
  physical_status: z.enum(['depot', 'in_repair', 'in_transit'], {
    errorMap: () => ({ message: 'Physical status is required' })
  }),
  business_status: z.enum(['available', 'reserved', 'sold'], {
    errorMap: () => ({ message: 'Business status is required' })
  }),
})

type InventoryFormValues = z.infer<typeof inventorySchema>

interface InventoryDialogProps {
  open: boolean
  onClose: () => void
  item?: InventoryItem | null
}

export function InventoryDialog({ open, onClose, item }: InventoryDialogProps) {
  const [partNumbers, setPartNumbers] = useState<PartNumber[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredParts, setFilteredParts] = useState<PartNumber[]>([])

  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      pn_id: '',
      sn: '',
      location: '',
      po_price: 0,
      remarks: '',
      physical_status: 'depot',
      business_status: 'available',
    }
  })

  useEffect(() => {
    if (open) {
      fetchPartNumbers()
    }
  }, [open])

  useEffect(() => {
    if (item) {
      form.reset({
        pn_id: item.pn_id,
        sn: item.sn || '',
        location: item.location || '',
        po_price: item.po_price || 0,
        remarks: item.remarks || '',
        physical_status: (item as any).physical_status || 'depot',
        business_status: (item as any).business_status || 'available',
      })
    } else {
      form.reset({
        pn_id: '',
        sn: '',
        location: '',
        po_price: 0,
        remarks: '',
        physical_status: 'depot',
        business_status: 'available',
      })
    }
  }, [item, form])

  useEffect(() => {
    const filtered = partNumbers.filter(pn =>
      pn.pn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pn.description && pn.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    setFilteredParts(filtered.slice(0, 50)) // Limit to 50 results for performance
  }, [partNumbers, searchTerm])

  const fetchPartNumbers = async () => {
    try {
      const { data, error } = await supabase
        .from('pn_master_table')
        .select('pn_id, pn, description')
        .order('pn')

      if (error) throw error
      setPartNumbers(data || [])
    } catch (error) {
      console.error('Error fetching part numbers:', error)
      toast.error('Failed to fetch part numbers')
    }
  }

  const onSubmit = async (data: InventoryFormValues) => {
    try {
      const submitData = {
        ...data,
        sn: data.sn || null,
        location: data.location || null,
        remarks: data.remarks || null,
        status: data.business_status === 'available' ? 'Available' : 
               data.business_status === 'reserved' ? 'Reserved' : 'Sold', // Legacy status for backward compatibility
      }

      if (item) {
        const { error } = await supabase
          .from('inventory')
          .update(submitData)
          .eq('inventory_id', item.inventory_id)
        if (error) throw error
        toast.success('Inventory item updated successfully')
      } else {
        const { error } = await supabase
          .from('inventory')
          .insert(submitData)
        if (error) throw error
        toast.success('Inventory item created successfully')
      }
      onClose()
    } catch (error: any) {
      console.error('Error saving inventory item:', error)
      toast.error(error.message || 'Failed to save inventory item')
    }
  }

  const selectedPart = partNumbers.find(pn => pn.pn_id === form.watch('pn_id'))

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {item ? 'Edit' : 'Add'} Inventory Item
          </DialogTitle>
          <DialogDescription>
            {item ? 'Update' : 'Create'} inventory item information.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="pn_search">Part Number</Label>
            <div className="space-y-2">
              <Input
                id="pn_search"
                placeholder="Search part numbers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Select
                value={form.watch('pn_id')}
                onValueChange={(value) => form.setValue('pn_id', value)}
              >
                <SelectTrigger className={form.formState.errors.pn_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select a part number" />
                </SelectTrigger>
                <SelectContent>
                  {filteredParts.map((pn) => (
                    <SelectItem key={pn.pn_id} value={pn.pn_id}>
                      <div>
                        <div className="font-mono font-semibold">{pn.pn}</div>
                        {pn.description && (
                          <div className="text-sm text-slate-600">{pn.description}</div>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPart && (
                <div className="text-sm text-slate-600 p-2 bg-slate-50 rounded">
                  <strong>{selectedPart.pn}</strong>
                  {selectedPart.description && <div>{selectedPart.description}</div>}
                </div>
              )}
            </div>
            {form.formState.errors.pn_id && (
              <div className="text-red-500 text-sm mt-1">
                {form.formState.errors.pn_id.message}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="sn">Serial Number</Label>
            <Input
              id="sn"
              {...form.register('sn')}
              placeholder="Optional"
            />
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              {...form.register('location')}
              placeholder="Storage location (optional)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="physical_status">Physical Status</Label>
              <Select
                value={form.watch('physical_status')}
                onValueChange={(value) => form.setValue('physical_status', value as any)}
              >
                <SelectTrigger id="physical_status" className={form.formState.errors.physical_status ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select physical status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="depot">Depot</SelectItem>
                  <SelectItem value="in_repair">In Repair</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.physical_status && (
                <div className="text-red-500 text-xs mt-1">{form.formState.errors.physical_status.message}</div>
              )}
            </div>

            <div>
              <Label htmlFor="business_status">Business Status</Label>
              <Select
                value={form.watch('business_status')}
                onValueChange={(value) => form.setValue('business_status', value as any)}
              >
                <SelectTrigger id="business_status" className={form.formState.errors.business_status ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select business status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.business_status && (
                <div className="text-red-500 text-xs mt-1">{form.formState.errors.business_status.message}</div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="po_price">Unit Cost ($)</Label>
            <Input
              id="po_price"
              type="number"
              step="0.01"
              min="0"
              {...form.register('po_price', { valueAsNumber: true })}
              className={form.formState.errors.po_price ? 'border-red-500' : ''}
            />
            {form.formState.errors.po_price && (
              <div className="text-red-500 text-sm mt-1">
                {form.formState.errors.po_price.message}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="remarks">Notes</Label>
            <Textarea
              id="remarks"
              {...form.register('remarks')}
              rows={3}
              placeholder="Additional notes (optional)"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : item ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}