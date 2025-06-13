'use client'

import { useEffect } from 'react'
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

type MyCompany = Database['public']['Tables']['my_companies']['Row']
type ExternalCompany = Database['public']['Tables']['companies']['Row']

const myCompanySchema = z.object({
  my_company_name: z.string().min(1, 'Company name is required'),
  my_company_code: z.string().min(1, 'Company code is required'),
  my_company_address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
})

const externalCompanySchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  company_code: z.string().min(1, 'Company code is required'),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  company_type: z.enum(['vendor', 'customer', 'both']),
})

interface CompanyDialogProps {
  open: boolean
  onClose: () => void
  company?: MyCompany | ExternalCompany | null
  type: 'my_company' | 'external_company'
}

export function CompanyDialog({ open, onClose, company, type }: CompanyDialogProps) {
  const isMyCompany = type === 'my_company'
  const schema = isMyCompany ? myCompanySchema : externalCompanySchema
  
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: isMyCompany ? {
      my_company_name: '',
      my_company_code: '',
      my_company_address: '',
      city: '',
      country: '',
      phone: '',
      email: '',
    } : {
      company_name: '',
      company_code: '',
      address: '',
      city: '',
      country: '',
      phone: '',
      email: '',
      company_type: 'vendor',
    }
  })

  useEffect(() => {
    if (company) {
      if (isMyCompany) {
        const myCompanyData = company as MyCompany
        form.reset({
          my_company_name: myCompanyData.my_company_name || '',
          my_company_code: myCompanyData.my_company_code || '',
          my_company_address: myCompanyData.my_company_address || '',
          city: myCompanyData.city || '',
          country: myCompanyData.country || '',
          phone: myCompanyData.phone || '',
          email: myCompanyData.email || '',
        })
      } else {
        const externalCompanyData = company as ExternalCompany
        const validCompanyTypes = ['vendor', 'customer', 'both'] as const
        const companyType = validCompanyTypes.includes(externalCompanyData.company_type as any) 
          ? externalCompanyData.company_type as 'vendor' | 'customer' | 'both'
          : 'vendor'
        
        form.reset({
          company_name: externalCompanyData.company_name || '',
          company_code: externalCompanyData.company_code || '',
          address: externalCompanyData.address || '',
          city: externalCompanyData.city || '',
          country: externalCompanyData.country || '',
          phone: externalCompanyData.phone || '',
          email: externalCompanyData.email || '',
          company_type: companyType,
        })
      }
    } else {
      form.reset()
    }
  }, [company, form, isMyCompany])

  const onSubmit = async (data: any) => {
    try {
      if (isMyCompany) {
        if (company) {
          const { error } = await supabase
            .from('my_companies')
            .update(data)
            .eq('my_company_id', (company as MyCompany).my_company_id)
          if (error) throw error
          toast.success('Company updated successfully')
        } else {
          const { error } = await supabase
            .from('my_companies')
            .insert(data)
          if (error) throw error
          toast.success('Company created successfully')
        }
      } else {
        if (company) {
          const { error } = await supabase
            .from('companies')
            .update(data)
            .eq('company_id', (company as ExternalCompany).company_id)
          if (error) throw error
          toast.success('Company updated successfully')
        } else {
          const { error } = await supabase
            .from('companies')
            .insert(data)
          if (error) throw error
          toast.success('Company created successfully')
        }
      }
      onClose()
    } catch (error: any) {
      console.error('Error saving company:', error)
      toast.error(error.message || 'Failed to save company')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {company ? 'Edit' : 'Add'} {isMyCompany ? 'My Company' : 'External Company'}
          </DialogTitle>
          <DialogDescription>
            {company ? 'Update' : 'Create'} company information.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Company Name</Label>
              <Input
                id="name"
                {...form.register(isMyCompany ? 'my_company_name' : 'company_name')}
                className={form.formState.errors[isMyCompany ? 'my_company_name' : 'company_name'] ? 'border-red-500' : ''}
              />
              {form.formState.errors[isMyCompany ? 'my_company_name' : 'company_name'] && (
                <div className="text-red-500 text-sm mt-1">
                  {form.formState.errors[isMyCompany ? 'my_company_name' : 'company_name']?.message}
                </div>
              )}
            </div>
            
            <div>
              <Label htmlFor="code">Company Code</Label>
              <Input
                id="code"
                {...form.register(isMyCompany ? 'my_company_code' : 'company_code')}
                className={form.formState.errors[isMyCompany ? 'my_company_code' : 'company_code'] ? 'border-red-500' : ''}
              />
              {form.formState.errors[isMyCompany ? 'my_company_code' : 'company_code'] && (
                <div className="text-red-500 text-sm mt-1">
                  {form.formState.errors[isMyCompany ? 'my_company_code' : 'company_code']?.message}
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              {...form.register(isMyCompany ? 'my_company_address' : 'address')}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" {...form.register('city')} />
            </div>
            
            <div>
              <Label htmlFor="country">Country</Label>
              <Input id="country" {...form.register('country')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...form.register('phone')} />
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register('email')} />
            </div>
          </div>

          {!isMyCompany && (
            <div>
              <Label htmlFor="company_type">Company Type</Label>
              <Select
                value={form.watch('company_type')}
                onValueChange={(value) => form.setValue('company_type', value as 'vendor' | 'customer' | 'both')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : company ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}