import * as z from 'zod'

// Enhanced validation schemas for purchase orders with ATA 106 traceability fields

// Common validation patterns
const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const alphanumericWithDashRegex = /^[A-Z0-9-]+$/i

// Enhanced ATA 106 Traceability validation schema with new fields
const ata106TraceabilitySchema = z.object({
  traceability_source: z.string()
    .max(200, 'Obtained from must be less than 200 characters')
    .regex(/^[A-Za-z0-9\s\-\.\/]+$/, 'Obtained from contains invalid characters')
    .optional(),
    
    
  traceable_to: z.string()
    .max(200, 'Traceable to must be less than 200 characters')
    .regex(/^[A-Za-z0-9\s\-\.\/\,]+$/, 'Traceable to contains invalid characters')
    .optional(),
    
  origin_country: z.string()
    .max(100, 'Origin country must be less than 100 characters')
    .optional(),
    
  origin_country_code: z.string()
    .length(2, 'Origin country code must be exactly 2 characters')
    .optional(),
    
  last_certified_agency: z.string()
    .max(100, 'Last certified agency must be less than 100 characters')
    .regex(/^[A-Za-z0-9\s\-\.]+$/, 'Certified agency contains invalid characters')
    .optional(),
    
})

// Purchase Order Item validation schema with ATA 106 support
const purchaseOrderItemSchema = z.object({
  pn_id: z.string()
    .min(1, 'Part number is required')
    .uuid('Invalid part number ID format'),
    
  quantity: z.number()
    .min(1, 'Quantity must be at least 1')
    .max(999999, 'Quantity cannot exceed 999,999')
    .int('Quantity must be a whole number'),
    
  unit_price: z.number()
    .min(0.01, 'Unit price must be greater than $0.01')
    .max(999999.99, 'Unit price cannot exceed $999,999.99')
    .transform(val => Number(val.toFixed(2))),
    
  condition: z.enum(['NEW', 'USED', 'OVERHAULED', 'REPAIRED', 'AS-IS', 'AR', 'SVC', 'OHC', 'REP'], {
    required_error: 'Condition is required',
    invalid_type_error: 'Invalid condition selected',
  }).optional(),
  
  sn: z.string()
    .max(50, 'Serial number must be less than 50 characters')
    .regex(/^[A-Za-z0-9\-\_]+$/, 'Serial number can only contain letters, numbers, hyphens, and underscores')
    .optional(),
    
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
    
}).and(ata106TraceabilitySchema)

// Company validation schema
const companyValidationSchema = z.object({
  company_name: z.string()
    .min(1, 'Company name is required')
    .max(200, 'Company name must be less than 200 characters'),
    
  company_code: z.string()
    .min(1, 'Company code is required')
    .max(20, 'Company code must be less than 20 characters')
    .regex(alphanumericWithDashRegex, 'Company code must contain only letters, numbers, and hyphens')
    .optional(),
    
  contact_email: z.string()
    .email('Invalid email format')
    .optional(),
    
  contact_phone: z.string()
    .regex(phoneRegex, 'Invalid phone number format')
    .optional(),
})

// Payment and financial validation
const financialValidationSchema = z.object({
  payment_terms: z.enum(['PRE-PAY', 'COD', 'NET5', 'NET10', 'NET15', 'NET30', 'NET45', 'NET60'], {
    required_error: 'Payment terms are required',
  }).optional(),
  
  currency: z.enum(['USD', 'EURO', 'TL', 'GBP', 'CAD', 'AUD', 'JPY'], {
    required_error: 'Currency is required',
  }).default('USD'),
  
  freight_terms: z.enum(['FOB', 'CIF', 'DDP', 'EXW', 'FCA', 'CPT'], {
    required_error: 'Freight terms are required',
  }).optional(),
})

// Aviation compliance validation schema
const aviationComplianceSchema = z.object({
  // Certificate information
  last_certificate: z.string()
    .max(200, 'Last certificate must be less than 200 characters')
    .optional(),
    
  obtained_from: z.string()
    .max(200, 'Obtained from must be less than 200 characters')
    .optional(),
    
  certificate_reference_number: z.string()
    .max(100, 'Certificate reference number must be less than 100 characters')
    .optional(),
    
  certificate_expiry_date: z.date({
    invalid_type_error: 'Invalid certificate expiry date format',
  }).optional(),
  
  certificate_upload_path: z.string()
    .max(500, 'Certificate upload path must be less than 500 characters')
    .optional(),
    
  // Traceability information
  traceable_to_airline: z.string()
    .max(100, 'Traceable to airline must be less than 100 characters')
    .regex(/^[A-Za-z0-9\s\-\.\/]+$/, 'Airline name contains invalid characters')
    .optional(),
    
  traceable_to_msn: z.string()
    .max(50, 'MSN must be less than 50 characters')
    .regex(/^[A-Za-z0-9\-]+$/, 'MSN can only contain letters, numbers, and hyphens')
    .optional(),
    
  // Origin and destination countries
  origin_country: z.string()
    .max(100, 'Origin country must be less than 100 characters')
    .optional(),
    
  end_use_country: z.string()
    .max(100, 'End use country must be less than 100 characters')
    .optional(),
    
  // Regulatory information
  regulatory_authority: z.string()
    .max(100, 'Regulatory authority must be less than 100 characters')
    .regex(/^[A-Za-z0-9\s\-\.]+$/, 'Regulatory authority contains invalid characters')
    .optional(),
    
  airworthiness_status: z.enum(['AIRWORTHY', 'NON-AIRWORTHY', 'UNKNOWN', 'PENDING'], {
    invalid_type_error: 'Invalid airworthiness status',
  }).optional(),
  
  // Compliance verification
  aviation_compliance_verified: z.boolean().default(false),
  compliance_notes: z.string()
    .max(1000, 'Compliance notes must be less than 1000 characters')
    .optional(),
})

// Main Purchase Order validation schema (aviation compliance removed)
const purchaseOrderSchema = z.object({
  // Basic information
  my_company_id: z.string()
    .min(1, 'My company is required')
    .uuid('Invalid company ID format'),
    
  supplier_company_id: z.string()
    .min(1, 'Supplier is required')
    .uuid('Invalid supplier ID format'),
    
  po_date: z.date({
    required_error: 'Purchase order date is required',
    invalid_type_error: 'Invalid date format',
  }),
  
  expected_delivery_date: z.date({
    required_error: 'Expected delivery date is required',
    invalid_type_error: 'Invalid date format',
  }),
  
  // Document references
  supplier_quote_number: z.string()
    .max(50, 'Supplier quote number must be less than 50 characters')
    .optional(),
    
  customer_reference: z.string()
    .max(100, 'Customer reference must be less than 100 characters')
    .optional(),
    
  // Additional information
  remarks: z.string()
    .max(1000, 'Remarks must be less than 1000 characters')
    .optional(),
    
  special_instructions: z.string()
    .max(500, 'Special instructions must be less than 500 characters')
    .optional(),
    
  // Line items with enhanced ATA 106 traceability support
  items: z.array(purchaseOrderItemSchema)
    .min(1, 'At least one item is required')
    .max(100, 'Cannot exceed 100 line items'),
    
}).and(financialValidationSchema)
  .refine((data) => {
    // Custom validation: Expected delivery date must be in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return data.expected_delivery_date >= today;
  }, {
    message: 'Expected delivery date must be today or in the future',
    path: ['expected_delivery_date'],
  })
  .refine((data) => {
    // Custom validation: Expected delivery date must be after PO date
    return data.expected_delivery_date >= data.po_date;
  }, {
    message: 'Expected delivery date must be on or after the purchase order date',
    path: ['expected_delivery_date'],
  })
  .refine((data) => {
    // Custom validation: Check if any items have traceability data
    const hasTraceabilityItems = data.items.some(item => 
      item.traceability_source || item.traceable_to || item.last_certified_agency ||
      item.origin_country
    );
    
    // This is informational - we don't fail validation
    // but can be used to show traceability status
    return true;
  }, {
    message: 'Traceability status checked',
    path: ['items'],
  })

// Form validation types
export type PurchaseOrderFormValues = z.infer<typeof purchaseOrderSchema>
export type PurchaseOrderItemFormValues = z.infer<typeof purchaseOrderItemSchema>
export type ATA106TraceabilityFormValues = z.infer<typeof ata106TraceabilitySchema>

// Partial schema for updates - manually defined to avoid refine issues
const purchaseOrderUpdateSchema = z.object({
  my_company_id: z.string().uuid().optional(),
  supplier_company_id: z.string().uuid().optional(),
  po_date: z.date().optional(),
  expected_delivery_date: z.date().optional(),
  supplier_quote_number: z.string().max(100).optional(),
  customer_reference: z.string().max(100).optional(),
  remarks: z.string().max(1000).optional(),
  special_instructions: z.string().max(1000).optional(),
  items: z.array(purchaseOrderItemSchema).optional(),
  total_amount: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  tax_amount: z.number().min(0).optional(),
  shipping_amount: z.number().min(0).optional(),
  discount_amount: z.number().min(0).optional(),
  status: z.enum(['Draft', 'Submitted', 'Approved', 'Rejected', 'Completed', 'Cancelled']).optional(),
})

// Schema for status updates with business rules
const purchaseOrderStatusUpdateSchema = z.object({
  status: z.enum(['Draft', 'Pending', 'Confirmed', 'Received', 'Completed', 'Cancelled'], {
    required_error: 'Status is required',
  }),
  delivery_confirmation_number: z.string()
    .min(1, 'Delivery confirmation number is required when marking as received')
    .max(100, 'Delivery confirmation number must be less than 100 characters')
    .optional(),
}).refine((data) => {
  // Custom validation: Delivery confirmation required when status is Received
  if (data.status === 'Received') {
    return !!data.delivery_confirmation_number;
  }
  return true;
}, {
  message: 'Delivery confirmation number is required when marking order as received',
  path: ['delivery_confirmation_number'],
})

// ATA 106 compliance check schema
const ata106ComplianceSchema = z.object({
  requires_ata106: z.boolean().default(false),
  compliance_level: z.enum(['NONE', 'PARTIAL', 'FULL'], {
    required_error: 'Compliance level is required',
  }).default('NONE'),
  missing_fields: z.array(z.string()).default([]),
})

// Export all schemas
export {
  purchaseOrderSchema as default,
  purchaseOrderUpdateSchema,
  purchaseOrderStatusUpdateSchema,
  ata106TraceabilitySchema,
  purchaseOrderItemSchema,
  companyValidationSchema,
  financialValidationSchema,
  aviationComplianceSchema,
  ata106ComplianceSchema,
}