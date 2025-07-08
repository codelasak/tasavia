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

interface NewSalesOrderClientPageProps {
  myCompanies: MyCompany[]
  customers: Customer[]
  inventoryItems: InventoryItem[]
  termsAndConditions: TermsAndConditions[]
}

const salesOrderItemSchema = z.object({
  inventory_id: z.string().min(1, 'Part is required'),
  unit_price: z.number().min(0, 'Unit price must be positive'),
})

const salesOrderSchema = z.object({
  my_company_id: z.string().min(1, 'My company is required'),
  customer_company_id: z.string().min(1, 'Customer is required'),
  customer_po_number: z.string().optional(),
  sales_date: z.date(),
  payment_terms: z.string().optional(),
  currency: z.string().default('USD'),
  terms_and_conditions_id: z.string().optional(),
  remarks: z.string().optional(),
  items: z.array(salesOrderItemSchema).min(1, 'At least one item is required'),
})

type SalesOrderFormValues = z.infer<typeof salesOrderSchema>

export default function NewSalesOrderClientPage({
  myCompanies,
  customers,
  inventoryItems,
  termsAndConditions,
}: NewSalesOrderClientPageProps) {
  const router = useRouter()
  const [selectedCustomerNumber, setSelectedCustomerNumber] = useState<string>('')

  const { setValue, getValues, ...form } = useForm<SalesOrderFormValues>({
    resolver: zodResolver(salesOrderSchema),
    defaultValues: {
      my_company_id: '',
      customer_company_id: '',
      customer_po_number: '',
      sales_date: new Date(),
      payment_terms: 'NET30',
      currency: 'USD',
      terms_and_conditions_id: '',
      remarks: '',
      items: [],
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  })

  useEffect(() => {
    // Set default company if only one
    if (myCompanies.length === 1) {
      setValue('my_company_id', myCompanies[0].my_company_id)
      setValue('payment_terms', myCompanies[0].default_payment_terms || 'NET30')
    }

    // Set default terms if only one active
    if (termsAndConditions.length === 1) {
      setValue('terms_and_conditions_id', termsAndConditions[0].terms_id)
    }
  }, [myCompanies, termsAndConditions, setValue])

  const calculateSubtotal = useCallback(() => {
    return form.watch('items').reduce((sum, item) => {
      const inventoryItem = inventoryItems.find(inv => inv.inventory_id === item.inventory_id)
      const quantity = inventoryItem?.quantity || 1
      return sum + (quantity * item.unit_price)
    }, 0)
  }, [form, inventoryItems])

  const calculateTotal = useCallback(() => {
    return calculateSubtotal() // For now, no additional charges
  }, [calculateSubtotal])

  const onSubmit = async (data: SalesOrderFormValues) => {
    try {
      const subtotal = calculateSubtotal()
      const total = calculateTotal()

      // Create sales order
      const salesOrderData = {
        my_company_id: data.my_company_id,
        customer_company_id: data.customer_company_id,
        customer_po_number: data.customer_po_number || null,
        sales_date: dateFns.format(data.sales_date, 'yyyy-MM-dd'),
        payment_terms: data.payment_terms || 'NET30',
        currency: data.currency,
        terms_and_conditions_id: data.terms_and_conditions_id || null,
        remarks: data.remarks || null,
        sub_total: subtotal,
        total_net: total,
        status: 'Draft',
      }

      const { data: soData, error: soError } = await supabase
        .from('sales_orders')
        .insert(salesOrderData)
        .select()
        .single()

      if (soError) throw soError

      // Create line items
      const lineItems = data.items.map((item, index) => ({
        sales_order_id: soData.sales_order_id,
        line_number: index + 1,
        inventory_id: item.inventory_id,
        unit_price: item.unit_price,
        line_total: (() => {
          const inventoryItem = inventoryItems.find(inv => inv.inventory_id === item.inventory_id)
          const quantity = inventoryItem?.quantity || 1
          return quantity * item.unit_price
        })(),
      }))

      const { error: itemsError } = await supabase
        .from('sales_order_items')
        .insert(lineItems)

      if (itemsError) throw itemsError

      toast.success('Sales order created successfully')
      router.push('/portal/sales-orders')
    } catch (error: any) {
      console.error('Error creating sales order:', error)
      toast.error(error.message || 'Failed to create sales order')
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
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Create Sales Order</h1>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Header Information */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Order Details</CardTitle>
            <CardDescription>Basic information for the sales order</CardDescription>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer_po_number">Customer PO Number</Label>
                <Input
                  id="customer_po_number"
                  {...form.register('customer_po_number')}
                  placeholder="Optional"
                />
              </div>

              <div>
                <Label>Sales Date</Label>
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
                      {form.watch('sales_date') ? dateFns.format(form.watch('sales_date'), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={form.watch('sales_date')}
                      onSelect={(date) => setValue('sales_date', date || new Date())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="payment_terms">Payment Terms</Label>
                <Select
                  value={form.watch('payment_terms')}
                  onValueChange={value => setValue('payment_terms', value)}
                >
                  <SelectTrigger id="payment_terms">
                    <SelectValue placeholder="Select payment terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRE-PAY">PRE-PAY</SelectItem>
                    <SelectItem value="COD">COD</SelectItem>
                    <SelectItem value="NET5">NET5</SelectItem>
                    <SelectItem value="NET10">NET10</SelectItem>
                    <SelectItem value="NET15">NET15</SelectItem>
                    <SelectItem value="NET30">NET30</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={form.watch('currency')}
                  onValueChange={value => setValue('currency', value)}
                >
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EURO">EURO</SelectItem>
                    <SelectItem value="TL">TL</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="terms_and_conditions_id">Terms & Conditions</Label>
                <Select
                  value={form.watch('terms_and_conditions_id')}
                  onValueChange={value => setValue('terms_and_conditions_id', value)}
                >
                  <SelectTrigger id="terms_and_conditions_id">
                    <SelectValue placeholder="Select terms" />
                  </SelectTrigger>
                  <SelectContent>
                    {termsAndConditions.map((terms) => (
                      <SelectItem key={terms.terms_id} value={terms.terms_id}>
                        {terms.title} {terms.version && `(v${terms.version})`}
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Line Items</CardTitle>
                <CardDescription>Add inventory items to this sales order</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => append({
                  inventory_id: '',
                  unit_price: 0,
                })}
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
                  item => item.inventory_id === form.watch(`items.${index}.inventory_id`)
                )
                return (
                  <Card key={field.id} className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium">Item {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        aria-label="Remove Item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Inventory Item</Label>
                        <Select
                          value={form.watch(`items.${index}.inventory_id`)}
                          onValueChange={(value) => {
                            setValue(`items.${index}.inventory_id`, value)
                            const item = inventoryItems.find(inv => inv.inventory_id === value)
                            if (item) {
                              setValue(`items.${index}.unit_price`, item.unit_cost || 0)
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select inventory item" />
                          </SelectTrigger>
                          <SelectContent>
                            {inventoryItems.map((item) => (
                              <SelectItem key={item.inventory_id} value={item.inventory_id}>
                                <div className="flex flex-col">
                                  <div className="font-mono">{item.pn_master_table.pn}</div>
                                  <div className="text-sm text-slate-600">
                                    {item.pn_master_table.description} | SN: {item.serial_number || 'N/A'} | Condition: {item.condition || 'N/A'}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    Qty: {item.quantity} | Location: {item.location || 'N/A'}
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Unit Price ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...form.register(`items.${index}.unit_price`, { valueAsNumber: true })}
                          className={form.formState.errors.items?.[index]?.unit_price ? 'border-red-500' : ''}
                        />
                        {form.formState.errors.items?.[index]?.unit_price && (
                          <div className="text-red-500 text-sm mt-1">
                            {form.formState.errors.items[index]?.unit_price?.message}
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedInventory && (
                      <div className="mt-4 p-3 bg-slate-50 rounded-md">
                        <div className="text-sm space-y-1">
                          <div><strong>Part:</strong> {selectedInventory.pn_master_table.pn}</div>
                          <div><strong>Description:</strong> {selectedInventory.pn_master_table.description || 'N/A'}</div>
                          <div><strong>Serial Number:</strong> {selectedInventory.serial_number || 'N/A'}</div>
                          <div><strong>Condition:</strong> {selectedInventory.condition || 'N/A'}</div>
                          <div><strong>Quantity:</strong> {selectedInventory.quantity}</div>
                          <div><strong>Location:</strong> {selectedInventory.location || 'N/A'}</div>
                          {selectedInventory.traceability_source && (
                            <div><strong>Traceability Source:</strong> {selectedInventory.traceability_source}</div>
                          )}
                          {selectedInventory.traceable_to && (
                            <div><strong>Traceable To:</strong> {selectedInventory.traceable_to}</div>
                          )}
                        </div>
                        <div className="mt-2 text-right">
                          <span className="text-sm text-slate-600">Line Total: </span>
                          <span className="font-semibold">
                            ${((selectedInventory.quantity || 1) * form.watch(`items.${index}.unit_price`)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Remarks */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                {...form.register('remarks')}
                rows={3}
                placeholder="Additional notes or remarks"
              />
            </div>
          </CardContent>
        </Card>

        {/* Cost Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total NET ({form.watch('currency')}):</span>
                <span>${calculateTotal().toFixed(2)}</span>
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
            {form.formState.isSubmitting ? 'Creating...' : 'Create Sales Order'}
          </Button>
        </div>
      </form>
    </div>
  )
}