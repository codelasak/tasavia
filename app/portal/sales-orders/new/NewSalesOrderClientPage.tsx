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
import { CalendarIcon, Plus, Trash2, ArrowLeft, Loader2, Package, Search } from 'lucide-react'
import * as dateFns from 'date-fns'
import { cn } from '@/lib/utils'
import { PAYMENT_TERMS, CURRENCY_OPTIONS } from '@/lib/constants/sales-order-constants'
import { useCreateSalesOrder } from '@/lib/hooks/usePurchaseOrders'
import {
  validateAWBNumber,
  validateDimensions,
  validateWeightConsistency,
  getFieldValidationStyle,
  type ValidationResult
} from '@/lib/validation/aviation-validation-utils'

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
  unit_cost: number | null
  status: string
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

interface AvailablePurchaseOrder {
  po_id: string
  po_number: string
  po_date: string
  company_id: string
  vendor_company_id: string
  vendor_company_name: string
  currency: string
  status: string
  total_amount: number | null
  payment_term: string | null
  freight_charge: number | null
  misc_charge: number | null
  vat_percentage: number | null
  awb_no: string | null
  remarks_1: string | null
  remarks_2: string | null
  aviation_compliance_notes: string | null
  origin_country_code: string | null
  end_use_country_code: string | null
  traceable_to_airline: string | null
  traceable_to_msn: string | null
  last_certificate: string | null
  certificate_expiry_date: string | null
  ship_via_id: string | null
  company_ship_via?: {
    ship_company_name: string
    ship_model: string | null
  } | null
  companies: {
    company_id: string
    company_name: string
    company_code: string | null
    company_type: string | null
  }
}

interface NewSalesOrderClientPageProps {
  myCompanies: MyCompany[]
  customers: Customer[]
  inventoryItems: InventoryItem[]
  termsAndConditions: TermsAndConditions[]
  availablePOs: AvailablePurchaseOrder[]
}

const salesOrderItemSchema = z.object({
  inventory_id: z.string().min(1, 'Part is required'),
  unit_price: z.number().min(0, 'Unit price must be positive'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
})

const salesOrderSchema = z.object({
  source_purchase_order_id: z.string().optional(),
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
  // Shipping fields
  awb_number: z.string().optional(),
  shipping_carrier: z.string().optional(),
  shipping_method: z.string().optional(),
  shipping_service_type: z.string().optional(),
  tracking_number: z.string().optional(),
  dimensions: z.string().optional(),
  weight: z.number().min(0).optional(),
  gross_weight_kgs: z.number().min(0).optional(),
  shipping_cost: z.number().min(0).optional(),
  shipping_notes: z.string().optional(),
  items: z.array(salesOrderItemSchema).min(1, 'At least one item is required'),
})

type SalesOrderFormValues = z.infer<typeof salesOrderSchema>

export default function NewSalesOrderClientPage({
  myCompanies,
  customers,
  inventoryItems,
  termsAndConditions,
  availablePOs,
}: NewSalesOrderClientPageProps) {
  const router = useRouter()
  const [selectedCustomerNumber, setSelectedCustomerNumber] = useState<string>('')
  const createSalesOrderMutation = useCreateSalesOrder()

  // Helpers to map PO shipping fields to our select enums
  const mapCarrierNameToOption = useCallback((name?: string | null): string | null => {
    if (!name) return null
    const n = name.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (n.includes('fedex')) return 'FEDEX'
    if (n.includes('dhl')) return 'DHL'
    if (n.includes('ups')) return 'UPS'
    if (n.includes('usps')) return 'USPS'
    if (n.includes('turkish') || n.includes('thy')) return 'TURKISH_AIRLINES'
    if (n.includes('lufthansa')) return 'LUFTHANSA'
    return null
  }, [])
  const mapServiceNameToOption = useCallback((name?: string | null): string | null => {
    if (!name) return null
    const n = name.toLowerCase()
    if (n.includes('overnight')) return 'OVERNIGHT'
    if (n.includes('express')) return 'EXPRESS'
    if (n.includes('2') || n.includes('two')) return '2_DAY'
    if (n.includes('economy')) return 'ECONOMY'
    if (n.includes('standard')) return 'STANDARD'
    return null
  }, [])

  const [searchQuery, setSearchQuery] = useState('')
  const [filteredPOs, setFilteredPOs] = useState<AvailablePurchaseOrder[]>(availablePOs)
  const [selectedPO, setSelectedPO] = useState<AvailablePurchaseOrder | null>(null)
  const [inheritFromPO, setInheritFromPO] = useState(false)

  // Form validation states
  const [awbValidation, setAwbValidation] = useState<{
    isValidating: boolean
    isValid: boolean | null
    message: string
    suggestions?: string[]
  }>({ isValidating: false, isValid: null, message: '' })
  
  const [dimensionsValidation, setDimensionsValidation] = useState<{
    isValid: boolean | null
    message: string
  }>({ isValid: null, message: '' })
  
  const [weightValidation, setWeightValidation] = useState<{
    isValid: boolean | null
    message: string
    suggestedConversion?: string
  }>({ isValid: null, message: '' })

  const { setValue, getValues, ...form } = useForm<SalesOrderFormValues>({
    resolver: zodResolver(salesOrderSchema),
    defaultValues: {
      source_purchase_order_id: '',
      my_company_id: '',
      customer_company_id: '',
      customer_po_number: '',
      reference_number: '',
      contract_number: '',
      country_of_origin: '',
      end_use_country: '',
      sales_date: new Date(),
      payment_terms: 'NET30',
      currency: 'USD',
      freight_charge: 0,
      misc_charge: 0,
      vat_percentage: 0,
      terms_and_conditions_id: '',
      remarks: '',
      // Shipping fields
      awb_number: '',
      shipping_carrier: '',
      shipping_method: '',
      shipping_service_type: '',
      tracking_number: '',
      dimensions: '',
      weight: 0,
      gross_weight_kgs: 0,
      shipping_cost: 0,
      shipping_notes: '',
      items: [],
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  })

  // Watch for PO selection changes
  const watchSourcePOId = form.watch('source_purchase_order_id')

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
        // Inherit fields from PO
        setValue('source_purchase_order_id', po.po_id)
        setValue('my_company_id', po.company_id)
        if (po.payment_term) {
          setValue('payment_terms', po.payment_term)
        }
        setValue('currency', po.currency)
        if (po.origin_country_code) {
          setValue('country_of_origin', po.origin_country_code)
        }
        if (po.end_use_country_code) {
          setValue('end_use_country', po.end_use_country_code)
        }
        if (typeof po.freight_charge === 'number') {
          setValue('freight_charge', po.freight_charge)
          setValue('shipping_cost', po.freight_charge)
        }
        if (typeof po.misc_charge === 'number') {
          setValue('misc_charge', po.misc_charge)
        }
        if (typeof po.vat_percentage === 'number') {
          setValue('vat_percentage', po.vat_percentage)
        }
        if (po.awb_no) {
          setValue('awb_number', po.awb_no)
          setValue('shipping_method', 'AIR')
        }
        const joinedRemarks = [po.remarks_1, po.remarks_2, po.aviation_compliance_notes].filter(Boolean).join(' | ')
        if (joinedRemarks) {
          setValue('remarks', joinedRemarks)
        }
        const carrierOpt = mapCarrierNameToOption(po.company_ship_via?.ship_company_name)
        if (carrierOpt) {
          setValue('shipping_carrier', carrierOpt)
        }
        const serviceOpt = mapServiceNameToOption(po.company_ship_via?.ship_model)
        if (serviceOpt) {
          setValue('shipping_service_type', serviceOpt)
        }
      }
    } else if (!watchSourcePOId) {
      setSelectedPO(null)
    }
  }, [watchSourcePOId, inheritFromPO, availablePOs, setValue, mapCarrierNameToOption, mapServiceNameToOption])

  // Clear selection when inheritance is turned off
  useEffect(() => {
    if (!inheritFromPO) {
      setSelectedPO(null)
      setValue('source_purchase_order_id', '')
    }
  }, [inheritFromPO, setValue])

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
      const quantity = item.quantity || 1
      return sum + (quantity * item.unit_price)
    }, 0)
  }, [form])

  const calculateTotal = useCallback(() => {
    const subtotal = calculateSubtotal()
    const freight = form.watch('freight_charge') || 0
    const misc = form.watch('misc_charge') || 0
    const vatPercentage = form.watch('vat_percentage') || 0
    const vatAmount = subtotal * (vatPercentage / 100)
    return subtotal + freight + misc + vatAmount
  }, [calculateSubtotal, form])

  const onSubmit = async (data: SalesOrderFormValues) => {
    const subtotal = calculateSubtotal()
    const total = calculateTotal()
    const vatAmount = subtotal * ((data.vat_percentage || 0) / 100)

    // Prepare invoice data
    const salesOrderData = {
      order: {
        source_purchase_order_id: data.source_purchase_order_id || null,
        company_id: data.my_company_id,
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
        // Shipping fields
        awb_number: data.awb_number || null,
        shipping_carrier: data.shipping_carrier || null,
        shipping_method: data.shipping_method || null,
        shipping_service_type: data.shipping_service_type || null,
        tracking_number: data.tracking_number || null,
        package_dimensions: data.dimensions || null,
        gross_weight_kgs: data.gross_weight_kgs || null,
        shipping_cost: data.shipping_cost || null,
        shipping_notes: data.shipping_notes || null,
        sub_total: subtotal,
        total_net: total,
        status: 'Draft',
      },
      items: data.items.map((item) => ({
        inventory_id: item.inventory_id,
        unit_price: item.unit_price,
        quantity: item.quantity,
      }))
    }

    createSalesOrderMutation.mutate(salesOrderData, {
      onSuccess: () => {
        router.push('/portal/sales-orders')
      }
    })
  }

  // Real-time validation handlers
  const handleAWBValidation = useCallback(async (awbNumber: string) => {
    if (!awbNumber.trim()) {
      setAwbValidation({ isValidating: false, isValid: null, message: '' })
      return
    }
    
    setAwbValidation({ isValidating: true, isValid: null, message: 'Validating AWB...' })
    
    // Use timeout to avoid excessive validation calls
    setTimeout(() => {
      const carrier = form.watch('shipping_carrier')
      const result = validateAWBNumber(awbNumber, carrier)
      
      setAwbValidation({
        isValidating: false,
        isValid: result.isValid,
        message: result.message,
        suggestions: result.suggestions
      })
    }, 300)
  }, [form])
  
  const handleDimensionsValidation = useCallback((dimensions: string) => {
    const result = validateDimensions(dimensions)
    setDimensionsValidation({
      isValid: result.isValid,
      message: result.message
    })
  }, [])
  
  const handleWeightValidation = useCallback(() => {
    const weightLbs = form.watch('weight')
    const weightKgs = form.watch('gross_weight_kgs')
    
    const result = validateWeightConsistency(weightLbs || undefined, weightKgs || undefined)
    setWeightValidation({
      isValid: result.isValid,
      message: result.message,
      suggestedConversion: result.suggestedConversion
    })
  }, [form])

  const selectedCustomer = customers.find(c => c.company_id === form.watch('customer_company_id'))

  useEffect(() => {
    if (selectedCustomer) {
      setSelectedCustomerNumber(selectedCustomer.customer_number || '')
    }
  }, [selectedCustomer])
  
  // Watch for form changes and trigger validation
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'awb_number') {
        handleAWBValidation(value.awb_number || '')
      }
      if (name === 'dimensions') {
        handleDimensionsValidation(value.dimensions || '')
      }
      if (name === 'weight' || name === 'gross_weight_kgs') {
        handleWeightValidation()
      }
      if (name === 'shipping_carrier') {
        // Re-validate AWB when carrier changes
        const awbNumber = form.watch('awb_number')
        if (awbNumber) {
          handleAWBValidation(awbNumber)
        }
      }
    })
    
    return () => subscription.unsubscribe()
  }, [form, handleAWBValidation, handleDimensionsValidation, handleWeightValidation])

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Create Invoice</h1>
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
<Label htmlFor="source_purchase_order_id">Select Purchase Order</Label>
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
                    value={form.watch('source_purchase_order_id')}
                    onValueChange={(value) => {
                      setValue('source_purchase_order_id', value)
                      setInheritFromPO(true)
                    }}
                  >
                    <SelectTrigger className={form.formState.errors.source_purchase_order_id ? 'border-red-500' : ''}>
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
                          {selectedPO.company_ship_via?.ship_company_name && (
                            <div>Carrier: {selectedPO.company_ship_via.ship_company_name}</div>
                          )}
                          {selectedPO.company_ship_via?.ship_model && (
                            <div>Service: {selectedPO.company_ship_via.ship_model}</div>
                          )}
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
            <CardTitle>Invoice Details</CardTitle>
            <CardDescription>Basic information for the invoice</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="my_company_id">
                  My Company
                  {selectedPO && form.watch('my_company_id') === selectedPO.company_id && (
                    <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Inherited from PO</span>
                  )}
                </Label>
                <Select
                  value={form.watch('my_company_id')}
                  onValueChange={(value) => {
                    setValue('my_company_id', value)
                    const company = myCompanies.find(c => c.my_company_id === value)
                    if (company) {
                      setValue('payment_terms', company.default_payment_terms || 'NET30')
                    }
                  }}
                  disabled={selectedPO ? form.watch('my_company_id') === selectedPO.company_id : false}
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
                <Label htmlFor="payment_terms">
                  Payment Terms
                  {selectedPO && selectedPO.payment_term && form.watch('payment_terms') === selectedPO.payment_term && (
                    <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Inherited from PO</span>
                  )}
                </Label>
                <Select
                  value={form.watch('payment_terms')}
                  onValueChange={value => setValue('payment_terms', value)}
                  disabled={selectedPO && selectedPO.payment_term ? form.watch('payment_terms') === selectedPO.payment_term : false}
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
                  onValueChange={value => setValue('currency', value)}
                  disabled={selectedPO ? form.watch('currency') === selectedPO.currency : false}
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

        {/* Document References */}
        <Card>
          <CardHeader>
            <CardTitle>Document References</CardTitle>
            <CardDescription>Reference numbers and contract information (optional)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reference_number">Reference Number</Label>
                <Input
                  id="reference_number"
                  {...form.register('reference_number')}
                  placeholder="e.g., REF-2024-001"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Internal reference number for tracking
                </div>
              </div>

              <div>
                <Label htmlFor="contract_number">Contract Number</Label>
                <Input
                  id="contract_number"
                  {...form.register('contract_number')}
                  placeholder="e.g., CTR-2024-001"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Associated contract or agreement number
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export Documentation */}
        <Card>
          <CardHeader>
            <CardTitle>Export Documentation</CardTitle>
            <CardDescription>Country information for export compliance (optional)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="country_of_origin">
                  Country of Origin
                  {selectedPO && form.watch('country_of_origin') === selectedPO.origin_country_code && (
                    <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                      Inherited from PO
                    </span>
                  )}
                </Label>
                <Input
                  id="country_of_origin"
                  {...form.register('country_of_origin')}
                  placeholder="e.g., United States, Turkey"
                  disabled={selectedPO ? form.watch('country_of_origin') === selectedPO.origin_country_code : false}
                />
                <div className="text-xs text-gray-500 mt-1">
                  Country where the parts were manufactured
                </div>
              </div>

              <div>
                <Label htmlFor="end_use_country">
                  End Use Country
                  {selectedPO && form.watch('end_use_country') === selectedPO.end_use_country_code && (
                    <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                      Inherited from PO
                    </span>
                  )}
                </Label>
                <Input
                  id="end_use_country"
                  {...form.register('end_use_country')}
                  placeholder="e.g., Germany, France"
                  disabled={selectedPO ? form.watch('end_use_country') === selectedPO.end_use_country_code : false}
                />
                <div className="text-xs text-gray-500 mt-1">
                  Final destination country for export control
                </div>
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
                <CardDescription>Add inventory items to this invoice</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => append({
                  inventory_id: '',
                  unit_price: 0,
                  quantity: 1,
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            {inventoryItems
                              .filter(item => item.status === 'Available')
                              .map((item) => (
                              <SelectItem key={item.inventory_id} value={item.inventory_id}>
                                <div className="flex flex-col">
                                  <div className="font-mono">{item.pn_master_table.pn}</div>
                                  <div className="text-sm text-slate-600">
                                    {item.pn_master_table.description} | SN: {item.serial_number || 'N/A'} | Condition: {item.condition || 'N/A'}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    Location: {item.location || 'N/A'} | Status: {item.status}
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          step="1"
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

                    {selectedInventory && (
                      <div className="mt-4 p-3 bg-slate-50 rounded-md">
                        <div className="text-sm space-y-1">
                          <div><strong>Part:</strong> {selectedInventory.pn_master_table.pn}</div>
                          <div><strong>Description:</strong> {selectedInventory.pn_master_table.description || 'N/A'}</div>
                          <div><strong>Serial Number:</strong> {selectedInventory.serial_number || 'N/A'}</div>
                          <div><strong>Condition:</strong> {selectedInventory.condition || 'N/A'}</div>
                          <div><strong>Quantity:</strong> {selectedInventory.quantity}</div>
                          <div><strong>Location:</strong> {selectedInventory.location || 'N/A'}</div>
                          {selectedInventory.application_code && (
                            <div><strong>Application Code:</strong> {selectedInventory.application_code}</div>
                          )}
                          {selectedInventory.dimensions && (
                            <div><strong>Dimensions:</strong> {selectedInventory.dimensions}</div>
                          )}
                          {selectedInventory.weight && (
                            <div><strong>Weight:</strong> {selectedInventory.weight} lbs</div>
                          )}
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
                            ${(form.watch(`items.${index}.quantity`) || 1) * (form.watch(`items.${index}.unit_price`) || 0)}
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
              <Label htmlFor="remarks">
                Remarks
                {selectedPO && (() => {
                  const joined = [selectedPO.remarks_1, selectedPO.remarks_2, selectedPO.aviation_compliance_notes].filter(Boolean).join(' | ')
                  return joined && form.watch('remarks') === joined
                })() && (
                  <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Inherited from PO</span>
                )}
              </Label>
              <Textarea
                id="remarks"
                {...form.register('remarks')}
                rows={3}
                placeholder="Additional notes or remarks"
disabled={Boolean(selectedPO && (() => {
                  const joined = [selectedPO.remarks_1, selectedPO.remarks_2, selectedPO.aviation_compliance_notes].filter(Boolean).join(' | ')
                  return !!joined && form.watch('remarks') === joined
                })())}
              />
            </div>
          </CardContent>
        </Card>

        {/* Shipping Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-md">📦</span>
              Shipping Information
            </CardTitle>
            <CardDescription>Logistics and shipping details for this invoice</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* AWB and Carrier Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-slate-900">Shipping Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="awb_number">
                    AWB Number
                    {selectedPO && selectedPO.awb_no && form.watch('awb_number') === selectedPO.awb_no && (
                      <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Inherited from PO</span>
                    )}
                  </Label>
                  <div className="relative">
                    <Input
                      id="awb_number"
                      {...form.register('awb_number')}
                      placeholder="e.g., 020-12345678"
                      className={getFieldValidationStyle(
                        awbValidation.isValid,
                        false,
                        !!form.watch('awb_number')
                      )}
                      disabled={selectedPO && selectedPO.awb_no ? form.watch('awb_number') === selectedPO.awb_no : false}
                    />
                    {awbValidation.isValidating && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      </div>
                    )}
                  </div>
                  {awbValidation.message && (
                    <div className={`text-xs mt-1 ${
                      awbValidation.isValid === false ? 'text-red-600' : 
                      awbValidation.isValid === true ? 'text-green-600' : 
                      'text-gray-500'
                    }`}>
                      {awbValidation.message}
                    </div>
                  )}
                  {awbValidation.suggestions && awbValidation.suggestions.length > 0 && (
                    <div className="text-xs text-blue-600 mt-1">
                      Suggestion: {awbValidation.suggestions[0]}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    Air Waybill number for tracking
                  </div>
                </div>

                <div>
                  <Label htmlFor="shipping_carrier">
                    Shipping Carrier
                    {selectedPO && selectedPO.company_ship_via?.ship_company_name && form.watch('shipping_carrier') === selectedPO.company_ship_via.ship_company_name && (
                      <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Inherited from PO</span>
                    )}
                  </Label>
                  <Select
                    value={form.watch('shipping_carrier')}
                    onValueChange={(value) => setValue('shipping_carrier', value)}
                    disabled={selectedPO && selectedPO.company_ship_via?.ship_company_name ? form.watch('shipping_carrier') === selectedPO.company_ship_via.ship_company_name : false}
                  >
                    <SelectTrigger id="shipping_carrier">
                      <SelectValue placeholder="Select carrier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FEDEX">FedEx</SelectItem>
                      <SelectItem value="DHL">DHL</SelectItem>
                      <SelectItem value="UPS">UPS</SelectItem>
                      <SelectItem value="USPS">USPS</SelectItem>
                      <SelectItem value="TURKISH_AIRLINES">Turkish Airlines</SelectItem>
                      <SelectItem value="LUFTHANSA">Lufthansa</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="tracking_number">Tracking Number</Label>
                  <Input
                    id="tracking_number"
                    {...form.register('tracking_number')}
                    placeholder="e.g., 1Z999AA1234567890"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Free text tracking number
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Method and Service */}
            <div className="space-y-4">
              <h4 className="font-medium text-slate-900">Service Options</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="shipping_method">Shipping Method</Label>
                  <Select
                    value={form.watch('shipping_method')}
                    onValueChange={(value) => setValue('shipping_method', value)}
                  >
                    <SelectTrigger id="shipping_method">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AIR">Air Freight</SelectItem>
                      <SelectItem value="SEA">Sea Freight</SelectItem>
                      <SelectItem value="GROUND">Ground</SelectItem>
                      <SelectItem value="EXPRESS">Express</SelectItem>
                      <SelectItem value="COURIER">Courier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="shipping_service_type">
                    Service Type
                    {selectedPO && selectedPO.company_ship_via?.ship_model && form.watch('shipping_service_type') === selectedPO.company_ship_via.ship_model && (
                      <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Inherited from PO</span>
                    )}
                  </Label>
                  <Select
                    value={form.watch('shipping_service_type')}
                    onValueChange={(value) => setValue('shipping_service_type', value)}
                    disabled={selectedPO && selectedPO.company_ship_via?.ship_model ? form.watch('shipping_service_type') === selectedPO.company_ship_via.ship_model : false}
                  >
                    <SelectTrigger id="shipping_service_type">
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STANDARD">Standard</SelectItem>
                      <SelectItem value="EXPRESS">Express</SelectItem>
                      <SelectItem value="OVERNIGHT">Overnight</SelectItem>
                      <SelectItem value="2_DAY">2-Day</SelectItem>
                      <SelectItem value="ECONOMY">Economy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Package Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-slate-900">Package Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dimensions">Dimensions</Label>
                  <Input
                    id="dimensions"
                    {...form.register('dimensions')}
                    placeholder='e.g., "1 EA BOX 12x8x6 inches"'
                    className={getFieldValidationStyle(
                      dimensionsValidation.isValid,
                      false,
                      !!form.watch('dimensions')
                    )}
                  />
                  {dimensionsValidation.message && (
                    <div className={`text-xs mt-1 ${
                      dimensionsValidation.isValid === false ? 'text-red-600' : 
                      dimensionsValidation.isValid === true ? 'text-green-600' : 
                      'text-gray-500'
                    }`}>
                      {dimensionsValidation.message}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    Package dimensions per product line
                  </div>
                </div>

                <div>
                  <Label htmlFor="weight">Weight (lbs)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.01"
                    min="0"
                    {...form.register('weight', { valueAsNumber: true })}
                    placeholder="0.00"
                    className={getFieldValidationStyle(
                      weightValidation.isValid,
                      false,
                      !!(form.watch('weight') || form.watch('gross_weight_kgs'))
                    )}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Package weight in pounds
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gross_weight_kgs">Gross Weight (Kgs)</Label>
                  <Input
                    id="gross_weight_kgs"
                    type="number"
                    step="0.01"
                    min="0"
                    {...form.register('gross_weight_kgs', { valueAsNumber: true })}
                    placeholder="0.00"
                    className={getFieldValidationStyle(
                      weightValidation.isValid,
                      false,
                      !!(form.watch('weight') || form.watch('gross_weight_kgs'))
                    )}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Total weight in kilograms
                  </div>
                </div>

                <div>
                  <Label htmlFor="shipping_cost">Shipping Cost ($)</Label>
                  <Input
                    id="shipping_cost"
                    type="number"
                    step="0.01"
                    min="0"
                    {...form.register('shipping_cost', { valueAsNumber: true })}
                    placeholder="0.00"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Actual shipping charges
                  </div>
                </div>
              </div>
              
              {/* Weight validation feedback */}
              {weightValidation.message && (
                <div className={`text-xs mt-2 p-2 rounded ${
                  weightValidation.isValid === false ? 'bg-red-50 text-red-700 border border-red-200' : 
                  weightValidation.isValid === true ? 'bg-green-50 text-green-700 border border-green-200' : 
                  'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  {weightValidation.message}
                  {weightValidation.suggestedConversion && (
                    <div className="mt-1 font-semibold">
                      💡 {weightValidation.suggestedConversion}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Shipping Notes */}
            <div>
              <Label htmlFor="shipping_notes">Shipping Notes</Label>
              <Textarea
                id="shipping_notes"
                {...form.register('shipping_notes')}
                rows={3}
                placeholder="Additional shipping instructions, special handling requirements, etc..."
              />
              <div className="text-xs text-gray-500 mt-1">
                Special instructions for shipping and handling
              </div>
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-4">
              <div>
                <Label htmlFor="freight_charge">
                  Freight Charge ($)
                  {selectedPO && typeof selectedPO.freight_charge === 'number' && (form.watch('freight_charge') || 0) === (selectedPO.freight_charge || 0) && (
                    <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Inherited from PO</span>
                  )}
                </Label>
                <Input
                  id="freight_charge"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register('freight_charge', { valueAsNumber: true })}
                  placeholder="0.00"
                  disabled={selectedPO && typeof selectedPO.freight_charge === 'number' ? (form.watch('freight_charge') || 0) === (selectedPO.freight_charge || 0) : false}
                />
                <div className="text-xs text-gray-500 mt-1">
                  Shipping and freight costs
                </div>
              </div>

              <div>
                <Label htmlFor="misc_charge">
                  Misc Charge ($)
                  {selectedPO && typeof selectedPO.misc_charge === 'number' && (form.watch('misc_charge') || 0) === (selectedPO.misc_charge || 0) && (
                    <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Inherited from PO</span>
                  )}
                </Label>
                <Input
                  id="misc_charge"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register('misc_charge', { valueAsNumber: true })}
                  placeholder="0.00"
                  disabled={selectedPO && typeof selectedPO.misc_charge === 'number' ? (form.watch('misc_charge') || 0) === (selectedPO.misc_charge || 0) : false}
                />
                <div className="text-xs text-gray-500 mt-1">
                  Additional miscellaneous charges
                </div>
              </div>

              <div>
                <Label htmlFor="vat_percentage">
                  VAT (%)
                  {selectedPO && typeof selectedPO.vat_percentage === 'number' && (form.watch('vat_percentage') || 0) === (selectedPO.vat_percentage || 0) && (
                    <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Inherited from PO</span>
                  )}
                </Label>
                <Input
                  id="vat_percentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  {...form.register('vat_percentage', { valueAsNumber: true })}
                  placeholder="0.00"
                  disabled={selectedPO && typeof selectedPO.vat_percentage === 'number' ? (form.watch('vat_percentage') || 0) === (selectedPO.vat_percentage || 0) : false}
                />
                <div className="text-xs text-gray-500 mt-1">
                  Value Added Tax percentage
                </div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-2">
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
          <Button 
            type="submit" 
            disabled={createSalesOrderMutation.isPending || form.formState.isSubmitting} 
            className="w-full sm:w-auto"
          >
            {createSalesOrderMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            )}
            {createSalesOrderMutation.isPending ? 'Creating...' : 'Create Invoice'}
          </Button>
        </div>
      </form>
    </div>
  )
}
