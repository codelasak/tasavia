'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
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
import { fetchCountries } from '@/lib/external-apis'
import FileUpload from '@/components/ui/file-upload'

// Simplified interfaces to match database structure directly
interface Company {
  company_id: string
  company_name: string
  company_code: string | null
  is_self: boolean | null
  company_type: string | null
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
}

interface PurchaseOrderEditData {
  purchaseOrder: any // Full PO data from database
  items: any[] // PO items with part number references
  myCompanies: Company[]
  externalCompanies: Company[]
  partNumbers: PartNumber[]
  shipViaList: ShipVia[]
}

const CURRENCY_OPTIONS = ['USD', 'EURO', 'TL', 'GBP'];
const PAYMENT_TERM_OPTIONS = ['PRE-PAY', 'COD', 'NET5', 'NET10', 'NET15', 'NET30'];

const poItemSchema = z.object({
  po_item_id: z.string().optional(),
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
})

const purchaseOrderSchema = z.object({
  company_id: z.string().min(1, 'My company is required'),
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
  status: z.string(),
  items: z.array(poItemSchema).min(1, 'At least one item is required'),
})

type PurchaseOrderFormValues = z.infer<typeof purchaseOrderSchema>

interface PurchaseOrderEditClientPageProps {
  poId: string
  initialData: PurchaseOrderEditData
}

export default function PurchaseOrderEditClientPage({ 
  poId, 
  initialData
}: PurchaseOrderEditClientPageProps) {
  const { purchaseOrder, items, myCompanies, externalCompanies, partNumbers, shipViaList } = initialData
  const router = useRouter()
  const { user } = useAuth()
  const { updatePurchaseOrder: updatePOInContext } = usePurchaseOrdersContext()
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<string>('')
  const [currentPoNumber, setCurrentPoNumber] = useState<string>(purchaseOrder?.po_number || '')
  const [isCompleting, setIsCompleting] = useState(false)
  
  // Loading states for different data types
  const [isInitializingForm, setIsInitializingForm] = useState(true)
  const [formInitError, setFormInitError] = useState<string | null>(null)
  const [isFormStable, setIsFormStable] = useState(false) // Guard against Select clearing during initialization
  const [dataValidationResults, setDataValidationResults] = useState({
    myCompanies: { isValid: false, count: 0 },
    externalCompanies: { isValid: false, count: 0 },
    partNumbers: { isValid: false, count: 0 },
    shipViaList: { isValid: false, count: 0 }
  })
  
  // State for external API data
  const [countries, setCountries] = useState<{ name: string; code: string; region: string }[]>([])
  const [loadingCountries, setLoadingCountries] = useState(false)

  // Enhanced helper functions for data validation and select values
  const safeSelectValue = (value: string | undefined | null): string => {
    if (value === null || value === undefined) return ''
    const trimmed = String(value).trim()
    return trimmed !== '' ? trimmed : ''
  }

  // Safe form setter that prevents clearing during initialization
  const safeFormSetValue = (fieldName: string, value: string | undefined, validOptions: any[]) => {
    console.log(`🔒 Safe form setValue called for ${fieldName}:`, { 
      value, 
      isFormStable, 
      hasValidOptions: validOptions.length > 0,
      optionExists: validOptions.some(opt => opt.company_id === value)
    })

    // Don't update if form is not stable yet (initialization phase)
    if (!isFormStable) {
      console.log(`⏳ Ignoring ${fieldName} update - form not stable yet`)
      return
    }

    // Don't update if value is empty/undefined
    if (!value || value.trim() === '') {
      console.log(`❌ Ignoring ${fieldName} update - empty value`)
      return
    }

    // Don't update if value doesn't exist in valid options
    if (validOptions.length > 0 && !validOptions.some(opt => opt.company_id === value)) {
      console.log(`❌ Ignoring ${fieldName} update - value not found in options`)
      return
    }

    console.log(`✅ Setting ${fieldName} to:`, value)
    form.setValue(fieldName as any, value)
  }

  // Data validation function
  const validateInitialData = useCallback(() => {
    const validation = {
      myCompanies: { isValid: false, count: 0 },
      externalCompanies: { isValid: false, count: 0 },
      partNumbers: { isValid: false, count: 0 },
      shipViaList: { isValid: false, count: 0 }
    }

    // Validate myCompanies
    const validMyCompanies = myCompanies?.filter(c => 
      c && 
      typeof c === 'object' && 
      c.company_id && 
      typeof c.company_id === 'string' && 
      c.company_id.trim() !== '' &&
      c.company_name &&
      typeof c.company_name === 'string' &&
      c.company_name.trim() !== ''
    ) || []
    validation.myCompanies = { isValid: validMyCompanies.length > 0, count: validMyCompanies.length }

    // Validate externalCompanies  
    const validExternalCompanies = externalCompanies?.filter(c =>
      c && 
      typeof c === 'object' && 
      c.company_id && 
      typeof c.company_id === 'string' && 
      c.company_id.trim() !== '' &&
      c.company_name &&
      typeof c.company_name === 'string' &&
      c.company_name.trim() !== ''
    ) || []
    validation.externalCompanies = { isValid: validExternalCompanies.length > 0, count: validExternalCompanies.length }

    // Validate partNumbers
    const validPartNumbers = partNumbers?.filter(pn =>
      pn && 
      typeof pn === 'object' && 
      pn.pn_id && 
      typeof pn.pn_id === 'string' && 
      pn.pn_id.trim() !== '' &&
      pn.pn &&
      typeof pn.pn === 'string' &&
      pn.pn.trim() !== ''
    ) || []
    validation.partNumbers = { isValid: validPartNumbers.length > 0, count: validPartNumbers.length }

    // Validate shipViaList
    const validShipViaList = shipViaList?.filter(sv =>
      sv && 
      typeof sv === 'object' && 
      sv.ship_via_id && 
      typeof sv.ship_via_id === 'string' && 
      sv.ship_via_id.trim() !== '' &&
      sv.ship_company_name &&
      typeof sv.ship_company_name === 'string' &&
      sv.ship_company_name.trim() !== ''
    ) || []
    validation.shipViaList = { isValid: validShipViaList.length > 0, count: validShipViaList.length }

    return validation
  }, [myCompanies, externalCompanies, partNumbers, shipViaList])

  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      company_id: '',
      vendor_company_id: '',
      po_date: new Date(),
      ship_to_company_id: '',
      ship_to_company_type: 'my_company',
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

  // Effect 1: Validate initial data and set validation state
  useEffect(() => {
    console.log('🔍 Validating initial data...', {
      myCompaniesLength: myCompanies?.length || 0,
      externalCompaniesLength: externalCompanies?.length || 0,
      partNumbersLength: partNumbers?.length || 0,
      shipViaListLength: shipViaList?.length || 0
    })

    const validation = validateInitialData()
    setDataValidationResults(validation)

    // Log validation results for debugging
    console.log('📊 Data validation results:', validation)

    // Check if we have any critical validation failures
    if (!validation.myCompanies.isValid) {
      console.warn('⚠️ No valid internal companies found')
      setFormInitError('No internal companies available. Please configure your company first.')
      return
    }

    // Clear any previous errors if validation passes
    if (validation.myCompanies.isValid || validation.externalCompanies.isValid) {
      setFormInitError(null)
    }
  }, [myCompanies, externalCompanies, partNumbers, shipViaList, validateInitialData])

  // Helper function to format line items
  const formatLineItems = useCallback((itemsData: any[]) => {
    if (!itemsData || itemsData.length === 0) {
      return [{
        pn_id: '',
        description: '',
        sn: '',
        quantity: 1,
        unit_price: 0,
        condition: '',
        traceability_source: '',
        traceable_to: '',
        origin_country: '',
        origin_country_code: '',
        last_certified_agency: '',
        traceability_files_path: [],
      }]
    }

    return itemsData.map((item) => ({
      po_item_id: item.po_item_id,
      pn_id: item.pn_id || '',
      description: item.description || item.pn_master_table?.description || '',
      sn: item.sn || '',
      quantity: Number(item.quantity) || 1,
      unit_price: Number(item.unit_price) || 0,
      condition: item.condition || '',
      traceability_source: item.traceability_source || '',
      traceable_to: item.traceable_to || '',
      origin_country: item.origin_country || '',
      origin_country_code: item.origin_country_code || '',
      last_certified_agency: item.last_certified_agency || '',
      traceability_files_path: item.traceability_files_path 
        ? JSON.parse(item.traceability_files_path).map((file: any) => ({
            ...file,
            uploadedAt: new Date(file.uploadedAt)
          }))
        : [],
    }))
  }, [])

  // Helper function to resolve ship-to company
  const resolveShipToCompany = useCallback((po: any) => {
    let shipToCompanyId = ''
    let shipToCompanyType: 'my_company' | 'external_company' | undefined = undefined
    
    if (po.ship_to_company_name) {
      // Check internal companies first
      const matchingMyCompany = myCompanies.find(c => 
        c.company_name === po.ship_to_company_name
      )
      
      if (matchingMyCompany) {
        shipToCompanyId = matchingMyCompany.company_id
        shipToCompanyType = 'my_company'
      } else {
        // Check external companies
        const matchingExternalCompany = externalCompanies.find(c => 
          c.company_name === po.ship_to_company_name
        )
        
        if (matchingExternalCompany) {
          shipToCompanyId = matchingExternalCompany.company_id
          shipToCompanyType = 'external_company'
        }
      }
    }

    return { shipToCompanyId, shipToCompanyType }
  }, [myCompanies, externalCompanies])

  // Separate function for form initialization logic
  const initializeFormData = useCallback(() => {
    if (!purchaseOrder) return

    // Format line items with proper error handling
    const formattedItems = formatLineItems(items || [])

    // Handle ship-to company resolution
    const { shipToCompanyId, shipToCompanyType } = resolveShipToCompany(purchaseOrder)

    // Create form data object
    const formData: PurchaseOrderFormValues = {
      company_id: purchaseOrder.company_id || '',
      vendor_company_id: purchaseOrder.vendor_company_id || '',
      po_date: new Date(purchaseOrder.po_date),
      ship_to_company_id: shipToCompanyId || '',
      ship_to_company_type: shipToCompanyType || 'my_company',
      prepared_by_name: purchaseOrder.prepared_by_name || 'System User',
      currency: purchaseOrder.currency || 'USD',
      ship_via_id: safeSelectValue(purchaseOrder.ship_via_id) || '',
      payment_term: safeSelectValue(purchaseOrder.payment_term) || '',
      remarks_1: purchaseOrder.remarks_1 || '',
      freight_charge: Number(purchaseOrder.freight_charge) || 0,
      misc_charge: Number(purchaseOrder.misc_charge) || 0,
      vat_percentage: Number(purchaseOrder.vat_percentage) || 0,
      status: purchaseOrder.status || 'Draft',
      items: formattedItems,
    }

    // Reset form with new data
    form.reset(formData)
    setCurrentPoNumber(purchaseOrder.po_number || '')

    console.log('✅ Form initialized successfully with data:', {
      company_id: formData.company_id,
      vendor_company_id: formData.vendor_company_id,
      itemsCount: formData.items.length,
      ship_to_company_id: formData.ship_to_company_id,
      ship_to_company_type: formData.ship_to_company_type
    })

    // Force a re-render after form initialization to ensure Select components update
    setTimeout(() => {
      console.log('🔄 Form values after initialization:', {
        company_id: form.getValues('company_id'),
        vendor_company_id: form.getValues('vendor_company_id'),
        ship_to_company_id: form.getValues('ship_to_company_id')
      })
      
      // Mark form as stable after Select components have had time to render
      setTimeout(() => {
        console.log('🛡️ Form marked as stable - Select components can now safely update')
        setIsFormStable(true)
      }, 500) // Additional delay to ensure Select options are rendered
    }, 100)
  }, [purchaseOrder, items, form, formatLineItems, resolveShipToCompany])

  // Effect 2: Load external data (countries)
  useEffect(() => {
    const loadExternalData = async () => {
      console.log('🌍 Loading countries data...')
      setLoadingCountries(true)
      try {
        const countriesData = await fetchCountries()
        setCountries(countriesData)
        console.log('✅ Countries loaded:', countriesData?.length || 0)
      } catch (error) {
        console.error('❌ Failed to load countries:', error)
      } finally {
        setLoadingCountries(false)
      }
    }

    loadExternalData()
  }, [])

  // Effect 3: Initialize form once data validation passes
  useEffect(() => {
    if (!purchaseOrder) {
      console.log('⏳ Purchase order data not yet loaded')
      return
    }

    // Check if we have critical validation failures
    if (formInitError) {
      console.log('❌ Skipping form initialization due to validation error:', formInitError)
      return
    }

    // Wait for data validation to complete
    if (!dataValidationResults.myCompanies.isValid) {
      console.log('⏳ Waiting for valid company data before initializing form')
      return
    }

    console.log('🚀 Starting form initialization...', {
      poNumber: purchaseOrder.po_number,
      dataValidation: dataValidationResults
    })

    setIsInitializingForm(true)
    setIsFormStable(false) // Reset form stability on new initialization

    try {
      initializeFormData()
    } catch (error) {
      console.error('❌ Form initialization failed:', error)
      setFormInitError(error instanceof Error ? error.message : 'Form initialization failed')
    } finally {
      setIsInitializingForm(false)
    }
  }, [purchaseOrder, dataValidationResults, formInitError, initializeFormData])

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

  // Use validated data arrays with enhanced filtering - MUST come before useEffect that references them
  const validMyCompanies = useMemo(() => {
    return myCompanies?.filter(c => 
      c && 
      typeof c === 'object' && 
      c.company_id && 
      typeof c.company_id === 'string' && 
      c.company_id.trim() !== '' &&
      c.company_name &&
      typeof c.company_name === 'string' &&
      c.company_name.trim() !== ''
    ) || []
  }, [myCompanies])

  const validExternalCompanies = useMemo(() => {
    return externalCompanies?.filter(c =>
      c && 
      typeof c === 'object' && 
      c.company_id && 
      typeof c.company_id === 'string' && 
      c.company_id.trim() !== '' &&
      c.company_name &&
      typeof c.company_name === 'string' &&
      c.company_name.trim() !== ''
    ) || []
  }, [externalCompanies])

  const validPartNumbers = useMemo(() => {
    return partNumbers?.filter(pn =>
      pn && 
      typeof pn === 'object' && 
      pn.pn_id && 
      typeof pn.pn_id === 'string' && 
      pn.pn_id.trim() !== '' &&
      pn.pn &&
      typeof pn.pn === 'string' &&
      pn.pn.trim() !== ''
    ) || []
  }, [partNumbers])

  const validShipViaList = useMemo(() => {
    return shipViaList?.filter(sv =>
      sv && 
      typeof sv === 'object' && 
      sv.ship_via_id && 
      typeof sv.ship_via_id === 'string' && 
      sv.ship_via_id.trim() !== '' &&
      sv.ship_company_name &&
      typeof sv.ship_company_name === 'string' &&
      sv.ship_company_name.trim() !== ''
    ) || []
  }, [shipViaList])

  const validCountries = useMemo(() => {
    return countries?.filter(country => 
      country && 
      typeof country === 'object' && 
      country.code && 
      typeof country.code === 'string' && 
      country.code.trim() !== '' &&
      country.name &&
      typeof country.name === 'string' &&
      country.name.trim() !== ''
    ) || []
  }, [countries])

  // Watch form values for debugging and to ensure Select components re-render
  const watchedCompanyId = form.watch('company_id')
  const watchedVendorId = form.watch('vendor_company_id')
  const watchedShipToId = form.watch('ship_to_company_id')

  // Debug effect to log current form values
  useEffect(() => {
    console.log('🔍 Form values changed:', {
      company_id: watchedCompanyId,
      vendor_company_id: watchedVendorId,
      ship_to_company_id: watchedShipToId,
      myCompaniesCount: validMyCompanies.length,
      externalCompaniesCount: validExternalCompanies.length
    })
  }, [watchedCompanyId, watchedVendorId, watchedShipToId, validMyCompanies.length, validExternalCompanies.length])

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
      
      // Call the database function directly to create inventory items
      console.log('Calling create_inventory_from_po_completion database function for PO:', poId)
      const { data: result, error: edgeFunctionError } = await supabase.rpc('create_inventory_from_po_completion', {
        po_id_param: poId
      })
      
      console.log('Database function response:', { result, edgeFunctionError })
      
      // Extract the first result from the array (RPC functions return arrays)
      const dbResult = result?.[0]
      console.log('Parsed database result:', dbResult)
      
      if (edgeFunctionError) {
        console.error('Database function error:', edgeFunctionError)
        
        // Create detailed error message
        let errorMessage = 'Failed to call database function'
        let errorDetails = null
        
        if (edgeFunctionError.message) {
          errorMessage = edgeFunctionError.message
        }
        
        if (edgeFunctionError.code) {
          errorDetails = `Database error code: ${edgeFunctionError.code}`
        }
        
        const finalError = new Error(JSON.stringify({
          error: errorMessage,
          details: errorDetails,
          code: edgeFunctionError.code,
          originalError: edgeFunctionError
        }))
        
        throw finalError
      }
      
      if (!dbResult?.success) {
        console.error('Database function returned failure:', dbResult)
        
        // Handle specific error cases
        if (dbResult?.error_message && dbResult.error_message.includes('already exist')) {
          toast.success('Purchase order completed successfully! Inventory items already exist for this order.')
        } else {
          // Create detailed error for modal display
          let errorMessage = dbResult?.error_message || 'Failed to create inventory items'
          let errorDetails = null
          
          if (dbResult?.created_count !== undefined) {
            errorDetails = `Items created: ${dbResult.created_count}`
          }
          
          const finalError = new Error(JSON.stringify({
            error: errorMessage,
            details: errorDetails,
            created_count: dbResult?.created_count
          }))
          
          throw finalError
        }
      } else {
        console.log(`Successfully completed PO and created ${dbResult.created_count} inventory items`)
        const successMessage = `Purchase order completed successfully! ${dbResult.created_count} inventory items created.`
        
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
      const subtotal = calculateSubtotal()
      const total = calculateTotal()

      // Get ship-to company information if selected
      let shipToData = {}
      
      if (data.ship_to_company_id && data.ship_to_company_type) {
        const shipToCompany = data.ship_to_company_type === 'my_company' 
          ? myCompanies.find(c => c.company_id === data.ship_to_company_id)
          : externalCompanies.find(c => c.company_id === data.ship_to_company_id)
        
        if (shipToCompany) {
          const companyName = shipToCompany.company_name
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

      // Update the purchase order using correct field names
      const { error: poUpdateError } = await supabase
        .from('purchase_orders')
        .update({
          company_id: data.company_id,
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
          status: data.status as 'Draft' | 'Sent' | 'Acknowledged' | 'Completed' | 'Cancelled',
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
      origin_country: item.origin_country || null,
      origin_country_code: item.origin_country_code || null,
      last_certified_agency: item.last_certified_agency || null,
      traceability_files_path: item.traceability_files_path && item.traceability_files_path.length > 0 
        ? JSON.stringify(item.traceability_files_path) 
        : null,
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
      buyer_company: validMyCompanies.find(c => c.company_id === data.company_id) ? {
        company_name: validMyCompanies.find(c => c.company_id === data.company_id)!.company_name,
        company_code: validMyCompanies.find(c => c.company_id === data.company_id)!.company_code || ''
      } : null,
      vendor_company: validExternalCompanies.find(c => c.company_id === data.vendor_company_id) ? {
        company_name: validExternalCompanies.find(c => c.company_id === data.vendor_company_id)!.company_name,
        company_code: validExternalCompanies.find(c => c.company_id === data.vendor_company_id)!.company_code || ''
      } : null,
      created_at: purchaseOrder?.created_at || new Date().toISOString()
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

  // All validation arrays are now defined above

  const selectedMyCompany = validMyCompanies.find(c => c.company_id === form.watch('company_id'))
  const selectedVendor = validExternalCompanies.find(c => c.company_id === form.watch('vendor_company_id'))
  const selectedShipToCompany = form.watch('ship_to_company_type') === 'my_company' 
    ? validMyCompanies.find(c => c.company_id === form.watch('ship_to_company_id'))
    : validExternalCompanies.find(c => c.company_id === form.watch('ship_to_company_id'))

  // Filter Ship Via options based on Ship-To company (if selected), otherwise fallback to My Company
  const getShipViaFilterCompany = () => {
    // Priority: Ship-To company first, then My Company as fallback
    if (selectedShipToCompany) {
      return { 
        name: selectedShipToCompany.company_name, 
        code: selectedShipToCompany.company_code 
      }
    }
    
    if (selectedMyCompany) {
      return { 
        name: selectedMyCompany.company_name, 
        code: selectedMyCompany.company_code 
      }
    }
    
    return null
  }
  
  const filterCompany = getShipViaFilterCompany()
  const filteredShipViaList = filterCompany
    ? validShipViaList.filter(shipVia => 
        shipVia.owner === filterCompany.name || 
        shipVia.owner === filterCompany.code ||
        !shipVia.owner
      )
    : validShipViaList


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

      {/* Form initialization error display */}
      {formInitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Form Initialization Error
              </h3>
              <div className="mt-2 text-sm text-red-700">
                {formInitError}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading state display */}
      {isInitializingForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Initializing Form
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                Loading purchase order data and preparing form...
              </div>
            </div>
          </div>
        </div>
      )}

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
                <Label htmlFor="company_id">My Company</Label>
                <Select
                  value={safeSelectValue(watchedCompanyId)}
                  onValueChange={(value) => {
                    console.log('🏢 My Company Select onChange triggered:', value)
                    safeFormSetValue('company_id', value, validMyCompanies)
                  }}
                  disabled={isInitializingForm}
                >
                  <SelectTrigger id="company_id" className={form.formState.errors.company_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder={
                      isInitializingForm 
                        ? "Initializing form..." 
                        : !dataValidationResults.myCompanies.isValid
                        ? "Loading companies..."
                        : validMyCompanies.length 
                        ? "Select your company" 
                        : "No companies available"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {isInitializingForm ? (
                      <SelectItem value="__initializing__" disabled>Initializing form...</SelectItem>
                    ) : validMyCompanies.length > 0 ? (
                      validMyCompanies.map((company) => (
                        <SelectItem key={company.company_id} value={company.company_id}>
                          {company.company_code} - {company.company_name}
                        </SelectItem>
                      ))
                    ) : dataValidationResults.myCompanies.isValid ? (
                      <SelectItem value="__no_companies__" disabled>No internal companies found</SelectItem>
                    ) : (
                      <SelectItem value="__loading__" disabled>Loading companies...</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="vendor_company_id">Vendor</Label>
                <Select
                  value={safeSelectValue(watchedVendorId)}
                  onValueChange={(value) => {
                    console.log('🏪 Vendor Company Select onChange triggered:', value)
                    safeFormSetValue('vendor_company_id', value, validExternalCompanies)
                  }}
                  disabled={isInitializingForm}
                >
                  <SelectTrigger id="vendor_company_id" className={form.formState.errors.vendor_company_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder={
                      isInitializingForm 
                        ? "Initializing form..." 
                        : !dataValidationResults.externalCompanies.isValid
                        ? "Loading vendors..."
                        : validExternalCompanies.length 
                        ? "Select vendor" 
                        : "No vendors available"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {isInitializingForm ? (
                      <SelectItem value="__initializing__" disabled>Initializing form...</SelectItem>
                    ) : validExternalCompanies.length > 0 ? (
                      validExternalCompanies.map((company) => (
                        <SelectItem key={company.company_id} value={company.company_id}>
                          {company.company_code} - {company.company_name}
                        </SelectItem>
                      ))
                    ) : dataValidationResults.externalCompanies.isValid ? (
                      <SelectItem value="__no_vendors__" disabled>No vendor companies found</SelectItem>
                    ) : (
                      <SelectItem value="__loading__" disabled>Loading vendors...</SelectItem>
                    )}
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
                      <div className="font-medium">{selectedMyCompany.company_name}</div>
                      <div>{selectedMyCompany.company_code}</div>
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
                  value={safeSelectValue(form.watch('ship_to_company_type'))}
                  onValueChange={(value) => {
                    form.setValue('ship_to_company_type', value as 'my_company' | 'external_company')
                    form.setValue('ship_to_company_id', undefined)
                    // Clear Ship Via selection when Ship-To company type changes
                    form.setValue('ship_via_id', undefined)
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
                  value={safeSelectValue(watchedShipToId)}
                  onValueChange={(value) => {
                    console.log('🚚 Ship To Company Select onChange triggered:', value)
                    const shipToCompanies = form.watch('ship_to_company_type') === 'my_company' 
                      ? validMyCompanies 
                      : validExternalCompanies
                    safeFormSetValue('ship_to_company_id', value, shipToCompanies)
                    // Clear Ship Via selection when Ship-To company changes
                    if (isFormStable && value) {
                      form.setValue('ship_via_id', undefined)
                    }
                  }}
                  disabled={!form.watch('ship_to_company_type')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {form.watch('ship_to_company_type') === 'my_company' ? (
                      validMyCompanies.length > 0 ? (
                        validMyCompanies.map((company) => (
                          <SelectItem key={company.company_id} value={company.company_id}>
                            {company.company_code} - {company.company_name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__no_internal_companies__" disabled>No internal companies available</SelectItem>
                      )
                    ) : form.watch('ship_to_company_type') === 'external_company' ? (
                      validExternalCompanies.length > 0 ? (
                        validExternalCompanies.map((company) => (
                          <SelectItem key={company.company_id} value={company.company_id}>
                            {company.company_code} - {company.company_name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__no_external_companies__" disabled>No external companies available</SelectItem>
                      )
                    ) : (
                      <SelectItem value="__select_company_type__" disabled>Select company type first</SelectItem>
                    )}
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
                    {selectedShipToCompany.company_name}
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
            {purchaseOrder && (purchaseOrder.ship_to_company_name || purchaseOrder.ship_to_address_details) && !selectedShipToCompany && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Current Ship To Information</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  {purchaseOrder.ship_to_company_name && (
                    <div className="font-medium">{purchaseOrder.ship_to_company_name}</div>
                  )}
                  {purchaseOrder.ship_to_address_details && (
                    <div className="whitespace-pre-line">{purchaseOrder.ship_to_address_details}</div>
                  )}
                  {purchaseOrder.ship_to_contact_name && (
                    <div>Contact: {purchaseOrder.ship_to_contact_name}</div>
                  )}
                  {purchaseOrder.ship_to_contact_phone && (
                    <div>Phone: {purchaseOrder.ship_to_contact_phone}</div>
                  )}
                  {purchaseOrder.ship_to_contact_email && (
                    <div>Email: {purchaseOrder.ship_to_contact_email}</div>
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
                  value={safeSelectValue(form.watch('ship_via_id'))}
                  onValueChange={(value) => form.setValue('ship_via_id', value)}
                  disabled={isInitializingForm}
                >
                  <SelectTrigger id="ship_via_id" className={form.formState.errors.ship_via_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder={
                      isInitializingForm 
                        ? "Initializing form..."
                        : !dataValidationResults.shipViaList.isValid
                        ? "Loading shipping methods..." 
                        : filteredShipViaList.length === 0 
                        ? "No shipping methods available"
                        : "Select shipping method"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {isInitializingForm ? (
                      <SelectItem value="__initializing__" disabled>Initializing form...</SelectItem>
                    ) : filteredShipViaList.length > 0 ? (
                      filteredShipViaList.map((shipVia) => (
                        <SelectItem key={shipVia.ship_via_id} value={shipVia.ship_via_id}>
                          <div className="flex flex-col">
                            <div className="font-medium">
                              {shipVia.ship_company_name}
                            </div>
                            <div className="text-sm text-slate-600">
                              Account: {shipVia.account_no}
                              {shipVia.owner && ` • Owner: ${shipVia.owner}`}
                              {shipVia.ship_model && ` • ${shipVia.ship_model}`}
                            </div>
                          </div>
                        </SelectItem>
                      ))
                    ) : validShipViaList.length > 0 ? (
                      <SelectItem value="__no_ship_via_filtered__" disabled>
                        No shipping methods available for selected company
                      </SelectItem>
                    ) : dataValidationResults.shipViaList.isValid ? (
                      <SelectItem value="__no_ship_via__" disabled>No shipping methods found</SelectItem>
                    ) : (
                      <SelectItem value="__loading_ship_via__" disabled>Loading shipping methods...</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={form.watch('currency')}
                  onValueChange={(value) => form.setValue('currency', value)}
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
                  value={safeSelectValue(form.watch('payment_term'))}
                  onValueChange={(value) => form.setValue('payment_term', value)}
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
                        value={safeSelectValue(form.watch(`items.${index}.pn_id`))}
                        onValueChange={(value) => {
                          form.setValue(`items.${index}.pn_id`, value)
                          const selectedPart = validPartNumbers.find(pn => pn.pn_id === value)
                          if (selectedPart && selectedPart.description) {
                            form.setValue(`items.${index}.description`, selectedPart.description)
                          }
                        }}
                        disabled={isInitializingForm}
                      >
                        <SelectTrigger id={`pn_id_trigger_${index}`} className={form.formState.errors.items?.[index]?.pn_id ? 'border-red-500' : ''}>
                          <SelectValue placeholder={
                            isInitializingForm 
                              ? "Initializing form..." 
                              : !dataValidationResults.partNumbers.isValid
                              ? "Loading part numbers..."
                              : validPartNumbers.length 
                              ? "Select part number" 
                              : "No part numbers available"
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {isInitializingForm ? (
                            <SelectItem value="__initializing__" disabled>Initializing form...</SelectItem>
                          ) : validPartNumbers.length > 0 ? (
                            validPartNumbers.map((pn) => (
                              <SelectItem key={pn.pn_id} value={pn.pn_id}>
                                <div>
                                  <div className="font-mono">{pn.pn}</div>
                                  {pn.description && (
                                    <div className="text-sm text-slate-600">{pn.description}</div>
                                  )}
                                </div>
                              </SelectItem>
                            ))
                          ) : dataValidationResults.partNumbers.isValid ? (
                            <SelectItem value="__no_part_numbers__" disabled>No part numbers available</SelectItem>
                          ) : (
                            <SelectItem value="__loading_part_numbers__" disabled>Loading part numbers...</SelectItem>
                          )}
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
                        value={safeSelectValue(form.watch(`items.${index}.condition`))}
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
                          value={safeSelectValue(form.watch(`items.${index}.origin_country`))}
                          onValueChange={(value) => {
                            const selectedCountry = validCountries.find(c => c.name === value)
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
                            {validCountries.map((country) => (
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
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.back()} 
            className="w-full sm:w-auto"
            disabled={isInitializingForm}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={form.formState.isSubmitting || isInitializingForm || !!formInitError} 
            className="w-full sm:w-auto"
          >
            {isInitializingForm ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Initializing...
              </>
            ) : form.formState.isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Updating...
              </>
            ) : formInitError ? (
              'Form Error - Cannot Submit'
            ) : (
              'Update Purchase Order'
            )}
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