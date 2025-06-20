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
  company_addresses: Array<{
    address_line1: string
    address_line2: string | null
    city: string | null
    country: string | null
  }>
  company_contacts: Array<{
    contact_name: string
    email: string | null
    phone: string | null
  }>
}

interface ExternalCompany {
  company_id: string
  company_name: string
  company_code: string
  company_addresses: Array<{
    address_line1: string
    address_line2: string | null
    city: string | null
    country: string | null
  }>
  company_contacts: Array<{
    contact_name: string
    email: string | null
    phone: string | null
  }>
}

interface PartNumber {
  pn_id: string
  pn: string
  description: string | null
}

interface ShipVia {
  ship_via_id: string
  ship_company_name: string
  account_no: string
}

const poItemSchema = z.object({
  po_item_id: z.string().optional(),
  pn_id: z.string().min(1, 'Part number is required'),
  description: z.string().min(1, 'Description is required'),
  sn: z.string().optional(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unit_price: z.number().min(0, 'Unit price must be positive'),
  condition: z.string().optional(),
})

const purchaseOrderSchema = z.object({
  my_company_id: z.string().min(1, 'My company is required'),
  vendor_company_id: z.string().min(1, 'Vendor is required'),
  po_date: z.date(),
  ship_to_company_name: z.string().optional(),
  ship_to_address_details: z.string().optional(),
  ship_to_contact_name: z.string().optional(),
  ship_to_contact_phone: z.string().optional(),
  ship_to_contact_email: z.string().email().optional().or(z.literal('')),
  prepared_by_name: z.string().min(1, 'Prepared by name is required'),
  currency: z.string().default('USD'),
  ship_via_id: z.string().optional(),
  payment_term: z.string().optional(),
  remarks_1: z.string().optional(),
  freight_charge: z.number().min(0).default(0),
  misc_charge: z.number().min(0).default(0),
  vat_percentage: z.number().min(0).max(100).default(0),
  status: z.string(),
  items: z.array(poItemSchema).min(1, 'At least one item is required'),
})

type PurchaseOrderFormValues = z.infer<typeof purchaseOrderSchema>

interface PurchaseOrderEditClientPageProps {
  poId: string
}

export default function PurchaseOrderEditClientPage({ poId }: PurchaseOrderEditClientPageProps) {
  const router = useRouter()
  const [myCompanies, setMyCompanies] = useState<MyCompany[]>([])
  const [externalCompanies, setExternalCompanies] = useState<ExternalCompany[]>([])
  const [partNumbers, setPartNumbers] = useState<PartNumber[]>([])
  const [shipViaList, setShipViaList] = useState<ShipVia[]>([])
  const [loading, setLoading] = useState(true)

  const { setValue, getValues, ...form } = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      my_company_id: '',
      vendor_company_id: '',
      po_date: new Date(),
      ship_to_company_name: '',
      ship_to_address_details: '',
      ship_to_contact_name: '',
      ship_to_contact_phone: '',
      ship_to_contact_email: '',
      prepared_by_name: 'System User',
      currency: 'USD',
      ship_via_id: '',
      payment_term: '',
      remarks_1: '',
      freight_charge: 0,
      misc_charge: 0,
      vat_percentage: 0,
      status: 'Draft',
      items: [],
    }
  })

  // Autofill prepared_by_name from localStorage if available
  useEffect(() => {
    const saved = typeof window !== 'undefined' && localStorage.getItem('po_prepared_by')
    if (saved && !getValues('prepared_by_name')) {
      setValue('prepared_by_name', saved)
    }
    // eslint-disable-next-line
  }, [setValue, getValues])

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  })

  const fetchPurchaseOrder = useCallback(async (id: string) => {
    try {
      const { data: poData, error: poError } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('po_id', id)
        .single()

      if (poError) {
        console.error('PO Fetch Error:', poError)
        throw new Error(`Failed to fetch purchase order: ${poError.message}`)
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from('po_items')
        .select(`
          *,
          pn_master_table:pn_id (
            pn_id,
            pn,
            description
          )
        `)
        .eq('po_id', id)
        .order('line_number')

      if (itemsError) {
        console.error('PO Items Fetch Error:', itemsError)
        throw new Error(`Failed to fetch PO items: ${itemsError.message}`)
      }

      // Populate form with existing data
      setValue('my_company_id', poData.my_company_id)
      setValue('vendor_company_id', poData.vendor_company_id)
      setValue('po_date', new Date(poData.po_date))
      setValue('ship_to_company_name', poData.ship_to_company_name || '')
      setValue('ship_to_address_details', poData.ship_to_address_details || '')
      setValue('ship_to_contact_name', poData.ship_to_contact_name || '')
      setValue('ship_to_contact_phone', poData.ship_to_contact_phone || '')
      setValue('ship_to_contact_email', poData.ship_to_contact_email || '')
      setValue('prepared_by_name', poData.prepared_by_name || 'System User')
      setValue('currency', poData.currency)
      setValue('ship_via_id', poData.ship_via_id || '')
      setValue('payment_term', poData.payment_term || '')
      setValue('remarks_1', poData.remarks_1 || '')
      setValue('freight_charge', poData.freight_charge || 0)
      setValue('misc_charge', poData.misc_charge || 0)
      setValue('vat_percentage', poData.vat_percentage || 0)
      setValue('status', poData.status)
      setValue('items', itemsData.map(item => ({
        po_item_id: item.po_item_id,
        pn_id: item.pn_id || '',
        description: item.description || item.pn_master_table?.description || '',
        sn: item.sn || '',
        quantity: item.quantity,
        unit_price: item.unit_price,
        condition: item.condition || '',
      })))
    } catch (error) {
      console.error('Error fetching purchase order:', error)
      toast.error('Failed to fetch purchase order')
      router.push('/portal/purchase-orders')
    } finally {
      setLoading(false)
    }
  }, [setValue, router])

  const fetchData = useCallback(async () => {
    try {
      const [myCompaniesResult, companiesResult, partNumbersResult, shipViaResult] = await Promise.all([
        supabase.from('my_companies').select('*').order('my_company_name'),
        supabase.from('companies').select('*').order('company_name'),
        supabase.from('pn_master_table').select('pn_id, pn, description').order('pn'),
        supabase.from('my_ship_via').select('*').order('ship_company_name')
      ])

      if (myCompaniesResult.error) {
        console.error('My Companies Fetch Error:', myCompaniesResult.error)
        throw new Error(`Failed to fetch my companies: ${myCompaniesResult.error.message}`)
      }
      if (companiesResult.error) {
        console.error('Companies Fetch Error:', companiesResult.error)
        throw new Error(`Failed to fetch companies: ${companiesResult.error.message}`)
      }
      if (partNumbersResult.error) {
        console.error('Part Numbers Fetch Error:', partNumbersResult.error)
        throw new Error(`Failed to fetch part numbers: ${partNumbersResult.error.message}`)
      }
      if (shipViaResult.error) {
        console.error('Ship Via Fetch Error:', shipViaResult.error)
        throw new Error(`Failed to fetch ship via: ${shipViaResult.error.message}`)
      }

      // Fetch addresses and contacts separately
      const [myCompanyAddresses, myCompanyContacts, companyAddresses, companyContacts] = await Promise.all([
        supabase.from('company_addresses').select('*').eq('company_ref_type', 'my_companies'),
        supabase.from('company_contacts').select('*').eq('company_ref_type', 'my_companies'),
        supabase.from('company_addresses').select('*').eq('company_ref_type', 'companies'),
        supabase.from('company_contacts').select('*').eq('company_ref_type', 'companies')
      ])

      // Combine my companies with their addresses and contacts
      const enrichedMyCompanies = myCompaniesResult.data?.map(company => ({
        ...company,
        company_addresses: myCompanyAddresses.data?.filter(addr => addr.company_id === company.my_company_id) || [],
        company_contacts: myCompanyContacts.data?.filter(contact => contact.company_id === company.my_company_id) || []
      })) || []

      // Combine external companies with their addresses and contacts
      const enrichedExternalCompanies = companiesResult.data?.map(company => ({
        ...company,
        company_addresses: companyAddresses.data?.filter(addr => addr.company_id === company.company_id) || [],
        company_contacts: companyContacts.data?.filter(contact => contact.company_id === company.company_id) || []
      })) || []

      setMyCompanies(enrichedMyCompanies)
      setExternalCompanies(enrichedExternalCompanies)
      setPartNumbers(partNumbersResult.data || [])
      setShipViaList(shipViaResult.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load form data')
    }
  }, [])

  useEffect(() => {
    if (poId) {
      fetchData()
      fetchPurchaseOrder(poId)
    }
  }, [poId, fetchData, fetchPurchaseOrder])

  const calculateSubtotal = () => {
    return form.watch('items').reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  }

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const freight = form.watch('freight_charge') || 0
    const misc = form.watch('misc_charge') || 0
    const vatPercentage = form.watch('vat_percentage') || 0
    const vatAmount = subtotal * (vatPercentage / 100)
    return subtotal + freight + misc + vatAmount
  }

  const onSubmit = async (data: PurchaseOrderFormValues) => {
    try {
      const subtotal = calculateSubtotal()
      const total = calculateTotal()

      // Update the purchase order
      const { error: poUpdateError } = await supabase
        .from('purchase_orders')
        .update({
          my_company_id: data.my_company_id,
          vendor_company_id: data.vendor_company_id,
          po_date: dateFns.format(data.po_date, 'yyyy-MM-dd'),
          ship_to_company_name: data.ship_to_company_name || null,
          ship_to_address_details: data.ship_to_address_details || null,
          ship_to_contact_name: data.ship_to_contact_name || null,
          ship_to_contact_phone: data.ship_to_contact_phone || null,
          ship_to_contact_email: data.ship_to_contact_email || null,
          prepared_by_name: data.prepared_by_name,
          currency: data.currency,
          ship_via_id: data.ship_via_id || null,
          payment_term: data.payment_term || null,
          remarks_1: data.remarks_1 || null,
          freight_charge: data.freight_charge,
          misc_charge: data.misc_charge,
          vat_percentage: data.vat_percentage,
          status: data.status,
          subtotal,
          total_amount: total,
        })
        .eq('po_id', poId)

      if (poUpdateError) {
        throw new Error(`Failed to update purchase order: ${poUpdateError.message}`)
      }

      // Delete existing line items
      const { error: deleteError } = await supabase
        .from('po_items')
        .delete()
        .eq('po_id', poId)

      if (deleteError) {
        throw new Error(`Failed to delete existing line items: ${deleteError.message}`)
      }

      // Create new line items
      const lineItems = data.items.map((item, index) => ({
        po_id: poId,
        line_number: index + 1,
        pn_id: item.pn_id || null,
        description: item.description,
        sn: item.sn || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        condition: item.condition || null,
      }))

      const { error: itemsError } = await supabase
        .from('po_items')
        .insert(lineItems)

      if (itemsError) {
        throw new Error(`Failed to insert new line items: ${itemsError.message}`)
      }

      toast.success('Purchase order updated successfully')
      router.push(`/portal/purchase-orders/${poId}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
      console.error('Error updating purchase order:', errorMessage)
      toast.error(`Update failed: ${errorMessage}`)
    }
  }

  const selectedMyCompany = myCompanies.find(c => c.my_company_id === form.watch('my_company_id'))
  const selectedVendor = externalCompanies.find(c => c.company_id === form.watch('vendor_company_id'))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading purchase order...</div>
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
          <h1 className="text-3xl font-bold text-slate-900">Edit Purchase Order</h1>        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Header Information */}
        <Card>
          <CardHeader>
            <CardTitle>Purchase Order Details</CardTitle>
            <CardDescription>Basic information for the purchase order</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="my_company_id">My Company</Label>
                <Select
                  value={form.watch('my_company_id')}
                  onValueChange={(value) => setValue('my_company_id', value)}
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
                <Label htmlFor="vendor_company_id">Vendor</Label>
                <Select
                  value={form.watch('vendor_company_id')}
                  onValueChange={(value) => setValue('vendor_company_id', value)}
                >
                  <SelectTrigger id="vendor_company_id" className={form.formState.errors.vendor_company_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {externalCompanies.map((company) => (
                      <SelectItem key={company.company_id} value={company.company_id}>
                        {company.company_code} - {company.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.watch('status')}
                  onValueChange={(value) => setValue('status', value)}
                >
                  <SelectTrigger id="status_trigger_3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Sent">Sent</SelectItem>
                    <SelectItem value="Acknowledged">Acknowledged</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>PO Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.watch('po_date') && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch('po_date') ? dateFns.format(form.watch('po_date'), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={form.watch('po_date')}
                      onSelect={(date) => setValue('po_date', date || new Date())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="prepared_by_name">Prepared By</Label>
                <Input
                  id="prepared_by_name"
                  {...form.register('prepared_by_name')}
                  className={form.formState.errors.prepared_by_name ? 'border-red-500' : ''}
                  onBlur={e => {
                    if (e.target.value) {
                      localStorage.setItem('po_prepared_by', e.target.value)
                    }
                  }}
                />
                <button
                  type="button"
                  className="text-xs underline text-blue-600 mt-1"
                  onClick={() => {
                    const name = prompt('Enter your name for future POs:')
                    if (name) {
                      setValue('prepared_by_name', name)
                      localStorage.setItem('po_prepared_by', name)
                    }
                  }}
                >
                  Save name for future use
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company Address Display */}
        {(selectedMyCompany || selectedVendor) && (
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedMyCompany && (
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">From (My Company)</h4>
                    <div className="text-sm text-slate-600 space-y-1">
                      <div className="font-medium">{selectedMyCompany.my_company_name}</div>
                      <div>{selectedMyCompany.my_company_code}</div>
                      {selectedMyCompany.company_addresses.length > 0 && (
                        <>
                          {selectedMyCompany.company_addresses.map((addr, idx) => (
                            <div key={idx}>
                              <div>{addr.address_line1}</div>
                              {addr.address_line2 && <div>{addr.address_line2}</div>}
                              {(addr.city || addr.country) && (
                                <div>
                                  {addr.city}
                                  {addr.city && addr.country && ', '}
                                  {addr.country}
                                </div>
                              )}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {selectedVendor && (
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">To (Vendor)</h4>
                    <div className="text-sm text-slate-600 space-y-1">
                      <div className="font-medium">{selectedVendor.company_name}</div>
                      <div>{selectedVendor.company_code}</div>
                      {selectedVendor.company_addresses.length > 0 && (
                        <>
                          {selectedVendor.company_addresses.map((addr, idx) => (
                            <div key={idx}>
                              <div>{addr.address_line1}</div>
                              {addr.address_line2 && <div>{addr.address_line2}</div>}
                              {(addr.city || addr.country) && (
                                <div>
                                  {addr.city}
                                  {addr.city && addr.country && ', '}
                                  {addr.country}
                                </div>
                              )}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ship To Information */}
        <Card>
          <CardHeader>
            <CardTitle>Ship To / Consignee</CardTitle>
            <CardDescription>Shipping address (if different from your company)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ship_to_company_name">Company Name</Label>
                <Input
                  id="ship_to_company_name"
                  {...form.register('ship_to_company_name')}
                  placeholder="Optional"
                />
              </div>

              <div>
                <Label htmlFor="ship_to_contact_name">Contact Name</Label>
                <Input
                  id="ship_to_contact_name"
                  {...form.register('ship_to_contact_name')}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="ship_to_address_details">Address Details</Label>
              <Textarea
                id="ship_to_address_details"
                {...form.register('ship_to_address_details')}
                rows={3}
                placeholder="Optional"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ship_to_contact_phone">Contact Phone</Label>
                <Input
                  id="ship_to_contact_phone"
                  {...form.register('ship_to_contact_phone')}
                  placeholder="Optional"
                />
              </div>

              <div>
                <Label htmlFor="ship_to_contact_email">Contact Email</Label>
                <Input
                  id="ship_to_contact_email"
                  type="email"
                  {...form.register('ship_to_contact_email')}
                  placeholder="Optional"
                />
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
                <Label htmlFor="ship_via_id">Ship Via</Label>
                <Select
                  value={form.watch('ship_via_id')}
                  onValueChange={(value) => setValue('ship_via_id', value)}
                >
                  <SelectTrigger id="ship_via_id" className={form.formState.errors.ship_via_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select shipping method" />
                  </SelectTrigger>
                  <SelectContent>
                    {shipViaList.map((shipVia) => (
                      <SelectItem key={shipVia.ship_via_id} value={shipVia.ship_via_id}>
                        {shipVia.ship_company_name} # {shipVia.account_no}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="payment_term">Payment Term</Label>
                <Select
                  value={form.watch('payment_term')}
                  onValueChange={(value) => setValue('payment_term', value)}
                >
                  <SelectTrigger id="payment_term_trigger_5">
                    <SelectValue placeholder="Select payment term" />
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
                  <SelectTrigger id="currency_trigger_6">
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
              <Label htmlFor="remarks_1">Remarks</Label>
              <Textarea
                id="remarks_1"
                {...form.register('remarks_1')}
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
                <CardDescription>Update items in this purchase order</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({
                  pn_id: '',
                  description: '',
                  sn: '',
                  quantity: 1,
                  unit_price: 0,
                  condition: '',
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
                <Card key={field.id} className="p-4 relative" data-testid={`line-item-${index}`}>
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
                      <Label htmlFor={`items.${index}.pn_id`}>Part Number</Label>
                      <Select
                        value={form.watch(`items.${index}.pn_id`)}
                        onValueChange={(value) => {
                          setValue(`items.${index}.pn_id`, value)
                          const selectedPart = partNumbers.find(pn => pn.pn_id === value)
                          if (selectedPart && selectedPart.description) {
                            setValue(`items.${index}.description`, selectedPart.description)
                          }
                        }}
                      >
                        <SelectTrigger id={`pn_id_trigger_${index}`} className={form.formState.errors.items?.[index]?.pn_id ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select part number" />
                        </SelectTrigger>
                        <SelectContent>
                          {partNumbers.map((pn) => (
                            <SelectItem key={pn.pn_id} value={pn.pn_id}>
                              <div>
                                <div className="font-mono">{pn.pn}</div>
                                {pn.description && (
                                  <div className="text-sm text-slate-600">{pn.description}</div>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.formState.errors.items?.[index]?.pn_id && (
                        <div className="text-red-500 text-sm mt-1">
                          {form.formState.errors.items[index]?.pn_id?.message}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor={`items.${index}.description`}>Description</Label>
                      <Input
                        id={`items.${index}.description`}
                        {...form.register(`items.${index}.description`)}
                        placeholder="Item description"
                        className={form.formState.errors.items?.[index]?.description ? 'border-red-500' : ''}
                      />
                      {form.formState.errors.items?.[index]?.description && (
                        <div className="text-red-500 text-sm mt-1">
                          {form.formState.errors.items[index]?.description?.message}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor={`items.${index}.sn`}>Serial Number</Label>
                      <Input
                        id={`items.${index}.sn`}
                        {...form.register(`items.${index}.sn`)}
                        placeholder="Optional"
                      />
                    </div>

                    <div>
                      <Label htmlFor={`items.${index}.condition`}>Condition</Label>
                      <Select
                        value={form.watch(`items.${index}.condition`)}
                        onValueChange={(value) => setValue(`items.${index}.condition`, value)}
                      >
                        <SelectTrigger id={`condition_trigger_${index}`}>
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AR">AR</SelectItem>
                          <SelectItem value="SVC">SVC</SelectItem>
                          <SelectItem value="AS-IS">AS-IS</SelectItem>
                          <SelectItem value="OHC">OHC</SelectItem>
                          <SelectItem value="INS">INS</SelectItem>
                          <SelectItem value="REP">REP</SelectItem>
                          <SelectItem value="MOD">MOD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor={`items.${index}.quantity`}>Quantity</Label>
                      <Input
                        id={`items.${index}.quantity`}
                        type="number"
                        min="1"
                        {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                        className={form.formState.errors.items?.[index]?.quantity ? 'border-red-500' : ''}
                      />
                      {form.formState.errors.items?.[index]?.quantity && (
                        <div className="text-red-500 text-sm mt-1">
                          {form.formState.errors.items[index]?.quantity?.message}
                        </div>
                      )}
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
                      {form.formState.errors.items?.[index]?.unit_price && (
                        <div className="text-red-500 text-sm mt-1">
                          {form.formState.errors.items[index]?.unit_price?.message}
                        </div>
                      )}
                    </div>
                  </div>

                  {form.watch(`items.${index}.quantity`) && form.watch(`items.${index}.unit_price`) && (
                    <div className="mt-4 text-right">
                      <span className="text-sm text-slate-600">Line Total: </span>
                      <span className="font-semibold">
                        ${(form.watch(`items.${index}.quantity`) * form.watch(`items.${index}.unit_price`)).toFixed(2)}
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
                <span>${calculateSubtotal().toFixed(2)}</span>
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
                <span>${(calculateSubtotal() * ((form.watch('vat_percentage') || 0) / 100)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total NET:</span>
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
            {form.formState.isSubmitting ? 'Updating...' : 'Update Purchase Order'}
          </Button>
        </div>
      </form>
    </div>
  )
}