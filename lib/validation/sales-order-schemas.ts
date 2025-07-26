import * as z from 'zod'

// Enhanced validation schemas for sales orders with comprehensive field validation

// Common validation patterns
const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Document reference validation
const documentReferenceSchema = z.object({
  reference_number: z.string()
    .min(1, 'Reference number is required')
    .max(50, 'Reference number must be less than 50 characters')
    .regex(/^[A-Z0-9-]+$/, 'Reference number must contain only letters, numbers, and hyphens')
    .optional(),
  contract_number: z.string()
    .min(1, 'Contract number is required')
    .max(50, 'Contract number must be less than 50 characters')
    .regex(/^[A-Z0-9-]+$/, 'Contract number must contain only letters, numbers, and hyphens')
    .optional(),
})

// Export documentation validation
const exportDocumentationSchema = z.object({
  country_of_origin: z.string()
    .min(2, 'Country of origin must be at least 2 characters')
    .max(100, 'Country of origin must be less than 100 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Country of origin must contain only letters and spaces')
    .optional(),
  end_use_country: z.string()
    .min(2, 'End use country must be at least 2 characters')
    .max(100, 'End use country must be less than 100 characters')
    .regex(/^[a-zA-Z\s]+$/, 'End use country must contain only letters and spaces')
    .optional(),
})

// Financial validation
const financialSchema = z.object({
  freight_charge: z.number()
    .min(0, 'Freight charge must be positive')
    .max(999999.99, 'Freight charge cannot exceed $999,999.99')
    .default(0)
    .transform(val => Number(val.toFixed(2))),
  misc_charge: z.number()
    .min(0, 'Miscellaneous charge must be positive')
    .max(999999.99, 'Miscellaneous charge cannot exceed $999,999.99')
    .default(0)
    .transform(val => Number(val.toFixed(2))),
  vat_percentage: z.number()
    .min(0, 'VAT percentage must be positive')
    .max(50, 'VAT percentage cannot exceed 50%')
    .default(0)
    .transform(val => Number(val.toFixed(2))),
})

// Physical specifications validation
const physicalSpecsSchema = z.object({
  application_code: z.string()
    .min(1, 'Application code is required')
    .max(20, 'Application code must be less than 20 characters')
    .regex(/^[A-Z0-9-]+$/, 'Application code must contain only uppercase letters, numbers, and hyphens')
    .optional(),
  dimensions: z.string()
    .min(1, 'Dimensions are required')
    .max(100, 'Dimensions must be less than 100 characters')
    .regex(/^[\d\.\s×xX\-]+$/, 'Dimensions must contain only numbers, spaces, and dimension separators (×, x, X, -)')
    .optional(),
  weight: z.number()
    .min(0.01, 'Weight must be greater than 0')
    .max(10000, 'Weight cannot exceed 10,000 lbs')
    .transform(val => Number(val.toFixed(2)))
    .optional(),
})

// Traceability validation
const traceabilitySchema = z.object({
  traceability_source: z.string()
    .min(1, 'Traceability source is required')
    .max(200, 'Traceability source must be less than 200 characters')
    .optional(),
  traceable_to: z.string()
    .min(1, 'Traceable to is required')
    .max(200, 'Traceable to must be less than 200 characters')
    .optional(),
  last_certified_agency: z.string()
    .min(1, 'Last certified agency is required')
    .max(100, 'Last certified agency must be less than 100 characters')
    .optional(),
  part_status_certification: z.string()
    .min(1, 'Part status certification is required')
    .max(50, 'Part status certification must be less than 50 characters')
    .optional(),
})

// Enhanced sales order item validation
const salesOrderItemSchema = z.object({
  inventory_id: z.string()
    .min(1, 'Inventory item is required')
    .uuid('Invalid inventory ID format'),
  unit_price: z.number()
    .min(0.01, 'Unit price must be greater than $0.01')
    .max(999999.99, 'Unit price cannot exceed $999,999.99')
    .transform(val => Number(val.toFixed(2))),
}).and(physicalSpecsSchema).and(traceabilitySchema)

// Company validation
const companyValidationSchema = z.object({
  company_name: z.string()
    .min(1, 'Company name is required')
    .max(200, 'Company name must be less than 200 characters'),
  company_code: z.string()
    .min(1, 'Company code is required')
    .max(20, 'Company code must be less than 20 characters')
    .regex(/^[A-Z0-9-]+$/, 'Company code must contain only uppercase letters, numbers, and hyphens')
    .optional(),
  contact_email: z.string()
    .email('Invalid email format')
    .optional(),
  contact_phone: z.string()
    .regex(phoneRegex, 'Invalid phone number format')
    .optional(),
})

// Banking details validation
const bankingDetailsSchema = z.object({
  account_holder_name: z.string()
    .min(1, 'Account holder name is required')
    .max(100, 'Account holder name must be less than 100 characters'),
  bank_name: z.string()
    .min(1, 'Bank name is required')
    .max(100, 'Bank name must be less than 100 characters'),
  account_number: z.string()
    .min(1, 'Account number is required')
    .max(50, 'Account number must be less than 50 characters')
    .regex(/^[A-Z0-9-]+$/, 'Account number must contain only letters, numbers, and hyphens'),
  swift_code: z.string()
    .regex(/^[A-Z0-9]{8}$|^[A-Z0-9]{11}$/, 'SWIFT code must be exactly 8 or 11 uppercase letters and numbers')
    .optional(),
  iban: z.string()
    .min(15, 'IBAN must be at least 15 characters')
    .max(34, 'IBAN must be at most 34 characters')
    .regex(/^[A-Z0-9]+$/, 'IBAN must contain only uppercase letters and numbers')
    .optional(),
})

// Main sales order validation schema
const enhancedSalesOrderSchema = z.object({
  // Basic information
  my_company_id: z.string()
    .min(1, 'My company is required')
    .uuid('Invalid company ID format'),
  customer_company_id: z.string()
    .min(1, 'Customer is required')
    .uuid('Invalid customer ID format'),
  sales_date: z.date({
    required_error: 'Sales date is required',
    invalid_type_error: 'Invalid date format',
  }),
  
  // Document references
  customer_po_number: z.string()
    .max(50, 'Customer PO number must be less than 50 characters')
    .optional(),
  
  // Payment and currency
  payment_terms: z.enum(['PRE-PAY', 'COD', 'NET5', 'NET10', 'NET15', 'NET30'], {
    required_error: 'Payment terms are required',
  }).optional(),
  currency: z.enum(['USD', 'EURO', 'TL', 'GBP'], {
    required_error: 'Currency is required',
  }).default('USD'),
  
  // Terms and conditions
  terms_and_conditions_id: z.string()
    .uuid('Invalid terms and conditions ID format')
    .optional(),
  
  // Additional information
  remarks: z.string()
    .max(1000, 'Remarks must be less than 1000 characters')
    .optional(),
  
  // Line items with enhanced validation
  items: z.array(salesOrderItemSchema)
    .min(1, 'At least one item is required')
    .max(100, 'Cannot exceed 100 line items'),
    
}).and(documentReferenceSchema)
  .and(exportDocumentationSchema)
  .and(financialSchema)
  .refine((data) => {
    // Custom validation: If export countries are provided, at least one must be filled
    if (data.country_of_origin || data.end_use_country) {
      return data.country_of_origin !== data.end_use_country || (!data.country_of_origin && !data.end_use_country)
    }
    return true
  }, {
    message: 'Country of origin and end use country cannot be the same',
    path: ['end_use_country'],
  })
  .refine((data) => {
    // Custom validation: VAT percentage and amount consistency
    if (data.vat_percentage > 0) {
      return data.items.length > 0 // Must have items if VAT is applied
    }
    return true
  }, {
    message: 'Cannot apply VAT without line items',
    path: ['vat_percentage'],
  })
  .refine((data) => {
    // Custom validation: Reference number and contract number cannot be the same
    if (data.reference_number && data.contract_number) {
      return data.reference_number !== data.contract_number
    }
    return true
  }, {
    message: 'Reference number and contract number must be different',
    path: ['contract_number'],
  })

// Form validation type
export type EnhancedSalesOrderFormValues = z.infer<typeof enhancedSalesOrderSchema>

// Partial schema for updates
// Partial schema for updates - manually defined to avoid refine issues
const salesOrderUpdateSchema = z.object({
  company_id: z.string().uuid().optional(),
  my_company_id: z.string().uuid().optional(),
  invoice_number: z.string().min(1).max(100).optional(),
  invoice_date: z.date().optional(),
  items: z.array(salesOrderItemSchema).optional(),
  document_reference: documentReferenceSchema.optional(),
  export_documentation: exportDocumentationSchema.optional(),
  financial: financialSchema.optional(),
  banking_details: bankingDetailsSchema.optional(),
  status: z.enum(['Draft', 'Confirmed', 'Shipped', 'Delivered', 'Invoiced', 'Paid', 'Cancelled']).optional(),
})

// Schema for status updates with business rules
const statusUpdateSchema = z.object({
  status: z.enum(['Draft', 'Confirmed', 'Shipped', 'Invoiced', 'Closed', 'Cancelled'], {
    required_error: 'Status is required',
  }),
  tracking_number: z.string()
    .min(1, 'Tracking number is required when marking as shipped')
    .max(100, 'Tracking number must be less than 100 characters')
    .optional(),
}).refine((data) => {
  // Custom validation: Tracking number required when status is Shipped
  if (data.status === 'Shipped') {
    return !!data.tracking_number
  }
  return true
}, {
  message: 'Tracking number is required when marking order as shipped',
  path: ['tracking_number'],
})

// Export all schemas
export {
  enhancedSalesOrderSchema as default,
  salesOrderUpdateSchema,
  statusUpdateSchema,
  documentReferenceSchema,
  exportDocumentationSchema,
  financialSchema,
  physicalSpecsSchema,
  traceabilitySchema,
  salesOrderItemSchema,
  companyValidationSchema,
  bankingDetailsSchema,
}