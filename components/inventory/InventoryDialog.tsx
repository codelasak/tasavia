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
import { Database } from '@/lib/supabase/server'
import { toast } from 'sonner'

interface InventoryItem {
  inventory_id: string
  pn_id: string
  serial_number: string | null
  condition?: string
  location: string | null
  quantity?: number
  unit_cost?: number
  notes?: string | null
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

const CONDITION_OPTIONS = [
  'AR', 'SVC', 'AS-IS', 'OHC', 'INS', 'REP', 'MOD'
];

const inventorySchema = z.object({
  pn_id: z.string().min(1, 'Part number is required'),
  serial_number: z.string().optional(),
  condition: z.enum(CONDITION_OPTIONS as [string, ...string[]], {
    errorMap: () => ({ message: 'Condition is required' })
  }),
  location: z.string().optional(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unit_cost: z.number().min(0, 'Unit cost must be positive'),
  notes: z.string().optional(),
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
      serial_number: '',
      condition: 'AR',
      location: '',
      quantity: 1,
      unit_cost: 0,
      notes: '',
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
        serial_number: item.serial_number || '',
        condition: item.condition || 'AR',
        location: item.location || '',
        quantity: item.quantity || 1,
        unit_cost: item.unit_cost || 0,
        notes: item.notes || '',
      })
    } else {
      form.reset({
        pn_id: '',
        serial_number: '',
        condition: 'AR',
        location: '',
        quantity: 1,
        unit_cost: 0,
        notes: '',
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
        serial_number: data.serial_number || null,
        location: data.location || null,
        notes: data.notes || null,
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="serial_number">Serial Number</Label>
              <Input
                id="serial_number"
                {...form.register('serial_number')}
                placeholder="Optional"
              />
            </div>
            
            <div>
              <Label htmlFor="condition">Condition</Label>
              <Select
                value={form.watch('condition')}
                onValueChange={value => form.setValue('condition', value)}
              >
                <SelectTrigger id="condition" className={form.formState.errors.condition ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_OPTIONS.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.condition && (
                <div className="text-red-500 text-xs mt-1">{form.formState.errors.condition.message}</div>
              )}
            </div>
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
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                {...form.register('quantity', { valueAsNumber: true })}
                className={form.formState.errors.quantity ? 'border-red-500' : ''}
              />
              {form.formState.errors.quantity && (
                <div className="text-red-500 text-sm mt-1">
                  {form.formState.errors.quantity.message}
                </div>
              )}
            </div>
            
            <div>
              <Label htmlFor="unit_cost">Unit Cost ($)</Label>
              <Input
                id="unit_cost"
                type="number"
                step="0.01"
                min="0"
                {...form.register('unit_cost', { valueAsNumber: true })}
                className={form.formState.errors.unit_cost ? 'border-red-500' : ''}
              />
              {form.formState.errors.unit_cost && (
                <div className="text-red-500 text-sm mt-1">
                  {form.formState.errors.unit_cost.message}
                </div>
              )}
            </div>
          </div>

          {form.watch('quantity') && form.watch('unit_cost') && (
            <div className="bg-slate-50 p-3 rounded-lg">
              <div className="text-sm text-slate-600">Total Value</div>
              <div className="text-lg font-bold text-green-600">
                ${(form.watch('quantity') * form.watch('unit_cost')).toFixed(2)}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...form.register('notes')}
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