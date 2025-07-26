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
import POCompletionModal from '@/components/purchase-orders/POCompletionModal'
import { useAuth } from '@/components/auth/AuthProvider'
import { usePurchaseOrdersContext } from '@/hooks/usePurchaseOrdersContext'

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

const poItemSchema = z.object({
  po_item_id: z.string().optional(),
  pn_id: z.string().min(1, 'Part number is required'),
  description: z.string().min(1, 'Description is required'),
  sn: z.string().optional(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unit_price: z.number().min(0, 'Unit price must be positive'),
  condition: z.string().optional(),
  traceability_source: z.string().optional(),
  traceable_to: z.string().optional(),
  last_certified_agency: z.string().optional(),
})

const purchaseOrderSchema = z.object({
  my_company_id: z.string().min(1, 'My company is required'),
  vendor_company_id: z.string().min(1, 'Vendor is required'),
  po_date: z.date(),
  ship_to_company_id: z.string().optional(),
  ship_to_company_type: z.enum(['my_company', 'external_company']).optional(),
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
  initialPurchaseOrder: any
  initialItems: any[]
  myCompanies: MyCompany[]
  externalCompanies: ExternalCompany[]
  partNumbers: PartNumber[]
  shipViaList: ShipVia[]
}

export default function PurchaseOrderEditClientPage({ 
  poId, 
  initialPurchaseOrder, 
  initialItems, 
  myCompanies, 
  externalCompanies, 
  partNumbers, 
  shipViaList 
}: PurchaseOrderEditClientPageProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { updatePurchaseOrder: updatePOInContext } = usePurchaseOrdersContext()
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<string>('')
  const [currentPoNumber, setCurrentPoNumber] = useState<string>(initialPurchaseOrder?.po_number || '')
  const [isCompleting, setIsCompleting] = useState(false)

  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderSchema),
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
      status: 'Draft',
      items: [],
    }
  })

  // Initialize form with pre-fetched data
  useEffect(() => {
    // Form initialization started
    
    if (initialPurchaseOrder) {
      const formattedItems = (initialItems || []).map(item => {
        // Processing item
        return {
          po_item_id: item.po_item_id,
          pn_id: item.pn_id || item.pn_master_table?.pn_id || '',
          description: item.description || item.pn_master_table?.description || '',
          sn: item.sn || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          condition: item.condition || '',
          traceability_source: item.traceability_source || '',
          traceable_to: item.traceable_to || '',
          last_certified_agency: item.last_certified_agency || '',
        }
      })
      
      // Items formatted successfully
      
      // Ensure at least one item exists for the form
      const itemsToSet = formattedItems.length > 0 ? formattedItems : [{
        pn_id: '',
        description: '',
        sn: '',
        quantity: 1,
        unit_price: 0,
        condition: '',
        traceability_source: '',
        traceable_to: '',
        last_certified_agency: '',
      }]
      
      // Resetting form with initial data
      
      // Reset the entire form with all data to ensure useFieldArray updates properly
      form.reset({
        my_company_id: initialPurchaseOrder.my_company_id,
        vendor_company_id: initialPurchaseOrder.vendor_company_id,
        po_date: new Date(initialPurchaseOrder.po_date),
        ship_to_company_id: '',
        ship_to_company_type: undefined,
        prepared_by_name: initialPurchaseOrder.prepared_by_name || 'System User',
        currency: initialPurchaseOrder.currency,
        ship_via_id: initialPurchaseOrder.ship_via_id || '',
        payment_term: initialPurchaseOrder.payment_term || '',
        remarks_1: initialPurchaseOrder.remarks_1 || '',
        freight_charge: initialPurchaseOrder.freight_charge || 0,
        misc_charge: initialPurchaseOrder.misc_charge || 0,
        vat_percentage: initialPurchaseOrder.vat_percentage || 0,
        status: initialPurchaseOrder.status,
        items: itemsToSet,
      })
      
      setCurrentPoNumber(initialPurchaseOrder.po_number)
      // Form reset complete
    } else {
      // No initial data available
    }
  }, [initialPurchaseOrder, initialItems, form])

  // Auto-populate prepared by with current user if editing and field is empty
  useEffect(() => {
    const fetchUserName = async () => {
      if (user && !form.getValues('prepared_by_name')) {
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
  }, [user, form])

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

  const handleStatusChange = (newStatus: string) => {
    const currentStatus = form.watch('status')
    
    // If changing to Completed, show confirmation modal
    if (newStatus === 'Completed' && currentStatus !== 'Completed') {
      setPendingStatus(newStatus)
      setShowCompletionModal(true)
    } else {
      form.setValue('status', newStatus)
    }
  }

  const handlePOCompletion = async () => {
    try {
      setIsCompleting(true)
      
      // First update the status to completed
      form.setValue('status', 'Completed')
      
      // Save the form to update the PO status
      const formData = form.getValues()
      console.log('Updating PO status to Completed for:', poId)
      await updatePurchaseOrder(formData)
      
      // Call the Edge Function to create inventory items
      console.log('Calling po-completion-handler Edge Function for PO:', poId)
      const { data: result, error: edgeFunctionError } = await supabase.functions.invoke('po-completion-handler', {
        body: {
          po_id: poId,
          action: 'complete_po'
        }
      })
      
      console.log('Edge Function response:', { result, edgeFunctionError })
      
      if (edgeFunctionError) {
        console.error('Edge Function error:', edgeFunctionError)
        
        // Create detailed error message
        let errorMessage = 'Failed to call Edge Function'
        let errorDetails = null
        
        if (edgeFunctionError.message) {
          errorMessage = edgeFunctionError.message
        }
        
        // Check if it's a network or authentication error
        if (edgeFunctionError.status === 401) {
          errorMessage = 'Authentication failed. Please log in again.'
        } else if (edgeFunctionError.status === 403) {
          errorMessage = 'Permission denied. You do not have access to complete this operation.'
        } else if (edgeFunctionError.status >= 500) {
          errorMessage = 'Server error occurred. Please try again later.'
          errorDetails = `Status: ${edgeFunctionError.status}`
        }
        
        const finalError = new Error(JSON.stringify({
          error: errorMessage,
          details: errorDetails,
          code: edgeFunctionError.status,
          originalError: edgeFunctionError
        }))
        
        throw finalError
      }
      
      if (!result?.success) {
        console.error('Edge Function returned failure:', result)
        
        // Handle specific error cases
        if (result?.code === 'INVENTORY_CREATION_FAILED' && result?.error && result.error.includes('already exist')) {
          toast.success('Purchase order completed successfully! Inventory items already exist for this order.')
        } else {
          // Create detailed error for modal display
          let errorMessage = result?.error || 'Failed to create inventory items'
          let errorDetails = null
          
          if (result?.code) {
            errorDetails = `Error code: ${result.code}`
            if (result?.details) {
              errorDetails += ` - ${result.details}`
            }
          }
          
          const finalError = new Error(JSON.stringify({
            error: errorMessage,
            details: errorDetails,
            code: result?.code,
            created_count: result?.created_count
          }))
          
          throw finalError
        }
      } else {
        console.log(`Successfully completed PO and created ${result.created_count} inventory items`)
        const successMessage = result.po_number 
          ? `Purchase order ${result.po_number} completed successfully! ${result.created_count} inventory items created.`
          : `Purchase order completed successfully! ${result.created_count} inventory items created.`
        
        toast.success(successMessage)
      }
      
      // Close modal and navigate back
      setShowCompletionModal(false)
      router.push(`/portal/purchase-orders/${poId}`)
    } catch (error: unknown) {
      console.error('Error in handlePOCompletion:', error)
      
      let errorMessage = 'Failed to complete purchase order'
      let errorDetails = null
      
      if (error instanceof Error) {
        // Try to parse structured error message
        try {
          const errorData = JSON.parse(error.message)
          errorMessage = errorData.error || errorMessage
          errorDetails = errorData.details
        } catch {
          // Use raw error message if not JSON
          errorMessage = error.message
        }
      }
      
      // Show user-friendly error message
      toast.error(`Completion failed: ${errorMessage}`)
      if (errorDetails) {
        console.error('Additional error details:', errorDetails)
      }
      
      throw error
    } finally {
      setIsCompleting(false)
    }
  }

  const updatePurchaseOrder = async (data: PurchaseOrderFormValues) => {
    try {
      // Starting purchase order update
      const subtotal = calculateSubtotal()
      const total = calculateTotal()
      // Totals calculated

    // Get ship-to company information if selected
    let shipToData = {}
    // Processing ship-to selection
    
    if (data.ship_to_company_id && data.ship_to_company_type) {
      const shipToCompany = data.ship_to_company_type === 'my_company' 
        ? myCompanies.find(c => c.my_company_id === data.ship_to_company_id)
        : externalCompanies.find(c => c.company_id === data.ship_to_company_id)
      
      // Ship-to company found
      
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
        // Ship-to data prepared
      }
    } else {
      // IMPORTANT: Don't clear existing ship-to fields if no new selection is made
      // This preserves existing ship-to information in the database
      // Preserving existing ship-to data
      // shipToData remains empty, so existing ship-to fields won't be updated
    }

    // Update the purchase order
    // Updating purchase order in database
    const { error: poUpdateError } = await supabase
      .from('purchase_orders')
      .update({
        my_company_id: data.my_company_id,
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
        status: data.status,
        subtotal,
        total_amount: total,
      })
      .eq('po_id', poId)

    if (poUpdateError) {
      // Purchase order update failed
      throw new Error(`Failed to update purchase order: ${poUpdateError.message}`)
    }
    // Purchase order updated successfully

    // Delete existing line items
    // Deleting existing line items
    const { error: deleteError } = await supabase
      .from('po_items')
      .delete()
      .eq('po_id', poId)
      .select()

    if (deleteError) {
      // Failed to delete existing items
      throw new Error(`Failed to delete existing line items: ${deleteError.message}`)
    }
    // Existing items deleted successfully

    // Create new line items
    const lineItems = data.items.map((item, index) => ({
      po_id: poId,
      line_number: index + 1,
      pn_id: item.pn_id,
      description: item.description,
      sn: item.sn || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      condition: item.condition || null,
      traceability_source: item.traceability_source || null,
      traceable_to: item.traceable_to || null,
      last_certified_agency: item.last_certified_agency || null,
    }))


    // Inserting new line items
    
    const { error: itemsError } = await supabase
      .from('po_items')
      .insert(lineItems)
      .select()

    if (itemsError) {
      // Failed to insert new items
      throw new Error(`Failed to insert new line items: ${itemsError.message}`)
    }
    // Items inserted successfully

    // Update the global context with the updated PO
    const updatedPOForList = {
      po_id: poId,
      po_number: currentPoNumber,
      po_date: dateFns.format(data.po_date, 'yyyy-MM-dd'),
      status: data.status,
      total_amount: calculateTotal(),
      my_companies: myCompanies.find(c => c.my_company_id === data.my_company_id) ? {
        my_company_name: myCompanies.find(c => c.my_company_id === data.my_company_id)!.my_company_name,
        my_company_code: myCompanies.find(c => c.my_company_id === data.my_company_id)!.my_company_code
      } : null,
      companies: externalCompanies.find(c => c.company_id === data.vendor_company_id) ? {
        company_name: externalCompanies.find(c => c.company_id === data.vendor_company_id)!.company_name,
        company_code: externalCompanies.find(c => c.company_id === data.vendor_company_id)!.company_code || ''
      } : null,
      created_at: initialPurchaseOrder?.created_at || new Date().toISOString()
    }
    
    updatePOInContext(updatedPOForList)
  } catch (error) {
    // Update purchase order failed
    throw error
  }

  }

  const onSubmit = async (data: PurchaseOrderFormValues) => {
    try {
      // Form submission started
      
      if (Object.keys(form.formState.errors).length > 0) {
        // Form has validation errors
        toast.error('Please fix form validation errors before submitting')
        return
      }
      
      // Form validation passed, starting update
      
      // Add timeout wrapper to prevent infinite hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Update operation timed out after 30 seconds')), 30000)
      })
      
      await Promise.race([
        updatePurchaseOrder(data),
        timeoutPromise
      ])
      
      // Update completed successfully
      toast.success('Purchase order updated successfully')
      
      // Show success message with options
      const viewUpdated = confirm(
        `Purchase order updated successfully!\n\nWould you like to view the updated purchase order?`
      )
      
      if (viewUpdated) {
        router.push(`/portal/purchase-orders/${poId}`)
      } else {
        router.push('/portal/purchase-orders')
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
      // Form submission failed
      toast.error(`Update failed: ${errorMessage}`)
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
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.watch('status')}
                  onValueChange={handleStatusChange}
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

            {/* Current Ship To Information Display */}
            {initialPurchaseOrder && (initialPurchaseOrder.ship_to_company_name || initialPurchaseOrder.ship_to_address_details) && !selectedShipToCompany && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Current Ship To Information</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  {initialPurchaseOrder.ship_to_company_name && (
                    <div className="font-medium">{initialPurchaseOrder.ship_to_company_name}</div>
                  )}
                  {initialPurchaseOrder.ship_to_address_details && (
                    <div className="whitespace-pre-line">{initialPurchaseOrder.ship_to_address_details}</div>
                  )}
                  {initialPurchaseOrder.ship_to_contact_name && (
                    <div>Contact: {initialPurchaseOrder.ship_to_contact_name}</div>
                  )}
                  {initialPurchaseOrder.ship_to_contact_phone && (
                    <div>Phone: {initialPurchaseOrder.ship_to_contact_phone}</div>
                  )}
                  {initialPurchaseOrder.ship_to_contact_email && (
                    <div>Email: {initialPurchaseOrder.ship_to_contact_email}</div>
                  )}
                </div>
                <div className="text-xs text-blue-600 mt-2">
                  💡 Select a company above to change the ship-to destination
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
                  <SelectTrigger id="ship_via_id" className={form.formState.errors.ship_via_id ? 'border-red-500' : ''}>
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
                <Label htmlFor="payment_term">Payment Term</Label>
                <Select
                  value={form.watch('payment_term')}
                  onValueChange={(value) => form.setValue('payment_term', value)}
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
                  onValueChange={(value) => form.setValue('currency', value)}
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
                  traceability_source: '',
                  traceable_to: '',
                  last_certified_agency: '',
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
                          form.setValue(`items.${index}.pn_id`, value)
                          const selectedPart = partNumbers.find(pn => pn.pn_id === value)
                          if (selectedPart && selectedPart.description) {
                            form.setValue(`items.${index}.description`, selectedPart.description)
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
                        onValueChange={(value) => form.setValue(`items.${index}.condition`, value)}
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

                  {/* Traceability Fields */}
                  <div className="mt-4">
                    <h5 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                      <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-md">ATA 106</span>
                      Traceability Information
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor={`items.${index}.traceability_source`}>Traceability Source</Label>
                        <Input
                          id={`items.${index}.traceability_source`}
                          {...form.register(`items.${index}.traceability_source`)}
                          placeholder="e.g., Manufacturer Certificate"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          Source of traceability documentation
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

                      <div>
                        <Label htmlFor={`items.${index}.last_certified_agency`}>Last Certified Agency</Label>
                        <Input
                          id={`items.${index}.last_certified_agency`}
                          {...form.register(`items.${index}.last_certified_agency`)}
                          placeholder="e.g., FAA, EASA"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          Certification authority
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
          <Button 
            type="submit" 
            disabled={form.formState.isSubmitting} 
            className="w-full sm:w-auto"
          >
            {form.formState.isSubmitting ? 'Updating...' : 'Update Purchase Order'}
          </Button>
        </div>
      </form>

      <POCompletionModal
        isOpen={showCompletionModal}
        onClose={() => {
          setShowCompletionModal(false)
          setPendingStatus('')
        }}
        onConfirm={handlePOCompletion}
        poId={poId}
        poNumber={currentPoNumber}
        currentStatus={form.watch('status')}
        isCompleting={isCompleting}
      />
    </div>
  )
}