'use client'

import { useState, useEffect } from 'react'
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
import { canCancelInventoryItem } from '@/lib/types/inventory'

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
  physical_status: 'depot' | 'in_repair' | 'in_transit'
  business_status: 'available' | 'reserved' | 'sold' | 'cancelled'
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
  // PDF Header & Meta
  ship_invoice_number: z.string().optional(),
  // Packing Slip
  end_use_country: z.string().optional(),
  country_of_origin: z.string().optional(),
  freighter_awb: z.string().optional(),
  dimensions_note: z.string().optional(),
  // Financial Summary
  subtotal: z.number().nullable().optional(),
  misc_charge: z.number().nullable().optional(),
  freight_charge: z.number().nullable().optional(),
  vat_percentage: z.number().nullable().optional(),
  vat_amount: z.number().nullable().optional(),
  total_net: z.number().nullable().optional(),
  items: z.array(repairOrderItemSchema).min(1, 'At least one item is required'),
})

type RepairOrderFormValues = z.infer<typeof repairOrderSchema>

interface NewRepairOrderClientPageProps {
  vendors: Vendor[]
  inventoryItems: InventoryItem[]
}

export default function NewRepairOrderClientPage({
  vendors,
  inventoryItems
}: NewRepairOrderClientPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const form = useForm<RepairOrderFormValues>({
    resolver: zodResolver(repairOrderSchema),
    defaultValues: {
      vendor_company_id: '',
      expected_return_date: undefined,
      currency: 'USD',
      remarks: '',
      ship_invoice_number: '',
      end_use_country: '',
      country_of_origin: '',
      freighter_awb: '',
      dimensions_note: '',
      subtotal: null,
      misc_charge: null,
      freight_charge: null,
      vat_percentage: null,
      vat_amount: null,
      total_net: null,
      items: [],
    }
  })

  // Watch for PO selection changes
  

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  })


  const calculateTotalCost = () => {
    return form.watch('items').reduce((sum, item) => {
      return sum + (item.estimated_cost || 0)
    }, 0)
  }

  // Part Number Assist (search + set Country of Origin)
  const [pnQuery, setPnQuery] = useState('')
  const [pnOptions, setPnOptions] = useState<{ pn_id: string; pn: string; description: string | null }[]>([])
  const [isSearchingPN, setIsSearchingPN] = useState(false)

  const searchPNs = async () => {
    if (!pnQuery || pnQuery.length < 2) return
    setIsSearchingPN(true)
    try {
      const { data, error } = await supabase
        .from('pn_master_table')
        .select('pn_id, pn, description')
        .or(`pn.ilike.%${pnQuery}%,description.ilike.%${pnQuery}%`)
        .limit(20)
        .order('pn')
      if (error) throw error
      setPnOptions(data || [])
    } finally {
      setIsSearchingPN(false)
    }
  }

  const pickPNForOrigin = async (pn_id: string) => {
    try {
      const { data } = await supabase
        .from('inventory')
        .select('country_of_origin')
        .eq('pn_id', pn_id)
        .not('country_of_origin', 'is', null)
        .limit(1)
        .maybeSingle()
      if (data?.country_of_origin) {
        form.setValue('country_of_origin', data.country_of_origin)
        toast.success(`Country of Origin set: ${data.country_of_origin}`)
      } else {
        toast.message('No country of origin found for this PN')
      }
    } catch (e) {
      toast.error('Lookup failed')
    }
  }

  const onSubmit = async (data: RepairOrderFormValues) => {
    setLoading(true)
    try {
      const totalCost = calculateTotalCost()

      // Create repair order (repair_order_number will be auto-generated by database)
      const { data: repairOrderData, error: repairOrderError } = await supabase
        .from('repair_orders')
        .insert({
          vendor_company_id: data.vendor_company_id,
          expected_return_date: data.expected_return_date ? dateFns.format(data.expected_return_date, 'yyyy-MM-dd') : null,
          currency: data.currency,
          remarks: data.remarks || null,
          total_cost: totalCost,
          status: 'Draft'
          // Note: repair_order_number is auto-generated by the database default function
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
      // Persist PDF overrides for the new RO so PDF can render the template
      try {
        const freight = data.freight_charge || 0
        const misc = data.misc_charge || 0
        const vatPct = data.vat_percentage || 0
        const vatAmount = totalCost * (vatPct / 100)
        const totalNet = totalCost + freight + misc + vatAmount
        const overrides = {
          shipInvoiceNumber: data.ship_invoice_number || undefined,
          currency: data.currency || 'USD',
          endUseCountry: data.end_use_country || null,
          countryOfOrigin: data.country_of_origin || null,
          freighterAwb: data.freighter_awb || null,
          dimensionsNote: data.dimensions_note || null,
          subtotal: totalCost,
          miscCharge: misc,
          freightCharge: freight,
          vatPercentage: vatPct,
          vatAmount,
          totalNet,
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem(`ro_pdf_overrides_${repairOrderData.repair_order_id}`, JSON.stringify(overrides))
        }
      } catch {}

      router.push(`/portal/repair-orders/${repairOrderData.repair_order_id}`)
    } catch (error) {
      console.error('Error creating repair order:', error)
      
      // Provide specific error messages based on error type
      let errorMessage = 'Failed to create repair order'
      
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMsg = (error as any).message?.toLowerCase() || ''
        
        if (errorMsg.includes('foreign key') || errorMsg.includes('violates foreign key')) {
          errorMessage = 'Invalid vendor or inventory selection. Please refresh the page and try again.'
        } else if (errorMsg.includes('not null') || errorMsg.includes('null value')) {
          errorMessage = 'Missing required information. Please fill in all required fields.'
        } else if (errorMsg.includes('duplicate') || errorMsg.includes('unique')) {
          errorMessage = 'A repair order with these details already exists.'
        } else if (errorMsg.includes('permission') || errorMsg.includes('denied')) {
          errorMessage = 'You do not have permission to create repair orders.'
        } else {
          // For development debugging, show the actual error
          errorMessage = `Failed to create repair order: ${(error as any).message}`
        }
      }
      
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
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
                  onValueChange={(value) => form.setValue('vendor_company_id', value)}
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
                      onSelect={(date) => form.setValue('expected_return_date', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Additional Details */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="ship_invoice_number">Ship Invoice Number</Label>
                <Input id="ship_invoice_number" {...form.register('ship_invoice_number')} placeholder="e.g., RO25510" />
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={form.watch('currency')}
                  onValueChange={(value) => form.setValue('currency', value)}
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
              <div>
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea id="remarks" {...form.register('remarks')} rows={3} placeholder="Additional notes" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Packing Slip */}
        <Card>
          <CardHeader>
            <CardTitle>Packing Slip</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="end_use_country">End-Use / Buyer Country</Label>
              <Input id="end_use_country" {...form.register('end_use_country')} />
            </div>
            <div>
              <Label htmlFor="country_of_origin">Country of Origin</Label>
              <Input id="country_of_origin" {...form.register('country_of_origin')} />
            </div>
            <div>
              <Label htmlFor="freighter_awb">Freighter AWB #</Label>
              <Input id="freighter_awb" {...form.register('freighter_awb')} />
            </div>
            <div>
              <Label htmlFor="dimensions_note">Dimensions || L W H || Gr.wgt/ Kgs</Label>
              <Input id="dimensions_note" {...form.register('dimensions_note')} />
            </div>
          </CardContent>
        </Card>

        {/* Part Number Assist */}
        <Card>
          <CardHeader>
            <CardTitle>Part Number Assist</CardTitle>
            <CardDescription>Search part number and auto-fill Country of Origin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Input placeholder="Search Part Number" value={pnQuery} onChange={(e) => setPnQuery(e.target.value)} />
              <Button type="button" variant="outline" onClick={searchPNs} disabled={isSearchingPN}>
                {isSearchingPN ? 'Searching…' : 'Search'}
              </Button>
            </div>
            {pnOptions.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {pnOptions.map((pn) => (
                  <Button key={pn.pn_id} type="button" variant="outline" className="justify-start" onClick={() => pickPNForOrigin(pn.pn_id)}>
                    <div>
                      <div className="font-mono font-bold">{pn.pn}</div>
                      <div className="text-xs text-slate-600">{pn.description || '—'}</div>
                    </div>
                  </Button>
                ))}
              </div>
            )}
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
                        onValueChange={(value) => form.setValue(`items.${index}.inventory_id`, value)}
                      >
                        <SelectTrigger className={form.formState.errors.items?.[index]?.inventory_id ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select inventory item" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventoryItems
                            .filter(item =>
                              // Filter out cancelled items
                              item.status !== 'Cancelled' &&
                              item.business_status !== 'cancelled' &&
                              // Additional filter: only show items that make sense for repair orders
                              (item.physical_status !== 'in_transit' && item.business_status !== 'sold')
                            )
                            .map((item) => (
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-4">
              <div>
                <Label htmlFor="freight_charge">Freight/Forwarding Charge ($)</Label>
                <Input
                  id="freight_charge"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register('freight_charge', { valueAsNumber: true })}
                />
              </div>

              <div>
                <Label htmlFor="misc_charge">Misc Charge ($)</Label>
                <Input
                  id="misc_charge"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register('misc_charge', { valueAsNumber: true })}
                />
              </div>

              <div>
                <Label htmlFor="vat_percentage">VAT (%)</Label>
                <Input
                  id="vat_percentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  {...form.register('vat_percentage', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${calculateTotalCost().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Freight/Forwarding:</span>
                <span>${(form.watch('freight_charge') || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Misc Charge:</span>
                <span>${(form.watch('misc_charge') || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>VAT ({form.watch('vat_percentage') || 0}%):</span>
                <span>${(calculateTotalCost() * ((form.watch('vat_percentage') || 0) / 100)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total NET:</span>
                <span>${(calculateTotalCost() + (form.watch('freight_charge') || 0) + (form.watch('misc_charge') || 0) + (calculateTotalCost() * ((form.watch('vat_percentage') || 0) / 100))).toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:space-x-4">
          <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? 'Creating...' : 'Create Repair Order'}
          </Button>
        </div>
      </form>
    </div>
  )
}
