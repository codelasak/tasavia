'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Plus, Trash2, ArrowLeft } from 'lucide-react'
import * as dateFns from 'date-fns'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Vendor {
  company_id: string
  company_name: string
  company_code: string | null
  company_type: string | null
}

interface InventoryItem {
  inventory_id: string
  pn_id: string
  serial_number: string | null
  condition: string | null
  location: string | null
  quantity: number | null
  unit_cost: number | null
  status: string | null
  traceability_source: string | null
  traceable_to: string | null
  last_certified_agency: string | null
  part_status_certification: string | null
  pn_master_table: {
    pn: string
    description: string | null
  }
}

const repairOrderItemSchema = z.object({
  inventory_id: z.string().min(1, 'Part is required'),
  workscope: z.string().min(1, 'Workscope is required'),
  estimated_cost: z.number().min(0, 'Estimated cost must be positive').optional(),
})

const repairOrderSchema = z.object({
  vendor_company_id: z.string().min(1, 'Vendor is required'),
  expected_return_date: z.date().optional(),
  currency: z.string().default('USD'),
  remarks: z.string().optional(),
  items: z.array(repairOrderItemSchema).min(1, 'At least one item is required'),
})

type RepairOrderFormValues = z.infer<typeof repairOrderSchema>

export default function NewRepairOrderPage() {
  const router = useRouter()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)

  const { setValue, getValues, ...form } = useForm<RepairOrderFormValues>({
    resolver: zodResolver(repairOrderSchema),
    defaultValues: {
      vendor_company_id: '',
      expected_return_date: undefined,
      currency: 'USD',
      remarks: '',
      items: [],
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  })

  const fetchData = useCallback(async () => {
    try {
      const [vendorsResult, inventoryResult] = await Promise.all([
        supabase.from('companies').select('*').eq('company_type', 'vendor').order('company_name'),
        supabase.from('inventory')
          .select(`
            *,
            pn_master_table(pn, description)
          `)
          .in('status', ['Available', 'Reserved'])
          .order('pn_master_table(pn)'),
      ])

      if (vendorsResult.error) throw vendorsResult.error
      if (inventoryResult.error) throw inventoryResult.error

      setVendors(vendorsResult.data || [])
      setInventoryItems(inventoryResult.data || [])

    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load form data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const calculateTotalCost = () => {
    return form.watch('items').reduce((sum, item) => {
      return sum + (item.estimated_cost || 0)
    }, 0)
  }

  const onSubmit = async (data: RepairOrderFormValues) => {
    try {
      const totalCost = calculateTotalCost()

      // Create repair order
      const { data: repairOrderData, error: repairOrderError } = await supabase
        .from('repair_orders')
        .insert({
          vendor_company_id: data.vendor_company_id,
          expected_return_date: data.expected_return_date ? dateFns.format(data.expected_return_date, 'yyyy-MM-dd') : null,
          currency: data.currency,
          remarks: data.remarks || null,
          total_cost: totalCost,
          status: 'Draft'
        })
        .select()
        .single()

      if (repairOrderError) throw repairOrderError

      // Create line items
      const lineItems = data.items.map((item, index) => ({
        repair_order_id: repairOrderData.repair_order_id,
        inventory_id: item.inventory_id,
        workscope: item.workscope,
        estimated_cost: item.estimated_cost || null,
        line_number: index + 1,
      }))

      const { error: itemsError } = await supabase
        .from('repair_order_items')
        .insert(lineItems)

      if (itemsError) throw itemsError

      // Update inventory status to 'Repair'
      const inventoryUpdates = data.items.map(item => ({
        inventory_id: item.inventory_id,
        status: 'Repair'
      }))

      for (const update of inventoryUpdates) {
        const { error } = await supabase
          .from('inventory')
          .update({ status: update.status })
          .eq('inventory_id', update.inventory_id)
        
        if (error) throw error
      }

      toast.success('Repair order created successfully')
      router.push(`/portal/repair-orders/${repairOrderData.repair_order_id}`)
    } catch (error) {
      console.error('Error creating repair order:', error)
      toast.error('Failed to create repair order')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">New Repair Order</h1>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Header Information */}
        <Card>
          <CardHeader>
            <CardTitle>Repair Order Details</CardTitle>
            <CardDescription>Basic information for the repair order</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vendor_company_id">Vendor</Label>
                <Select
                  value={form.watch('vendor_company_id')}
                  onValueChange={(value) => setValue('vendor_company_id', value)}
                >
                  <SelectTrigger id="vendor_company_id" className={form.formState.errors.vendor_company_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.company_id} value={vendor.company_id}>
                        {vendor.company_code} - {vendor.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={form.watch('currency')}
                  onValueChange={(value) => setValue('currency', value)}
                >
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Expected Return Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.watch('expected_return_date') && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.watch('expected_return_date') ? dateFns.format(form.watch('expected_return_date')!, "PPP") : <span>Pick a date (optional)</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={form.watch('expected_return_date')}
                    onSelect={(date) => setValue('expected_return_date', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                {...form.register('remarks')}
                rows={3}
                placeholder="Additional notes or special instructions"
              />
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Items for Repair</CardTitle>
                <CardDescription>Select inventory items to send for repair</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({
                  inventory_id: '',
                  workscope: '',
                  estimated_cost: 0,
                })}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fields.map((field, index) => (
                <Card key={field.id} className="p-4 relative">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">Item {index + 1}</h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor={`items.${index}.inventory_id`}>Inventory Item</Label>
                      <Select
                        value={form.watch(`items.${index}.inventory_id`)}
                        onValueChange={(value) => setValue(`items.${index}.inventory_id`, value)}
                      >
                        <SelectTrigger className={form.formState.errors.items?.[index]?.inventory_id ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select inventory item" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventoryItems.map((item) => (
                            <SelectItem key={item.inventory_id} value={item.inventory_id}>
                              <div>
                                <div className="font-mono font-medium">{item.pn_master_table.pn}</div>
                                <div className="text-sm text-slate-600">
                                  S/N: {item.serial_number || 'N/A'} • Qty: {item.quantity} • {item.status}
                                </div>
                                {item.traceability_source && (
                                  <div className="text-xs text-slate-500">
                                    Traceable to: {item.traceable_to}
                                  </div>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`items.${index}.workscope`}>Workscope</Label>
                        <Input
                          id={`items.${index}.workscope`}
                          {...form.register(`items.${index}.workscope`)}
                          placeholder="e.g., Overhaul, Repair, Inspect"
                          className={form.formState.errors.items?.[index]?.workscope ? 'border-red-500' : ''}
                        />
                      </div>

                      <div>
                        <Label htmlFor={`items.${index}.estimated_cost`}>Estimated Cost ($)</Label>
                        <Input
                          id={`items.${index}.estimated_cost`}
                          type="number"
                          step="0.01"
                          min="0"
                          {...form.register(`items.${index}.estimated_cost`, { valueAsNumber: true })}
                          placeholder="0.00"
                          className={form.formState.errors.items?.[index]?.estimated_cost ? 'border-red-500' : ''}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cost Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between font-bold text-lg">
                <span>Total Estimated Cost:</span>
                <span>${calculateTotalCost().toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:space-x-4">
          <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting} className="w-full sm:w-auto">
            {form.formState.isSubmitting ? 'Creating...' : 'Create Repair Order'}
          </Button>
        </div>
      </form>
    </div>
  )
}