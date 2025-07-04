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

export default function NewSalesOrderPage() {
  const router = useRouter()
  const [myCompanies, setMyCompanies] = useState<MyCompany[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [termsAndConditions, setTermsAndConditions] = useState<TermsAndConditions[]>([])
  const [loading, setLoading] = useState(true)
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

  const fetchData = useCallback(async () => {
    try {
      const [myCompaniesResult, customersResult, inventoryResult, termsResult] = await Promise.all([
        supabase.from('my_companies').select('*').order('my_company_name'),
        supabase.from('companies').select('*, customer_number').order('company_name'),
        supabase.from('inventory')
          .select(`
            *,
            pn_master_table(pn, description)
          `)
          .in('status', ['Available'])
          .order('pn_master_table(pn)'),
        supabase.from('terms_and_conditions').select('*').eq('is_active', true).order('title')
      ])

      if (myCompaniesResult.error) throw myCompaniesResult.error
      if (customersResult.error) throw customersResult.error
      if (inventoryResult.error) throw inventoryResult.error
      if (termsResult.error) throw termsResult.error

      setMyCompanies(myCompaniesResult.data || [])
      setCustomers(customersResult.data || [])
      setInventoryItems(inventoryResult.data || [])
      setTermsAndConditions(termsResult.data || [])

      // Set default company if only one
      if (myCompaniesResult.data?.length === 1) {
        setValue('my_company_id', myCompaniesResult.data[0].my_company_id)
        setValue('payment_terms', myCompaniesResult.data[0].default_payment_terms || 'NET30')
      }

      // Set default terms if only one active
      if (termsResult.data?.length === 1) {
        setValue('terms_and_conditions_id', termsResult.data[0].terms_id)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load form data')
    } finally {
      setLoading(false)
    }
  }, [setValue])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const calculateSubtotal = () => {
    return form.watch('items').reduce((sum, item) => {
      const inventoryItem = inventoryItems.find(inv => inv.inventory_id === item.inventory_id)
      return sum + (item.unit_price * (inventoryItem?.quantity || 1))
    }, 0)
  }

  const calculateTotal = () => {
    return calculateSubtotal() // For now, just subtotal. Could add taxes/fees later
  }

  // Generate customer number based on company code
  const generateCustomerNumber = async (companyCode: string) => {
    try {
      // Check if customer number already exists for this company
      const { data: existingCustomer, error: customerError } = await supabase
        .from('companies')
        .select('customer_number')
        .eq('company_code', companyCode)
        .single()

      if (customerError && customerError.code !== 'PGRST116') {
        console.error('Error checking existing customer:', customerError)
      }

      // If customer number already exists, return it
      if (existingCustomer?.customer_number) {
        return existingCustomer.customer_number
      }

      // Generate new customer number: first 3 letters of company code + 3-digit number
      const prefix = companyCode.substring(0, 3).toUpperCase()
      
      // Get existing customer numbers with same prefix
      const { data: existingNumbers, error: numbersError } = await supabase
        .from('companies')
        .select('customer_number')
        .not('customer_number', 'is', null)
        .ilike('customer_number', `${prefix}%`)
        .order('customer_number', { ascending: false })

      if (numbersError) {
        console.error('Error fetching existing customer numbers:', numbersError)
      }

      let nextCounter = 1
      if (existingNumbers && existingNumbers.length > 0) {
        // Find the highest counter for this prefix
        let highestCounter = 0
        
        existingNumbers.forEach(record => {
          if (record.customer_number && record.customer_number.startsWith(prefix)) {
            const counterPart = record.customer_number.slice(-3)
            const counterNum = parseInt(counterPart, 10)
            if (!isNaN(counterNum) && counterNum > highestCounter) {
              highestCounter = counterNum
            }
          }
        })
        
        nextCounter = highestCounter + 1
      }

      const counter = String(nextCounter).padStart(3, '0')
      const newCustomerNumber = `${prefix}${counter}`

      // Update the company with the new customer number
      const { error: updateError } = await supabase
        .from('companies')
        .update({ customer_number: newCustomerNumber })
        .eq('company_code', companyCode)

      if (updateError) {
        console.error('Error updating customer number:', updateError)
        // Return generated number even if update fails
      }

      return newCustomerNumber

    } catch (error) {
      console.error('Error in generateCustomerNumber:', error)
      // Fallback: use company code + random number
      const fallback = companyCode.substring(0, 3).toUpperCase() + String(Math.floor(Math.random() * 1000)).padStart(3, '0')
      return fallback
    }
  }

  // Generate invoice number in T25XXX format
  const generateInvoiceNumber = async () => {
    const year = new Date().getFullYear().toString().slice(-2)
    
    try {
      // Get all existing invoice numbers for this year
      const { data: existingInvoices, error } = await supabase
        .from('sales_orders')
        .select('invoice_number')
        .not('invoice_number', 'is', null)
        .ilike('invoice_number', `T${year}%`)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching existing invoices:', error)
        const fallbackCounter = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
        return `T${year}${fallbackCounter}`
      }
      
      let nextCounter = 1
      
      if (existingInvoices && existingInvoices.length > 0) {
        let highestCounter = 0
        
        existingInvoices.forEach(invoice => {
          if (invoice.invoice_number && invoice.invoice_number.startsWith(`T${year}`)) {
            const counterPart = invoice.invoice_number.slice(-3)
            const counterNum = parseInt(counterPart, 10)
            if (!isNaN(counterNum) && counterNum > highestCounter) {
              highestCounter = counterNum
            }
          }
        })
        
        nextCounter = highestCounter + 1
      }
      
      const counter = String(nextCounter).padStart(3, '0')
      return `T${year}${counter}`
      
    } catch (error) {
      console.error('Error in generateInvoiceNumber:', error)
      const timestamp = Date.now().toString().slice(-3)
      return `T${year}${timestamp}`
    }
  }

  const onSubmit = async (data: SalesOrderFormValues) => {
    try {
      const subtotal = calculateSubtotal()
      const total = calculateTotal()

      // Generate invoice number
      const invoiceNumber = await generateInvoiceNumber()

      // Create sales order
      const { data: salesOrderData, error: salesOrderError } = await supabase
        .from('sales_orders')
        .insert({
          my_company_id: data.my_company_id,
          customer_company_id: data.customer_company_id,
          customer_po_number: data.customer_po_number || null,
          sales_date: dateFns.format(data.sales_date, 'yyyy-MM-dd'),
          payment_terms: data.payment_terms || null,
          currency: data.currency,
          terms_and_conditions_id: data.terms_and_conditions_id || null,
          remarks: data.remarks || null,
          sub_total: subtotal,
          total_net: total,
          status: 'Draft',
          invoice_number: invoiceNumber
        })
        .select()
        .single()

      if (salesOrderError) throw salesOrderError

      // Create line items
      const lineItems = data.items.map((item, index) => ({
        sales_order_id: salesOrderData.sales_order_id,
        inventory_id: item.inventory_id,
        unit_price: item.unit_price,
        line_number: index + 1,
      }))

      const { error: itemsError } = await supabase
        .from('sales_order_items')
        .insert(lineItems)

      if (itemsError) throw itemsError

      // Update inventory status to 'Allocated'
      const inventoryUpdates = data.items.map(item => ({
        inventory_id: item.inventory_id,
        status: 'Allocated'
      }))

      for (const update of inventoryUpdates) {
        const { error } = await supabase
          .from('inventory')
          .update({ status: update.status })
          .eq('inventory_id', update.inventory_id)
        
        if (error) throw error
      }

      toast.success('Sales order created successfully')
      router.push(`/portal/sales-orders/${salesOrderData.sales_order_id}`)
    } catch (error) {
      console.error('Error creating sales order:', error)
      toast.error('Failed to create sales order')
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
          <h1 className="text-3xl font-bold text-slate-900">New Sales Order</h1>
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
                    if (company?.default_payment_terms) {
                      setValue('payment_terms', company.default_payment_terms)
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
              </div>

              <div>
                <Label htmlFor="customer_company_id">Customer</Label>
                <Select
                  value={form.watch('customer_company_id')}
                  onValueChange={async (value) => {
                    setValue('customer_company_id', value)
                    // Find selected customer and generate/retrieve customer number
                    const selectedCustomer = customers.find(c => c.company_id === value)
                    if (selectedCustomer) {
                      const customerNumber = await generateCustomerNumber(selectedCustomer.company_code || 'UNKNOWN')
                      setSelectedCustomerNumber(customerNumber)
                    }
                  }}
                >
                  <SelectTrigger id="customer_company_id" className={form.formState.errors.customer_company_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.company_id} value={customer.company_id}>
                        {customer.company_code} - {customer.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Customer Number Display */}
            {selectedCustomerNumber && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="text-sm text-blue-800">
                  <span className="font-semibold">Customer Number:</span> {selectedCustomerNumber}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              <div>
                <Label htmlFor="payment_terms">Payment Terms</Label>
                <Select
                  value={form.watch('payment_terms')}
                  onValueChange={(value) => setValue('payment_terms', value)}
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
                <Label htmlFor="terms_and_conditions_id">Terms & Conditions</Label>
                <Select
                  value={form.watch('terms_and_conditions_id')}
                  onValueChange={(value) => setValue('terms_and_conditions_id', value)}
                >
                  <SelectTrigger id="terms_and_conditions_id">
                    <SelectValue placeholder="Select T&C" />
                  </SelectTrigger>
                  <SelectContent>
                    {termsAndConditions.map((terms) => (
                      <SelectItem key={terms.terms_id} value={terms.terms_id}>
                        {terms.title} v{terms.version}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

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

        {/* Line Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Line Items</CardTitle>
                <CardDescription>Select inventory items to include in this sales order</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`items.${index}.inventory_id`}>Inventory Item</Label>
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
                        <SelectTrigger className={form.formState.errors.items?.[index]?.inventory_id ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select inventory item" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventoryItems.map((item) => (
                            <SelectItem key={item.inventory_id} value={item.inventory_id}>
                              <div>
                                <div className="font-mono font-medium">{item.pn_master_table.pn}</div>
                                <div className="text-sm text-slate-600">
                                  S/N: {item.serial_number || 'N/A'} • Qty: {item.quantity} • ${item.unit_cost?.toFixed(2)}
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

                    <div>
                      <Label htmlFor={`items.${index}.unit_price`}>Unit Price ($)</Label>
                      <Input
                        id={`items.${index}.unit_price`}
                        type="number"
                        step="0.01"
                        min="0"
                        {...form.register(`items.${index}.unit_price`, { valueAsNumber: true })}
                        className={form.formState.errors.items?.[index]?.unit_price ? 'border-red-500' : ''}
                      />
                    </div>
                  </div>

                  {form.watch(`items.${index}.inventory_id`) && form.watch(`items.${index}.unit_price`) && (
                    <div className="mt-4 text-right">
                      <span className="text-sm text-slate-600">Line Total: </span>
                      <span className="font-semibold">
                        ${(() => {
                          const inventoryItem = inventoryItems.find(inv => inv.inventory_id === form.watch(`items.${index}.inventory_id`))
                          const qty = inventoryItem?.quantity || 1
                          const price = form.watch(`items.${index}.unit_price`) || 0
                          return (qty * price).toFixed(2)
                        })()}
                      </span>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cost Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
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