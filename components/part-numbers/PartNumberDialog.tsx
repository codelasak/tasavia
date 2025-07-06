'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Database } from '@/lib/supabase/database.types'

type PartNumber = Database['public']['Tables']['pn_master_table']['Row']

interface PartNumberDialogProps {
  open: boolean
  onClose: () => void
  partNumber?: PartNumber | null
}

interface PartNumberFormData {
  pn: string
  description: string
  remarks?: string
}

export function PartNumberDialog({ open, onClose, partNumber }: PartNumberDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const form = useForm<PartNumberFormData>({
    defaultValues: {
      pn: '',
      description: '',
      remarks: '',
    }
  })

  // Update form when partNumber changes or dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        pn: partNumber?.pn || '',
        description: partNumber?.description || '',
        remarks: partNumber?.remarks || '',
      })
    }
  }, [open, partNumber, form])

  const onSubmit = async (data: PartNumberFormData) => {
    try {
      setIsSubmitting(true)
      
      // Validate required fields
      if (!data.pn?.trim()) {
        toast.error('Part number is required')
        return
      }
      if (!data.description?.trim()) {
        toast.error('Description is required')
        return
      }
      
      if (partNumber) {
        // Update existing part number
        const { error } = await supabase
          .from('pn_master_table')
          .update({
            pn: data.pn.trim(),
            description: data.description.trim(),
            remarks: data.remarks?.trim() || null,
          })
          .eq('pn_id', partNumber.pn_id)
        
        if (error) {
          console.error('Update error:', error)
          if (error.code === '23505') {
            toast.error('Part number already exists')
          } else {
            toast.error(error.message || 'Failed to update part number')
          }
          return
        }
        toast.success('Part number updated successfully')
      } else {
        // Create new part number
        const { error } = await supabase
          .from('pn_master_table')
          .insert({
            pn: data.pn.trim(),
            description: data.description.trim(),
            remarks: data.remarks?.trim() || null,
          })
        
        if (error) {
          console.error('Insert error:', error)
          if (error.code === '23505') {
            toast.error('Part number already exists')
          } else {
            toast.error(error.message || 'Failed to create part number')
          }
          return
        }
        toast.success('Part number created successfully')
      }
      
      handleClose()
    } catch (error) {
      console.error('Error saving part number:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    form.reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{partNumber ? 'Edit' : 'Add'} Part Number</DialogTitle>
          <DialogDescription>
            {partNumber ? 'Update the part number details.' : 'Enter the details of the new part number.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pn" className="text-right">
                Part Number *
              </Label>
              <Input 
                id="pn" 
                className="col-span-3" 
                {...form.register('pn', { required: 'Part number is required' })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description *
              </Label>
              <Input 
                id="description" 
                className="col-span-3"
                {...form.register('description', { required: 'Description is required' })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="remarks" className="text-right">
                Remarks
              </Label>
              <Textarea 
                id="remarks" 
                className="col-span-3"
                rows={3}
                {...form.register('remarks')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : partNumber ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
