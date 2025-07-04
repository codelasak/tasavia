'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/database.types'
import { toast } from 'sonner'

type PartNumber = Database['public']['Tables']['pn_master_table']['Row']

const partNumberSchema = z.object({
  pn: z.string().min(1, 'Part number is required'),
  description: z.string().optional(),
  remarks: z.string().optional(),
})

type PartNumberFormValues = z.infer<typeof partNumberSchema>

interface PartNumberDialogProps {
  open: boolean
  onClose: () => void
  partNumber?: PartNumber | null
}

export function PartNumberDialog({ open, onClose, partNumber }: PartNumberDialogProps) {
  const form = useForm<PartNumberFormValues>({
    resolver: zodResolver(partNumberSchema),
    defaultValues: {
      pn: '',
      description: '',
      remarks: '',
    }
  })

  useEffect(() => {
    if (partNumber) {
      form.reset({
        pn: partNumber.pn,
        description: partNumber.description || '',
        remarks: partNumber.remarks || '',
      })
    } else {
      form.reset({
        pn: '',
        description: '',
        remarks: '',
      })
    }
  }, [partNumber, form])

  const onSubmit = async (data: PartNumberFormValues) => {
    try {
      const submitData = {
        ...data,
        description: data.description || null,
        remarks: data.remarks || null,
      }

      if (partNumber) {
        const { error } = await supabase
          .from('pn_master_table')
          .update(submitData)
          .eq('pn_id', partNumber.pn_id)
        if (error) throw error
        toast.success('Part number updated successfully')
      } else {
        const { error } = await supabase
          .from('pn_master_table')
          .insert(submitData)
        if (error) throw error
        toast.success('Part number created successfully')
      }
      onClose()
    } catch (error: any) {
      console.error('Error saving part number:', error)
      if (error.code === '23505') {
        toast.error('This part number already exists')
      } else {
        toast.error(error.message || 'Failed to save part number')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {partNumber ? 'Edit' : 'Add'} Part Number
          </DialogTitle>
          <DialogDescription>
            {partNumber ? 'Update' : 'Create'} part number information.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="pn">Part Number</Label>
            <Input
              id="pn"
              {...form.register('pn')}
              className={form.formState.errors.pn ? 'border-red-500' : ''}
              placeholder="Enter part number"
            />
            {form.formState.errors.pn && (
              <div className="text-red-500 text-sm mt-1">
                {form.formState.errors.pn.message}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...form.register('description')}
              rows={3}
              placeholder="Enter part description"
            />
          </div>

          <div>
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              {...form.register('remarks')}
              rows={3}
              placeholder="Enter any additional remarks"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : partNumber ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}