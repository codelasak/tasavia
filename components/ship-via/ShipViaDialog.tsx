'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'
import { toast } from 'sonner'

type ShipVia = Database['public']['Tables']['my_ship_via']['Row']

const shipViaSchema = z.object({
  ship_company_name: z.string().min(1, 'Company name is required'),
  account_no: z.string().min(1, 'Account number is required'),
  owner: z.string().optional(),
  ship_model: z.string().optional(),
})

interface ShipViaDialogProps {
  open: boolean
  onClose: () => void
  shipVia?: ShipVia | null
}

export function ShipViaDialog({ open, onClose, shipVia }: ShipViaDialogProps) {
  const form = useForm({
    resolver: zodResolver(shipViaSchema),
    defaultValues: {
      ship_company_name: '',
      account_no: '',
      owner: '',
      ship_model: '',
    }
  })

  useEffect(() => {
    if (shipVia) {
      form.reset({
        ship_company_name: shipVia.ship_company_name,
        account_no: shipVia.account_no,
        owner: shipVia.owner || '',
        ship_model: shipVia.ship_model || '',
      })
    } else {
      form.reset({
        ship_company_name: '',
        account_no: '',
        owner: '',
        ship_model: '',
      })
    }
  }, [shipVia, form])

  const onSubmit = async (data: z.infer<typeof shipViaSchema>) => {
    try {
      const submitData = {
        ...data,
        owner: data.owner || null,
        ship_model: data.ship_model || null,
      }

      if (shipVia) {
        const { error } = await supabase
          .from('my_ship_via')
          .update(submitData)
          .eq('ship_via_id', shipVia.ship_via_id)
        if (error) throw error
        toast.success('Ship via company updated successfully')
      } else {
        const { error } = await supabase
          .from('my_ship_via')
          .insert(submitData)
        if (error) throw error
        toast.success('Ship via company created successfully')
      }
      onClose()
    } catch (error: any) {
      console.error('Error saving ship via company:', error)
      toast.error(error.message || 'Failed to save ship via company')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {shipVia ? 'Edit' : 'Add'} Ship Via Company
          </DialogTitle>
          <DialogDescription>
            {shipVia ? 'Update' : 'Create'} shipping company information.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="ship_company_name">Company Name</Label>
            <Input
              id="ship_company_name"
              {...form.register('ship_company_name')}
              className={form.formState.errors.ship_company_name ? 'border-red-500' : ''}
              placeholder="e.g., DHL, FedEx, UPS"
            />
            {form.formState.errors.ship_company_name && (
              <div className="text-red-500 text-sm mt-1">
                {form.formState.errors.ship_company_name.message}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="account_no">Account Number</Label>
            <Input
              id="account_no"
              {...form.register('account_no')}
              className={form.formState.errors.account_no ? 'border-red-500' : ''}
              placeholder="e.g., 958175630"
            />
            {form.formState.errors.account_no && (
              <div className="text-red-500 text-sm mt-1">
                {form.formState.errors.account_no.message}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="owner">Owner</Label>
            <Input
              id="owner"
              {...form.register('owner')}
              placeholder="Account owner (optional)"
            />
          </div>

          <div>
            <Label htmlFor="ship_model">Ship Model</Label>
            <Input
              id="ship_model"
              {...form.register('ship_model')}
              placeholder="Shipping model/service type (optional)"
            />
          </div>

          {form.watch('ship_company_name') && form.watch('account_no') && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm text-blue-800">
                <strong>Display Format:</strong> {form.watch('ship_company_name')} # {form.watch('account_no')}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : shipVia ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}