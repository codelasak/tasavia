'use client'

import { useEffect, useState } from 'react'
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
import { useAuth } from '@/components/auth/AuthProvider'
import { usePurchaseOrdersContext } from '@/hooks/usePurchaseOrdersContext'
import { fetchCountries } from '@/lib/external-apis'
import FileUpload from '@/components/ui/file-upload'
import { type UnifiedCompany } from '@/lib/services/company-service'

interface MyCompany {
  my_company_id: string
  my_company_name: string
  my_company_code: string
  is_self: boolean
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
  default_payment_terms?: string | null
}

interface ExternalCompany {
  company_id: string
  company_name: string
  company_code: string | null
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
  owner?: string | null
  ship_model?: string | null
  predefined_company?: string | null
  custom_company_name?: string | null
}

interface NewPurchaseOrderClientPageProps {
  myCompanies: MyCompany[]
  externalCompanies: ExternalCompany[]
  partNumbers: PartNumber[]
  shipViaList: ShipVia[]
}

const CURRENCY_OPTIONS = ['USD', 'EURO', 'TL', 'GBP'];
const PAYMENT_TERM_OPTIONS = ['PRE-PAY', 'COD', 'NET5', 'NET10', 'NET15', 'NET30'];

// Updated purchase order schema without aviation compliance fields
const formSchema = z.object({
  my_company_id: z.string().min(1, 'My company is required'),
  vendor_company_id: z.string().min(1, 'Vendor is required'),
  po_date: z.date(),
  ship_to_company_id: z.string().optional(),
  ship_to_company_type: z.enum(['my_company', 'external_company']).optional(),
  prepared_by_name: z.string().min(1, 'Prepared by name is required'),
  currency: z.enum(CURRENCY_OPTIONS as [string, ...string[]]),
  ship_via_id: z.string().optional(),
  payment_term: z.enum(PAYMENT_TERM_OPTIONS as [string, ...string[]]).optional(),
  remarks_1: z.string().optional(),
  freight_charge: z.number().min(0).default(0),
  misc_charge: z.number().min(0).default(0),
  vat_percentage: z.number().min(0).max(100).default(0),
  items: z.array(z.object({
    pn_id: z.string().min(1, 'Part number is required'),
    description: z.string().min(1, 'Description is required'),
    sn: z.string().optional(),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    unit_price: z.number().min(0, 'Unit price must be positive'),
    condition: z.string().optional(),
    // Enhanced traceability fields
    traceability_source: z.string().optional(),
    traceable_to: z.string().optional(),
    origin_country: z.string().optional(),
    origin_country_code: z.string().optional(),
    last_certified_agency: z.string().optional(),
    traceability_files_path: z.array(z.object({
      id: z.string(),
      name: z.string(),
      size: z.number(),
      url: z.string(),
      path: z.string(),
      uploadedAt: z.date()
    })).optional(),
  })).min(1, 'At least one item is required'),
})

type FormValues = z.infer<typeof formSchema>

export default function NewPurchaseOrderClientPage({
  myCompanies,
  externalCompanies,
  partNumbers,
  shipViaList,
}: NewPurchaseOrderClientPageProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { addPurchaseOrder } = usePurchaseOrdersContext()

  // State for external API data
  const [countries, setCountries] = useState<{ name: string; code: string; region: string }[]>([])
  const [loadingCountries, setLoadingCountries] = useState(false)


  // Load external data
  useEffect(() => {
    const loadExternalData = async () => {
      // Load countries for origin country field in line items
      setLoadingCountries(true)
      try {
        const countriesData = await fetchCountries()
        setCountries(countriesData)
      } catch (error) {
        console.error('Failed to load countries:', error)
      } finally {
        setLoadingCountries(false)
      }
    }

    loadExternalData()
  }, [])

  // Auto-select current user in Prepared By field
  useEffect(() => {
    const fetchUserName = async () => {
      if (user) {
        try {
          const { data: accountData } = await supabase
            .from('accounts')
            .select('name')
            .eq('id', user.id)
            .single()
          
          const userName = accountData?.name || user.email || 'Current User'
          form.setValue('prepared_by_name', userName)
        } catch (error) {
          // Error fetching user name
          form.setValue('prepared_by_name', user.email || 'Current User')
        }
      }
    }
    
    fetchUserName()
    // eslint-disable-next-line
  }, [user])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      my_company_id: '',
      vendor_company_id: '',
      po_date: new Date(),
      ship_to_company_id: '',
      ship_to_company_type: undefined,
      prepared_by_name: 'Current User',
      currency: 'USD',
      ship_via_id: '',
      payment_term: '',
      remarks_1: '',
      freight_charge: 0,
      misc_charge: 0,
      vat_percentage: 0,
      items: [
        {
          pn_id: '',
          description: '',
          sn: '',
          quantity: 1,
          unit_price: 0,
          condition: '',
          // Enhanced traceability fields
          traceability_source: '',
          traceable_to: '',
          origin_country: '',
          origin_country_code: '',
          last_certified_agency: '',
          traceability_files_path: [],
        }
      ],
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  })

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

  const onSubmit = async (data: FormValues) => {
    try {
      const subtotal = calculateSubtotal()
      const total = calculateTotal()

      // Get ship-to company information if selected
      let shipToData = {}
      if (data.ship_to_company_id && data.ship_to_company_type) {
        const shipToCompany = data.ship_to_company_type === 'my_company' 
          ? myCompanies.find(c => c.my_company_id === data.ship_to_company_id)
          : externalCompanies.find(c => c.company_id === data.ship_to_company_id)
        
        if (shipToCompany) {
          const companyName = 'my_company_name' in shipToCompany 
            ? shipToCompany.my_company_name 
            : shipToCompany.company_name
          
          const address = shipToCompany.company_addresses[0]
          const contact = shipToCompany.company_contacts[0]
          
          shipToData = {
            ship_to_company_name: companyName,
            ship_to_address_details: address ? `${address.address_line1}${address.address_line2 ? ', ' + address.address_line2 : ''}${address.city || address.country ? ', ' + [address.city, address.country].filter(Boolean).join(', ') : ''}` : null,
            ship_to_contact_name: contact?.contact_name || null,
            ship_to_contact_phone: contact?.phone || null,
            ship_to_contact_email: contact?.email || null,
          }
        }
      }

      // Generate a unique PO number
      const poNumber = `PO-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
      
      // Create the purchase order
      const insertData = {
        po_number: poNumber,
        company_id: data.my_company_id,
        vendor_company_id: data.vendor_company_id,
        po_date: dateFns.format(data.po_date, 'yyyy-MM-dd'),
        ...shipToData,
        prepared_by_name: data.prepared_by_name,
        currency: data.currency,
        ship_via_id: data.ship_via_id || null,
        payment_term: data.payment_term || null,
        remarks_1: data.remarks_1 || null,
        freight_charge: data.freight_charge,
        misc_charge: data.misc_charge,
        vat_percentage: data.vat_percentage,
        subtotal,
        total_amount: total,
      }

      const { data: poData, error: poError } = await supabase
        .from('purchase_orders')
        .insert(insertData)
        .select()
        .single()

      if (poError) {
        throw new Error(`Failed to create purchase order: ${poError.message}`)
      }


      // Create the line items with enhanced traceability fields
      const lineItems = data.items.map((item, index) => ({
        po_id: poData.po_id,
        line_number: index + 1,
        pn_id: item.pn_id,
        description: item.description,
        sn: item.sn || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        condition: item.condition || null,
        // Enhanced traceability fields
        traceability_source: item.traceability_source || null,
        traceable_to: item.traceable_to || null,
        origin_country: item.origin_country || null,
        origin_country_code: item.origin_country_code || null,
        last_certified_agency: item.last_certified_agency || null,
        traceability_files_path: item.traceability_files_path && item.traceability_files_path.length > 0 
          ? JSON.stringify(item.traceability_files_path) 
          : null,
      }))

      const { error: itemsError } = await supabase
        .from('po_items')
        .insert(lineItems)

      if (itemsError) {
        throw new Error(`Failed to create line items: ${itemsError.message}`)
      }

      // Add the new PO to the global context so it appears in the list immediately
      const newPOForList = {
        po_id: poData.po_id,
        po_number: poData.po_number,
        po_date: poData.po_date,
        status: poData.status,
        total_amount: poData.total_amount || 0,
        buyer_company: myCompanies.find(c => c.my_company_id === data.my_company_id) ? {
          company_name: myCompanies.find(c => c.my_company_id === data.my_company_id)!.my_company_name,
          company_code: myCompanies.find(c => c.my_company_id === data.my_company_id)!.my_company_code
        } : null,
        vendor_company: externalCompanies.find(c => c.company_id === data.vendor_company_id) ? {
          company_name: externalCompanies.find(c => c.company_id === data.vendor_company_id)!.company_name,
          company_code: externalCompanies.find(c => c.company_id === data.vendor_company_id)!.company_code || ''
        } : null,
        created_at: poData.created_at || new Date().toISOString()
      }
      
      addPurchaseOrder(newPOForList)
      toast.success('Purchase order created successfully')
      
      // Redirect to purchase orders list
      router.push('/portal/purchase-orders')
    } catch (error: unknown) {
      // Error creating purchase order
      const errorMessage = error instanceof Error ? error.message : 'Failed to create purchase order'
      toast.error(errorMessage)
    }
  }

  const selectedMyCompany = myCompanies.find(c => c.my_company_id === form.watch('my_company_id'))
  const selectedVendor = externalCompanies.find(c => c.company_id === form.watch('vendor_company_id'))
  const selectedShipToCompany = form.watch('ship_to_company_type') === 'my_company' 
    ? myCompanies.find(c => c.my_company_id === form.watch('ship_to_company_id'))
    : externalCompanies.find(c => c.company_id === form.watch('ship_to_company_id'))
  
  // Filter Ship Via options based on Ship-To company (if selected), otherwise fallback to My Company
  const getShipViaFilterCompany = () => {
    // Priority: Ship-To company first, then My Company as fallback
    if (selectedShipToCompany) {
      const companyName = 'my_company_name' in selectedShipToCompany 
        ? selectedShipToCompany.my_company_name 
        : selectedShipToCompany.company_name
      const companyCode = 'my_company_code' in selectedShipToCompany 
        ? selectedShipToCompany.my_company_code 
        : selectedShipToCompany.company_code
      return { name: companyName, code: companyCode }
    }
    
    if (selectedMyCompany) {
      return { 
        name: selectedMyCompany.my_company_name, 
        code: selectedMyCompany.my_company_code 
      }
    }
    
    return null
  }
  
  const filterCompany = getShipViaFilterCompany()
  const filteredShipViaList = filterCompany
    ? shipViaList.filter(shipVia => 
        shipVia.owner === filterCompany.name || 
        shipVia.owner === filterCompany.code ||
        !shipVia.owner
      )
    : shipViaList

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => router.push('/portal/purchase-orders')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Create Purchase Order</h1>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Header Information */}
        <Card>
          <CardHeader>
            <CardTitle>Purchase Order Details</CardTitle>
            <CardDescription>Basic information for the purchase order</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="my_company_id">My Company</Label>
                <Select
                  value={form.watch('my_company_id')}
                  onValueChange={(value) => form.setValue('my_company_id', value)}
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
                <Label htmlFor="vendor_company_id">Vendor</Label>
                <Select
                  value={form.watch('vendor_company_id')}
                  onValueChange={(value) => form.setValue('vendor_company_id', value)}
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
                {form.formState.errors.vendor_company_id && (
                  <div className="text-red-500 text-sm mt-1">
                    {form.formState.errors.vendor_company_id.message}
                  </div>
                )}
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
                      onSelect={(date) => form.setValue('po_date', date || new Date())}
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
                  readOnly
                  title="Auto-populated with current user"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Auto-populated with current user
                </div>
                {form.formState.errors.prepared_by_name && (
                  <div className="text-red-500 text-sm mt-1">
                    {form.formState.errors.prepared_by_name.message}
                  </div>
                )}
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
                      {selectedMyCompany?.company_addresses?.length > 0 && (
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
                      {selectedVendor?.company_addresses?.length > 0 && (
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
            <CardDescription>Select shipping destination (optional - defaults to your company if not specified)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Company Type</Label>
                <Select
                  value={form.watch('ship_to_company_type') || ''}
                  onValueChange={(value) => {
                    form.setValue('ship_to_company_type', value as 'my_company' | 'external_company')
                    form.setValue('ship_to_company_id', '')
                    // Clear Ship Via selection when Ship-To company type changes
                    form.setValue('ship_via_id', '')
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="my_company">My Companies</SelectItem>
                    <SelectItem value="external_company">External Companies</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Ship To Company</Label>
                <Select
                  value={form.watch('ship_to_company_id') || ''}
                  onValueChange={(value) => {
                    form.setValue('ship_to_company_id', value)
                    // Clear Ship Via selection when Ship-To company changes
                    form.setValue('ship_via_id', '')
                  }}
                  disabled={!form.watch('ship_to_company_type')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {form.watch('ship_to_company_type') === 'my_company' 
                      ? myCompanies.map((company) => (
                          <SelectItem key={company.my_company_id} value={company.my_company_id}>
                            {company.my_company_code} - {company.my_company_name}
                          </SelectItem>
                        ))
                      : externalCompanies.map((company) => (
                          <SelectItem key={company.company_id} value={company.company_id}>
                            {company.company_code} - {company.company_name}
                          </SelectItem>
                        ))
                    }
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Display selected ship-to company information */}
            {selectedShipToCompany && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-2">Selected Ship To Company</h4>
                <div className="text-sm text-slate-600 space-y-1">
                  <div className="font-medium">
                    {'my_company_name' in selectedShipToCompany 
                      ? selectedShipToCompany.my_company_name 
                      : selectedShipToCompany.company_name}
                  </div>
                  {selectedShipToCompany?.company_addresses?.length > 0 && (
                    <>
                      {selectedShipToCompany.company_addresses.map((addr, idx) => (
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
                  {selectedShipToCompany?.company_contacts?.length > 0 && (
                    <div className="mt-2">
                      <div className="font-medium">Contact:</div>
                      {selectedShipToCompany.company_contacts.map((contact, idx) => (
                        <div key={idx}>
                          <div>{contact.contact_name}</div>
                          {contact.phone && <div>Phone: {contact.phone}</div>}
                          {contact.email && <div>Email: {contact.email}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
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
                <Label htmlFor="ship_via_id">
                  Ship Via
                  {filterCompany && (
                    <span className="text-xs text-slate-500 ml-1">
                      (for {filterCompany.name})
                    </span>
                  )}
                </Label>
                <Select
                  value={form.watch('ship_via_id')}
                  onValueChange={(value) => form.setValue('ship_via_id', value)}
                >
                  <SelectTrigger id="ship_via_id">
                    <SelectValue placeholder="Select shipping method" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredShipViaList.map((shipVia) => (
                      <SelectItem key={shipVia.ship_via_id} value={shipVia.ship_via_id}>
                        <div className="flex flex-col">
                          <div className="font-medium">
                            {shipVia.predefined_company === 'CUSTOM' && shipVia.custom_company_name 
                              ? shipVia.custom_company_name 
                              : shipVia.ship_company_name}
                          </div>
                          <div className="text-sm text-slate-600">
                            Account: {shipVia.account_no}
                            {shipVia.owner && ` • Owner: ${shipVia.owner}`}
                            {shipVia.ship_model && ` • ${shipVia.ship_model}`}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={form.watch('currency')}
                  onValueChange={value => form.setValue('currency', value)}
                >
                  <SelectTrigger id="currency" className={form.formState.errors.currency ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.currency && (
                  <div className="text-red-500 text-xs mt-1">{form.formState.errors.currency.message}</div>
                )}
              </div>

              <div>
                <Label htmlFor="payment_term">Payment Term</Label>
                <Select
                  value={form.watch('payment_term')}
                  onValueChange={value => form.setValue('payment_term', value)}
                >
                  <SelectTrigger id="payment_term" className={form.formState.errors.payment_term ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select payment term" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TERM_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.payment_term && (
                  <div className="text-red-500 text-xs mt-1">{form.formState.errors.payment_term.message}</div>
                )}
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
                <CardDescription>Add items to this purchase order</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => append({
                  pn_id: '',
                  description: '',
                  sn: '',
                  quantity: 1,
                  unit_price: 0,
                  condition: '',
                  // Enhanced traceability fields
                  traceability_source: '',
                          traceable_to: '',
                  origin_country: '',
                  origin_country_code: '',
                  last_certified_agency: '',
                  traceability_files_path: [],
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
                <Card key={field.id} className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">Item {index + 1}</h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        aria-label="Remove Item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Part Number</Label>
                      <Select
                        value={form.watch(`items.${index}.pn_id`)}
                        onValueChange={(value) => {
                          form.setValue(`items.${index}.pn_id`, value)
                          const selectedPart = partNumbers.find(pn => pn.pn_id === value)
                          if (selectedPart && selectedPart.description) {
                            form.setValue(`items.${index}.description`, selectedPart.description)
                          }
                        }}
                      >
                        <SelectTrigger>
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
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Input
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
                      <Label>Serial Number</Label>
                      <Input
                        {...form.register(`items.${index}.sn`)}
                        placeholder="Optional"
                      />
                    </div>

                    <div>
                      <Label>Condition</Label>
                      <Select
                        value={form.watch(`items.${index}.condition`)}
                        onValueChange={(value) => form.setValue(`items.${index}.condition`, value)}
                      >
                        <SelectTrigger>
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
                      <Label>Quantity</Label>
                      <Input
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

                  {/* Enhanced Traceability Fields */}
                  <div className="mt-4">
                    <h5 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                      <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-md">ATA 106</span>
                      Traceability Information
                    </h5>
                    
                    {/* First row - Obtained from, Traceable To */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label htmlFor={`items.${index}.traceability_source`}>Obtained from</Label>
                        <Input
                          id={`items.${index}.traceability_source`}
                          {...form.register(`items.${index}.traceability_source`)}
                          placeholder="e.g., Boeing Aircraft Company"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          Source where part was obtained from
                        </div>
                      </div>

                      <div>
                        <Label htmlFor={`items.${index}.traceable_to`}>Traceable To</Label>
                        <Input
                          id={`items.${index}.traceable_to`}
                          {...form.register(`items.${index}.traceable_to`)}
                          placeholder="e.g., Aircraft N12345"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          What this part is traceable to
                        </div>
                      </div>
                    </div>

                    {/* Second row - Origin Country, Last Certified Agency */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label htmlFor={`items.${index}.origin_country`}>Origin Country</Label>
                        <Select
                          value={form.watch(`items.${index}.origin_country`) || ''}
                          onValueChange={(value) => {
                            const selectedCountry = countries.find(c => c.name === value)
                            if (selectedCountry) {
                              form.setValue(`items.${index}.origin_country`, selectedCountry.name)
                              form.setValue(`items.${index}.origin_country_code`, selectedCountry.code)
                            }
                          }}
                        >
                          <SelectTrigger id={`items.${index}.origin_country`}>
                            <SelectValue placeholder={loadingCountries ? "Loading countries..." : "Select origin country"} />
                          </SelectTrigger>
                          <SelectContent>
                            {countries.map((country) => (
                              <SelectItem key={country.code} value={country.name}>
                                <div className="flex items-center gap-2">
                                  <span>{country.name}</span>
                                  <span className="text-sm text-slate-500">({country.code})</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="text-xs text-gray-500 mt-1">
                          Country where the part originated
                        </div>
                      </div>

                      <div>
                        <Label htmlFor={`items.${index}.last_certified_agency`}>
                          Last Certified Agency
                          <span className="text-xs text-gray-400 ml-1">(if applicable)</span>
                        </Label>
                        <Input
                          id={`items.${index}.last_certified_agency`}
                          {...form.register(`items.${index}.last_certified_agency`)}
                          placeholder="e.g., FAA, EASA"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          Certification authority, if part has been certified
                        </div>
                      </div>
                    </div>

                    {/* Third row - Traceability Files */}
                    <div className="mb-4">
                      <div>
                        <Label>Traceability Documents</Label>
                        <div className="mt-2">
                          <FileUpload
                            maxFiles={5}
                            maxSizeBytes={10 * 1024 * 1024} // 10MB
                            acceptedFileTypes={['application/pdf']}
                            existingFiles={form.watch(`items.${index}.traceability_files_path`) || []}
                            onFilesChange={(files) => {
                              form.setValue(`items.${index}.traceability_files_path`, files)
                            }}
                            bucketName="traceability-documents"
                            folderPath={`po-items/${Date.now()}`}
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Upload official traceability documents (PDF only)
                        </div>
                      </div>
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
            {form.formState.isSubmitting ? 'Creating...' : 'Create Purchase Order'}
          </Button>
        </div>
      </form>
    </div>
  )
}