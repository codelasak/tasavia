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
import { CalendarIcon, Plus, Trash2, ArrowLeft, Save } from 'lucide-react'
import * as dateFns from 'date-fns'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { PAYMENT_TERMS, CURRENCY_OPTIONS } from '@/lib/constants/sales-order-constants'

interface MyCompany {
  my_company_id: string
  my_company_name: string
  my_company_code: string
  default_payment_terms: string | null
}

interface Customer {
  company_id: string
  company_name: string
  company_code: string | null
  company_type: string | null
  customer_number?: string | null
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
  application_code: string | null
  dimensions: string | null
  weight: number | null
  traceability_source: string | null
  traceable_to: string | null
  last_certified_agency: string | null
  part_status_certification: string | null
  pn_master_table: {
    pn: string
    description: string | null
  }
}

interface TermsAndConditions {
  terms_id: string
  title: string
  version: string | null
  is_active: boolean | null
}

interface SalesOrder {
  sales_order_id: string
  invoice_number: string
  my_company_id: string
  customer_company_id: string
  customer_po_number: string | null
  reference_number: string | null
  contract_number: string | null
  country_of_origin: string | null
  end_use_country: string | null
  sales_date: string | null
  payment_terms: string | null
  currency: string | null
  freight_charge: number | null
  misc_charge: number | null
  vat_percentage: number | null
  vat_amount: number | null
  terms_and_conditions_id: string | null
  remarks: string | null
  sub_total: number | null
  total_net: number | null
  status: string | null
}

interface SalesOrderItem {
  sales_order_item_id: string
  sales_order_id: string
  line_number: number
  inventory_id: string
  unit_price: number
  line_total: number | null
  inventory: {
    inventory_id: string
    pn_master_table: {
      pn: string
      description: string | null
    }
  }
}

interface SalesOrderEditClientPageProps {
  salesOrderId: string
  initialSalesOrder: SalesOrder
  initialItems: SalesOrderItem[]
  myCompanies: MyCompany[]
  customers: Customer[]
  inventoryItems: InventoryItem[]
  termsAndConditions: TermsAndConditions[]
}

const salesOrderItemSchema = z.object({
  inventory_id: z.string().min(1, 'Part is required'),
  unit_price: z.number().min(0, 'Unit price must be positive'),
  sales_order_item_id: z.string().optional(), // For existing items
})

const salesOrderSchema = z.object({
  my_company_id: z.string().min(1, 'My company is required'),
  customer_company_id: z.string().min(1, 'Customer is required'),
  customer_po_number: z.string().optional(),
  reference_number: z.string().optional(),
  contract_number: z.string().optional(),
  country_of_origin: z.string().optional(),
  end_use_country: z.string().optional(),
  sales_date: z.date(),
  payment_terms: z.string().optional(),
  currency: z.string().default('USD'),
  freight_charge: z.number().min(0).default(0),
  misc_charge: z.number().min(0).default(0),
  vat_percentage: z.number().min(0).max(100).default(0),
  terms_and_conditions_id: z.string().optional(),
  remarks: z.string().optional(),
  items: z.array(salesOrderItemSchema).min(1, 'At least one item is required'),
})

type SalesOrderFormValues = z.infer<typeof salesOrderSchema>

export default function SalesOrderEditClientPage({
  salesOrderId,
  initialSalesOrder,
  initialItems,
  myCompanies,
  customers,
  inventoryItems,
  termsAndConditions,
}: SalesOrderEditClientPageProps) {
  const router = useRouter()
  const [selectedCustomerNumber, setSelectedCustomerNumber] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const { setValue, getValues, ...form } = useForm<SalesOrderFormValues>({
    resolver: zodResolver(salesOrderSchema),
    defaultValues: {
      my_company_id: initialSalesOrder.my_company_id || '',
      customer_company_id: initialSalesOrder.customer_company_id || '',
      customer_po_number: initialSalesOrder.customer_po_number || '',
      reference_number: initialSalesOrder.reference_number || '',
      contract_number: initialSalesOrder.contract_number || '',
      country_of_origin: initialSalesOrder.country_of_origin || '',
      end_use_country: initialSalesOrder.end_use_country || '',
      sales_date: initialSalesOrder.sales_date ? new Date(initialSalesOrder.sales_date) : new Date(),
      payment_terms: initialSalesOrder.payment_terms || 'NET30',
      currency: initialSalesOrder.currency || 'USD',
      freight_charge: initialSalesOrder.freight_charge || 0,
      misc_charge: initialSalesOrder.misc_charge || 0,
      vat_percentage: initialSalesOrder.vat_percentage || 0,
      terms_and_conditions_id: initialSalesOrder.terms_and_conditions_id || '',
      remarks: initialSalesOrder.remarks || '',
      items: initialItems.map(item => ({
        inventory_id: item.inventory_id,
        unit_price: item.unit_price,
        sales_order_item_id: item.sales_order_item_id,
      })),
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  })

  const calculateSubtotal = useCallback(() => {
    return form.watch('items').reduce((sum, item) => {
      const inventoryItem = inventoryItems.find(inv => inv.inventory_id === item.inventory_id)
      const quantity = inventoryItem?.quantity || 1
      return sum + (quantity * item.unit_price)
    }, 0)
  }, [form, inventoryItems])

  const calculateTotal = useCallback(() => {
    const subtotal = calculateSubtotal()
    const freight = form.watch('freight_charge') || 0
    const misc = form.watch('misc_charge') || 0
    const vatPercentage = form.watch('vat_percentage') || 0
    const vatAmount = subtotal * (vatPercentage / 100)
    return subtotal + freight + misc + vatAmount
  }, [calculateSubtotal, form])

  const onSubmit = async (data: SalesOrderFormValues) => {
    setIsLoading(true)
    try {
      const subtotal = calculateSubtotal()
      const total = calculateTotal()
      const vatAmount = subtotal * ((data.vat_percentage || 0) / 100)

      // Update sales order
      const salesOrderData = {
        my_company_id: data.my_company_id,
        customer_company_id: data.customer_company_id,
        customer_po_number: data.customer_po_number || null,
        reference_number: data.reference_number || null,
        contract_number: data.contract_number || null,
        country_of_origin: data.country_of_origin || null,
        end_use_country: data.end_use_country || null,
        sales_date: dateFns.format(data.sales_date, 'yyyy-MM-dd'),
        payment_terms: data.payment_terms || 'NET30',
        currency: data.currency,
        freight_charge: data.freight_charge,
        misc_charge: data.misc_charge,
        vat_percentage: data.vat_percentage,
        vat_amount: vatAmount,
        terms_and_conditions_id: data.terms_and_conditions_id || null,
        remarks: data.remarks || null,
        sub_total: subtotal,
        total_net: total,
        updated_at: new Date().toISOString(),
      }

      const { error: soError } = await supabase
        .from('sales_orders')
        .update(salesOrderData)
        .eq('sales_order_id', salesOrderId)

      if (soError) throw soError

      // Use upsert approach to avoid race conditions
      // First, get existing items to determine what needs to be added/updated/removed
      const { data: existingItems, error: fetchError } = await supabase
        .from('sales_order_items')
        .select('sales_order_item_id, inventory_id, unit_price, line_number')
        .eq('sales_order_id', salesOrderId)

      if (fetchError) throw fetchError

      const existingItemsMap = new Map(
        existingItems?.map(item => [item.sales_order_item_id, item]) || []
      )

      // Prepare operations
      const itemsToUpdate = []
      const itemsToInsert = []
      const itemsToDelete = [...existingItemsMap.keys()]

      for (let index = 0; index < data.items.length; index++) {
        const item = data.items[index]
        const existingItem = item.sales_order_item_id ? 
          existingItemsMap.get(item.sales_order_item_id) : null

        if (existingItem) {
          // Update existing item
          itemsToUpdate.push({
            sales_order_item_id: existingItem.sales_order_item_id,
            line_number: index + 1,
            inventory_id: item.inventory_id,
            unit_price: item.unit_price,
          })
          // Remove from delete list
          const deleteIndex = itemsToDelete.indexOf(existingItem.sales_order_item_id)
          if (deleteIndex > -1) itemsToDelete.splice(deleteIndex, 1)
        } else {
          // Insert new item
          itemsToInsert.push({
            sales_order_id: salesOrderId,
            line_number: index + 1,
            inventory_id: item.inventory_id,
            unit_price: item.unit_price,
          })
        }
      }

      // Execute operations with proper error handling
      if (itemsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('sales_order_items')
          .delete()
          .in('sales_order_item_id', itemsToDelete)
        
        if (deleteError) throw deleteError
      }

      if (itemsToUpdate.length > 0) {
        for (const item of itemsToUpdate) {
          const { error: updateError } = await supabase
            .from('sales_order_items')
            .update({
              line_number: item.line_number,
              inventory_id: item.inventory_id,
              unit_price: item.unit_price,
            })
            .eq('sales_order_item_id', item.sales_order_item_id)
          
          if (updateError) throw updateError
        }
      }

      if (itemsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('sales_order_items')
          .insert(itemsToInsert)
        
        if (insertError) throw insertError
      }

      toast.success('Sales order updated successfully')
      router.push(`/portal/sales-orders/${salesOrderId}`)
    } catch (error: any) {
      console.error('Error updating sales order:', error)
      toast.error(error.message || 'Failed to update sales order')
    } finally {
      setIsLoading(false)
    }
  }

  const selectedCustomer = customers.find(c => c.company_id === form.watch('customer_company_id'))

  useEffect(() => {
    if (selectedCustomer) {
      setSelectedCustomerNumber(selectedCustomer.customer_number || '')
    }
  }, [selectedCustomer])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Edit Invoice</h1>
            <p className="text-slate-600">Invoice #{initialSalesOrder.invoice_number}</p>
          </div>
        </div>
        
      </div>

      <form id="sales-order-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Header Information */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
            <CardDescription>Basic information for the invoice</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="my_company_id">My Company</Label>
                <Select
                  value={form.watch('my_company_id')}
                  onValueChange={(value) => {
                    setValue('my_company_id', value)
                    const company = myCompanies.find(c => c.my_company_id === value)
                    if (company) {
                      setValue('payment_terms', company.default_payment_terms || 'NET30')
                    }
                  }}
                >
                  <SelectTrigger id="my_company_id" className={form.formState.errors.my_company_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select your company" />
                  </SelectTrigger>
                  <SelectContent>
                    {myCompanies.map((company) => (
                      <SelectItem key={company.my_company_id} value={company.my_company_id}>
                        {company.my_company_code} - {company.my_company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.my_company_id && (
                  <div className="text-red-500 text-sm mt-1">
                    {form.formState.errors.my_company_id.message}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="customer_company_id">Customer</Label>
                <Select
                  value={form.watch('customer_company_id')}
                  onValueChange={(value) => setValue('customer_company_id', value)}
                >
                  <SelectTrigger id="customer_company_id" className={form.formState.errors.customer_company_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.company_id} value={customer.company_id}>
                        <div className="flex flex-col">
                          <div>{customer.company_code} - {customer.company_name}</div>
                          {customer.customer_number && (
                            <div className="text-sm text-slate-600">Customer #: {customer.customer_number}</div>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.customer_company_id && (
                  <div className="text-red-500 text-sm mt-1">
                    {form.formState.errors.customer_company_id.message}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="customer_po_number">Customer PO Number</Label>
                <Input
                  {...form.register('customer_po_number')}
                  id="customer_po_number"
                  placeholder="Optional"
                />
              </div>

              <div>
                <Label htmlFor="reference_number">Reference Number</Label>
                <Input
                  {...form.register('reference_number')}
                  id="reference_number"
                  placeholder="Optional"
                />
              </div>

              <div>
                <Label htmlFor="contract_number">Contract Number</Label>
                <Input
                  {...form.register('contract_number')}
                  id="contract_number"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="country_of_origin">Country of Origin</Label>
                <Input
                  {...form.register('country_of_origin')}
                  id="country_of_origin"
                  placeholder="Optional"
                />
              </div>

              <div>
                <Label htmlFor="end_use_country">End Use Country</Label>
                <Input
                  {...form.register('end_use_country')}
                  id="end_use_country"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="sales_date">Sales Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.watch('sales_date') && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch('sales_date') ? (
                        dateFns.format(form.watch('sales_date'), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.watch('sales_date')}
                      onSelect={(date) => setValue('sales_date', date || new Date())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="payment_terms">Payment Terms</Label>
                <Select
                  value={form.watch('payment_terms') || ''}
                  onValueChange={(value) => setValue('payment_terms', value)}
                >
                  <SelectTrigger id="payment_terms">
                    <SelectValue placeholder="Select payment terms" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TERMS.map((term) => (
                      <SelectItem key={term.value} value={term.value}>
                        {term.label}
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
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Line Items</CardTitle>
                <CardDescription>Parts and services included in this invoice</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ inventory_id: '', unit_price: 0 })}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fields.map((field, index) => {
                const selectedInventory = inventoryItems.find(
                  inv => inv.inventory_id === form.watch(`items.${index}.inventory_id`)
                )
                const lineTotal = selectedInventory ? 
                  (selectedInventory.quantity || 1) * form.watch(`items.${index}.unit_price`) : 0

                return (
                  <div key={field.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-medium">Item {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <Label htmlFor={`items.${index}.inventory_id`}>Part Number</Label>
                        <Select
                          value={form.watch(`items.${index}.inventory_id`)}
                          onValueChange={(value) => {
                            setValue(`items.${index}.inventory_id`, value)
                            const inventory = inventoryItems.find(inv => inv.inventory_id === value)
                            if (inventory && inventory.unit_cost) {
                              setValue(`items.${index}.unit_price`, inventory.unit_cost)
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select part" />
                          </SelectTrigger>
                          <SelectContent>
                            {inventoryItems.map((inventory) => (
                              <SelectItem key={inventory.inventory_id} value={inventory.inventory_id}>
                                <div className="flex flex-col">
                                  <div className="font-medium">
                                    {inventory.pn_master_table.pn}
                                  </div>
                                  <div className="text-sm text-slate-600">
                                    {inventory.pn_master_table.description}
                                  </div>
                                  <div className="text-sm text-slate-500">
                                    S/N: {inventory.serial_number || 'N/A'} | 
                                    Cond: {inventory.condition || 'N/A'} | 
                                    Qty: {inventory.quantity || 1} | 
                                    Loc: {inventory.location || 'N/A'}
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {form.formState.errors.items?.[index]?.inventory_id && (
                          <div className="text-red-500 text-sm mt-1">
                            {form.formState.errors.items[index]?.inventory_id?.message}
                          </div>
                        )}
                      </div>

                      <div>
                        <Label htmlFor={`items.${index}.unit_price`}>Unit Price</Label>
                        <Input
                          {...form.register(`items.${index}.unit_price`, { valueAsNumber: true })}
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                        />
                        {form.formState.errors.items?.[index]?.unit_price && (
                          <div className="text-red-500 text-sm mt-1">
                            {form.formState.errors.items[index]?.unit_price?.message}
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedInventory && (
                      <div className="mt-4 p-3 bg-slate-100 rounded-lg">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="font-medium">Quantity:</span> {selectedInventory.quantity || 1}
                          </div>
                          <div>
                            <span className="font-medium">Unit Price:</span> ${form.watch(`items.${index}.unit_price`).toFixed(2)}
                          </div>
                          <div>
                            <span className="font-medium">Line Total:</span> ${lineTotal.toFixed(2)}
                          </div>
                          <div>
                            <span className="font-medium">Condition:</span> {selectedInventory.condition || 'N/A'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {fields.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  No items added yet. Click &quot;Add Item&quot; to get started.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Financial Details */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Details</CardTitle>
            <CardDescription>Additional charges and tax calculations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <Label htmlFor="freight_charge">Freight Charge ($)</Label>
                <Input
                  {...form.register('freight_charge', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                />
                <div className="text-xs text-slate-500 mt-1">Shipping and freight costs</div>
              </div>

              <div>
                <Label htmlFor="misc_charge">Misc Charge ($)</Label>
                <Input
                  {...form.register('misc_charge', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                />
                <div className="text-xs text-slate-500 mt-1">Additional miscellaneous charges</div>
              </div>

              <div>
                <Label htmlFor="vat_percentage">VAT (%)</Label>
                <Input
                  {...form.register('vat_percentage', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="0.00"
                />
                <div className="text-xs text-slate-500 mt-1">Value Added Tax percentage</div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${calculateSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Freight Charge:</span>
                    <span>${(form.watch('freight_charge') || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Misc Charge:</span>
                    <span>${(form.watch('misc_charge') || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VAT ({form.watch('vat_percentage') || 0}%):</span>
                    <span>${(calculateSubtotal() * ((form.watch('vat_percentage') || 0) / 100)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="terms_and_conditions_id">Terms and Conditions</Label>
              <Select
                value={form.watch('terms_and_conditions_id') || ''}
                onValueChange={(value) => setValue('terms_and_conditions_id', value)}
              >
                <SelectTrigger id="terms_and_conditions_id">
                  <SelectValue placeholder="Select terms and conditions (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {termsAndConditions.map((terms) => (
                    <SelectItem key={terms.terms_id} value={terms.terms_id}>
                      {terms.title} {terms.version && `(${terms.version})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                {...form.register('remarks')}
                id="remarks"
                placeholder="Additional notes or remarks (optional)"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:space-x-4">
          <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full sm:w-auto flex items-center justify-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
          </Button>
        </div>
      </form>
    </div>
  )
}