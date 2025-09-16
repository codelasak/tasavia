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
import { CalendarIcon, Plus, Trash2, ArrowLeft, Search, Package } from 'lucide-react'
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

interface AvailablePurchaseOrder {
  po_id: string
  po_number: string
  po_date: string
  vendor_company_id: string
  vendor_company_name: string
  currency: string
  status: string
  total_amount: number | null
  remarks_1: string | null
  remarks_2: string | null
  aviation_compliance_notes: string | null
  origin_country_code: string | null
  end_use_country_code: string | null
  traceable_to_airline: string | null
  traceable_to_msn: string | null
  last_certificate: string | null
  certificate_expiry_date: string | null
  companies: {
    company_id: string
    company_name: string
    company_code: string | null
    company_type: string | null
  }
}

const repairOrderItemSchema = z.object({
  inventory_id: z.string().min(1, 'Part is required'),
  workscope: z.string().min(1, 'Workscope is required'),
  estimated_cost: z.number().min(0, 'Estimated cost must be positive').optional(),
})

const repairOrderSchema = z.object({
  source_po_id: z.string().optional(),
  vendor_company_id: z.string().min(1, 'Vendor is required'),
  expected_return_date: z.date().optional(),
  currency: z.string().default('USD'),
  remarks: z.string().optional(),
  items: z.array(repairOrderItemSchema).min(1, 'At least one item is required'),
})

type RepairOrderFormValues = z.infer<typeof repairOrderSchema>

interface NewRepairOrderClientPageProps {
  vendors: Vendor[]
  inventoryItems: InventoryItem[]
  availablePOs: AvailablePurchaseOrder[]
}

export default function NewRepairOrderClientPage({
  vendors,
  inventoryItems,
  availablePOs
}: NewRepairOrderClientPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredPOs, setFilteredPOs] = useState<AvailablePurchaseOrder[]>(availablePOs)
  const [selectedPO, setSelectedPO] = useState<AvailablePurchaseOrder | null>(null)
  const [inheritFromPO, setInheritFromPO] = useState(false)

  const form = useForm<RepairOrderFormValues>({
    resolver: zodResolver(repairOrderSchema),
    defaultValues: {
      source_po_id: '',
      vendor_company_id: '',
      expected_return_date: undefined,
      currency: 'USD',
      remarks: '',
      items: [],
    }
  })

  // Watch for PO selection changes
  const watchSourcePOId = form.watch('source_po_id')

  // Filter POs based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPOs(availablePOs)
    } else {
      const filtered = availablePOs.filter(po =>
        po.po_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.companies.company_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredPOs(filtered)
    }
  }, [searchQuery, availablePOs])

  // Handle PO selection and inheritance
  useEffect(() => {
    if (watchSourcePOId && inheritFromPO) {
      const po = availablePOs.find(p => p.po_id === watchSourcePOId)
      if (po) {
        setSelectedPO(po)
        // Inherit basic fields
        form.setValue('vendor_company_id', po.vendor_company_id)
        form.setValue('currency', po.currency)
        const joinedRemarks = [po.remarks_1, po.remarks_2, po.aviation_compliance_notes].filter(Boolean).join(' | ')
        if (joinedRemarks) {
          form.setValue('remarks', joinedRemarks)
        }
      }
    } else if (!watchSourcePOId) {
      setSelectedPO(null)
    }
  }, [watchSourcePOId, inheritFromPO, availablePOs, form.setValue])

  useEffect(() => {
    if (!inheritFromPO) {
      setSelectedPO(null)
      form.setValue('source_po_id', '')
    }
  }, [inheritFromPO, form.setValue])

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  })


  const calculateTotalCost = () => {
    return form.watch('items').reduce((sum, item) => {
      return sum + (item.estimated_cost || 0)
    }, 0)
  }

  const onSubmit = async (data: RepairOrderFormValues) => {
    setLoading(true)
    try {
      const totalCost = calculateTotalCost()

      // Create repair order (repair_order_number will be auto-generated by database)
      const { data: repairOrderData, error: repairOrderError } = await supabase
        .from('repair_orders')
        .insert({
          source_po_id: data.source_po_id || null,
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
        {/* Purchase Order Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Purchase Order Reference
            </CardTitle>
            <CardDescription>
              Optionally reference a purchase order to inherit data and maintain traceability
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="inheritFromPO"
                checked={inheritFromPO}
                onChange={(e) => setInheritFromPO(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="inheritFromPO" className="text-sm font-medium">
                Create from Purchase Order (inherit data)
              </Label>
            </div>

            {inheritFromPO && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="source_po_id">Select Purchase Order</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="po-search"
                      placeholder="Search by PO number or vendor name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Select
                    value={form.watch('source_po_id')}
                    onValueChange={(value) => {
                      form.setValue('source_po_id', value)
                      setInheritFromPO(true)
                    }}
                  >
                    <SelectTrigger className={form.formState.errors.source_po_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select a purchase order" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredPOs.map((po) => (
                        <SelectItem key={po.po_id} value={po.po_id}>
                          <div className="space-y-1">
                            <div className="font-medium">{po.po_number}</div>
                            <div className="text-sm text-gray-600">
                              {po.companies.company_name} • {dateFns.format(new Date(po.po_date), 'MMM dd, yyyy')} • {po.currency} {po.total_amount || 0}
                            </div>
                            <div className="text-xs text-gray-500">
                              Completed PO
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedPO && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <h4 className="font-medium text-blue-900">Selected Purchase Order: {selectedPO.po_number}</h4>
                        <div className="text-sm text-blue-800">
                          <div>Vendor: {selectedPO.companies.company_name}</div>
                          <div>Date: {dateFns.format(new Date(selectedPO.po_date), 'MMM dd, yyyy')}</div>
                          <div>Currency: {selectedPO.currency}</div>
                          {selectedPO.origin_country_code && (
                            <div>Origin Country: {selectedPO.origin_country_code}</div>
                          )}
                          {selectedPO.end_use_country_code && (
                            <div>End Use Country: {selectedPO.end_use_country_code}</div>
                          )}
                          {selectedPO.traceable_to_airline && (
                            <div>Traceable to Airline: {selectedPO.traceable_to_airline}</div>
                          )}
                          {selectedPO.traceable_to_msn && (
                            <div>Traceable to MSN: {selectedPO.traceable_to_msn}</div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Header Information */}
        <Card>
          <CardHeader>
            <CardTitle>Repair Order Details</CardTitle>
            <CardDescription>Basic information for the repair order</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vendor_company_id">
                  Vendor
                  {selectedPO && form.watch('vendor_company_id') === selectedPO.vendor_company_id && (
                    <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                      Inherited from PO
                    </span>
                  )}
                </Label>
                <Select
                  value={form.watch('vendor_company_id')}
                  onValueChange={(value) => form.setValue('vendor_company_id', value)}
                  disabled={selectedPO ? form.watch('vendor_company_id') === selectedPO.vendor_company_id : false}
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
                <Label htmlFor="currency">
                  Currency
                  {selectedPO && form.watch('currency') === selectedPO.currency && (
                    <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                      Inherited from PO
                    </span>
                  )}
                </Label>
                <Select
                  value={form.watch('currency')}
                  onValueChange={(value) => form.setValue('currency', value)}
                  disabled={selectedPO ? form.watch('currency') === selectedPO.currency : false}
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
                    onSelect={(date) => form.setValue('expected_return_date', date)}
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
                        onValueChange={(value) => form.setValue(`items.${index}.inventory_id`, value)}
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
          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? 'Creating...' : 'Create Repair Order'}
          </Button>
        </div>
      </form>
    </div>
  )
}