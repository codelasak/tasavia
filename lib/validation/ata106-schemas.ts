import * as z from 'zod'

// ATA 106 Form validation schemas for Aircraft Parts Traceability compliance
// Based on ATA Specification 106 for Aircraft Parts Traceability

// Standard aviation part condition codes
const AVIATION_CONDITIONS = [
  'AR',    // As Removed
  'SV',    // Serviceable  
  'SVC',   // Serviceable
  'OH',    // Overhauled
  'OHC',   // Overhauled
  'RP',    // Repaired
  'REP',   // Repaired
  'NEW',   // New
  'NS',    // New Surplus
  'NE',    // New
  'RB',    // Rebuilt
  'AS-IS', // As Is
  'SCRAP', // Scrap
] as const

// Aviation regulatory agencies and certification bodies
const CERTIFIED_AGENCIES = [
  'FAA',     // Federal Aviation Administration
  'EASA',    // European Union Aviation Safety Agency
  'TCCA',    // Transport Canada Civil Aviation
  'CASA',    // Civil Aviation Safety Authority (Australia)
  'CAAC',    // Civil Aviation Administration of China
  'DGCA',    // Directorate General of Civil Aviation (India)
  'JAA',     // Joint Aviation Authorities
  'CAA-UK',  // Civil Aviation Authority (UK)
  'ANAC',    // National Civil Aviation Agency (Brazil)
  'JCAB',    // Japan Civil Aviation Bureau
] as const

// ATA 106 Transfer Types
const TRANSFER_TYPES = ['SALE', 'LOAN', 'LEASE', 'CONSIGNMENT', 'EXCHANGE', 'RETURN'] as const

// Organization type validation
const organizationSchema = z.object({
  organization_name: z.string()
    .min(1, 'Organization name is required')
    .max(200, 'Organization name must be less than 200 characters')
    .regex(/^[A-Za-z0-9\s\.\,\-&\']+$/, 'Organization name contains invalid characters'),
    
  organization_code: z.string()
    .min(1, 'Organization code is required')
    .max(20, 'Organization code must be less than 20 characters')
    .regex(/^[A-Z0-9\-]+$/, 'Organization code must contain only uppercase letters, numbers, and hyphens'),
    
  address: z.string()
    .min(10, 'Complete address is required for ATA 106 compliance')
    .max(500, 'Address must be less than 500 characters'),
    
  authorized_representative: z.string()
    .min(1, 'Authorized representative name is required')
    .max(100, 'Representative name must be less than 100 characters')
    .regex(/^[A-Za-z\s\.\,\-\']+$/, 'Representative name contains invalid characters')
    .optional(),
    
  title_position: z.string()
    .min(1, 'Title/Position is required')
    .max(100, 'Title/Position must be less than 100 characters')
    .optional(),
})

// Aircraft part validation schema
const aircraftPartSchema = z.object({
  part_number: z.string()
    .min(1, 'Part number is required')
    .max(50, 'Part number must be less than 50 characters')
    .regex(/^[A-Za-z0-9\-\.\/]+$/, 'Part number contains invalid characters'),
    
  serial_number: z.string()
    .max(50, 'Serial number must be less than 50 characters')
    .regex(/^[A-Za-z0-9\-\.\/]+$/, 'Serial number contains invalid characters')
    .optional(),
    
  description: z.string()
    .min(1, 'Part description is required')
    .max(200, 'Description must be less than 200 characters'),
    
  quantity: z.number()
    .min(1, 'Quantity must be at least 1')
    .max(999999, 'Quantity cannot exceed 999,999')
    .int('Quantity must be a whole number'),
    
  condition: z.enum(AVIATION_CONDITIONS, {
    required_error: 'Condition is required for aircraft parts',
    invalid_type_error: 'Invalid condition code',
  }),
  
  application: z.string()
    .max(100, 'Application must be less than 100 characters')
    .regex(/^[A-Za-z0-9\s\-\.\/\,]+$/, 'Application contains invalid characters')
    .optional(),
    
  dimensions: z.string()
    .max(100, 'Dimensions must be less than 100 characters')
    .regex(/^[\d\.\s×xX\-\,\"\']+$/, 'Dimensions must contain only numbers, spaces, and dimension separators')
    .optional(),
})

// Traceability information validation
const traceabilityInformationSchema = z.object({
  traceability_source: z.string()
    .min(1, 'Traceability source is required for ATA 106 compliance')
    .max(200, 'Traceability source must be less than 200 characters')
    .regex(/^[A-Za-z0-9\s\-\.\,\/\(\)]+$/, 'Traceability source contains invalid characters'),
    
  traceable_to: z.string()
    .min(1, 'Traceable to information is required')
    .max(200, 'Traceable to must be less than 200 characters')
    .regex(/^[A-Za-z0-9\s\-\.\,\/\(\)]+$/, 'Traceable to contains invalid characters'),
    
  last_certified_agency: z.enum([...CERTIFIED_AGENCIES, 'OTHER'] as const, {
    required_error: 'Last certified agency is required',
    invalid_type_error: 'Invalid certification agency',
  }),
  
  last_certified_agency_other: z.string()
    .min(1, 'Please specify the certification agency')
    .max(100, 'Agency name must be less than 100 characters')
    .regex(/^[A-Za-z0-9\s\-\.]+$/, 'Agency name contains invalid characters')
    .optional(),
    
  certificate_number: z.string()
    .max(100, 'Certificate number must be less than 100 characters')
    .regex(/^[A-Za-z0-9\-\.\/]+$/, 'Certificate number contains invalid characters')
    .optional(),
    
  airworthiness_release_date: z.date({
    invalid_type_error: 'Invalid date format',
  }).optional(),
    
}).refine((data) => {
  // If "OTHER" is selected for certified agency, other field must be provided
  if (data.last_certified_agency === 'OTHER') {
    return !!data.last_certified_agency_other;
  }
  return true;
}, {
  message: 'Please specify the certification agency when "OTHER" is selected',
  path: ['last_certified_agency_other'],
})

// Transfer information validation  
const transferInformationSchema = z.object({
  transfer_type: z.enum(TRANSFER_TYPES, {
    required_error: 'Transfer type is required',
    invalid_type_error: 'Invalid transfer type',
  }),
  
  transfer_date: z.date({
    required_error: 'Transfer date is required',
    invalid_type_error: 'Invalid date format',
  }),
  
  reference_number: z.string()
    .min(1, 'Reference number is required') 
    .max(50, 'Reference number must be less than 50 characters')
    .regex(/^[A-Za-z0-9\-\.\/]+$/, 'Reference number contains invalid characters'),
    
  contract_number: z.string()
    .max(50, 'Contract number must be less than 50 characters')
    .regex(/^[A-Za-z0-9\-\.\/]+$/, 'Contract number contains invalid characters')
    .optional(),
    
}).refine((data) => {
  // Transfer date cannot be in the future
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return data.transfer_date <= today;
}, {
  message: 'Transfer date cannot be in the future',
  path: ['transfer_date'],
})

// Certification and compliance validation
const certificationSchema = z.object({
  transferor_signature: z.string()
    .min(1, 'Transferor signature is required')
    .optional(),
    
  transferor_name: z.string()
    .min(1, 'Transferor name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[A-Za-z\s\.\,\-\']+$/, 'Name contains invalid characters')
    .optional(),
    
  transferor_title: z.string()
    .min(1, 'Transferor title is required')
    .max(100, 'Title must be less than 100 characters')
    .optional(),
    
  transferor_date: z.date({
    invalid_type_error: 'Invalid date format',
  }).optional(),
  
  transferor_certificate_number: z.string()
    .max(50, 'Certificate number must be less than 50 characters')
    .regex(/^[A-Za-z0-9\-\.\/]+$/, 'Certificate number contains invalid characters')
    .optional(),
    
  transferee_signature: z.string()
    .min(1, 'Transferee signature is required')
    .optional(),
    
  transferee_name: z.string()
    .min(1, 'Transferee name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[A-Za-z\s\.\,\-\']+$/, 'Name contains invalid characters')
    .optional(),
    
  transferee_title: z.string()
    .min(1, 'Transferee title is required')
    .max(100, 'Title must be less than 100 characters')
    .optional(),
    
  transferee_date: z.date({
    invalid_type_error: 'Invalid date format',
  }).optional(),
  
  transferee_certificate_number: z.string()
    .max(50, 'Certificate number must be less than 50 characters')
    .regex(/^[A-Za-z0-9\-\.\/]+$/, 'Certificate number contains invalid characters')
    .optional(),
})

// Main ATA 106 Form validation schema
const ata106FormSchema = z.object({
  // Form identification
  form_number: z.string()
    .min(1, 'Form number is required')
    .max(50, 'Form number must be less than 50 characters')
    .regex(/^ATA106\-[A-Za-z0-9\-]+$/, 'Form number must follow ATA106-XXXXXX format'),
    
  date_issued: z.date({
    required_error: 'Date issued is required',
    invalid_type_error: 'Invalid date format',
  }),
  
  page_number: z.string()
    .regex(/^\d+\s+of\s+\d+$/, 'Page number must be in format "X of Y"')
    .default('1 of 1'),
    
  // Organizations
  transferor: organizationSchema,
  transferee: organizationSchema,
  
  // Transfer details
  transfer_info: transferInformationSchema,
  
  // Parts information
  parts: z.array(aircraftPartSchema.and(traceabilityInformationSchema))
    .min(1, 'At least one aircraft part is required')
    .max(50, 'Cannot exceed 50 parts per form'),
    
  // Certification
  certification: certificationSchema,
  
  // Additional compliance information
  export_control_applicable: z.boolean().default(false),
  record_retention_required: z.boolean().default(true),
  
  // Form status
  completion_status: z.enum(['DRAFT', 'PENDING_SIGNATURES', 'COMPLETED'], {
    required_error: 'Completion status is required',
  }).default('DRAFT'),
  
}).refine((data) => {
  // Date issued cannot be in the future
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return data.date_issued <= today;
}, {
  message: 'Date issued cannot be in the future',
  path: ['date_issued'],
}).refine((data) => {
  // Transferor and transferee cannot be the same organization
  return data.transferor.organization_name !== data.transferee.organization_name ||
         data.transferor.organization_code !== data.transferee.organization_code;
}, {
  message: 'Transferor and transferee must be different organizations',
  path: ['transferee', 'organization_name'],
}).refine((data) => {
  // If form is completed, both signatures must be present
  if (data.completion_status === 'COMPLETED') {
    return !!(data.certification.transferor_signature && data.certification.transferee_signature);
  }
  return true;
}, {
  message: 'Both transferor and transferee signatures are required for completed forms',
  path: ['certification'],
})

// ATA 106 compliance check utility schema
const ata106ComplianceCheckSchema = z.object({
  sales_order_id: z.string().uuid('Invalid sales order ID'),
  required_fields: z.array(z.string()).default([]),
  missing_fields: z.array(z.string()).default([]),
  compliance_percentage: z.number().min(0).max(100).default(0),
  is_compliant: z.boolean().default(false),
  warnings: z.array(z.string()).default([]),
  errors: z.array(z.string()).default([]),
})

// Form validation types
export type ATA106FormValues = z.infer<typeof ata106FormSchema>
export type AircraftPartValues = z.infer<typeof aircraftPartSchema>
export type TraceabilityInformationValues = z.infer<typeof traceabilityInformationSchema>
export type TransferInformationValues = z.infer<typeof transferInformationSchema>
export type CertificationValues = z.infer<typeof certificationSchema>
export type OrganizationValues = z.infer<typeof organizationSchema>
export type ATA106ComplianceCheck = z.infer<typeof ata106ComplianceCheckSchema>

// Partial schemas for updates - manually defined to avoid refine issues
const ata106FormUpdateSchema = z.object({
  form_number: z.string().min(1).max(50).regex(/^ATA106\-[A-Za-z0-9\-]+$/).optional(),
  date_issued: z.date().optional(),
  page_number: z.string().regex(/^\d+\s+of\s+\d+$/).optional(),
  transferor: organizationSchema.partial().optional(),
  transferee: organizationSchema.partial().optional(),
  transfer_info: z.object({
    transfer_type: z.enum(TRANSFER_TYPES).optional(),
    transfer_date: z.date().optional(),
    reference_number: z.string().min(1).max(50).regex(/^[A-Za-z0-9\-\.\/]+$/).optional(),
    contract_number: z.string().max(50).regex(/^[A-Za-z0-9\-\.\/]+$/).optional(),
  }).optional(),
  parts: z.array(aircraftPartSchema.and(traceabilityInformationSchema)).optional(),
  certification: certificationSchema.partial().optional(),
  export_control_applicable: z.boolean().optional(),
  record_retention_required: z.boolean().optional(),
  completion_status: z.enum(['DRAFT', 'PENDING_SIGNATURES', 'COMPLETED']).optional(),
})

const certificationUpdateSchema = certificationSchema.partial()

// Utility functions for validation
const validateATA106Compliance = (salesOrderData: any): ATA106ComplianceCheck => {
  const requiredFields = [
    'traceability_source',
    'traceable_to', 
    'last_certified_agency'
  ]
  
  const missingFields: string[] = []
  const warnings: string[] = []
  const errors: string[] = []
  
  // Check each sales order item for ATA 106 compliance
  if (salesOrderData.sales_order_items) {
    salesOrderData.sales_order_items.forEach((item: any, index: number) => {
      requiredFields.forEach(field => {
        if (!item.inventory?.[field]) {
          missingFields.push(`Item ${index + 1}: ${field}`)
        }
      })
      
      // Additional checks
      if (item.inventory?.condition && !AVIATION_CONDITIONS.includes(item.inventory.condition)) {
        warnings.push(`Item ${index + 1}: Non-standard condition code`)
      }
    })
  }
  
  const compliancePercentage = Math.round(
    ((requiredFields.length - missingFields.length) / requiredFields.length) * 100
  )
  
  return {
    sales_order_id: salesOrderData.sales_order_id,
    required_fields: requiredFields,
    missing_fields: missingFields,
    compliance_percentage: compliancePercentage,
    is_compliant: missingFields.length === 0,
    warnings,
    errors,
  }
}

// Export all schemas and utilities
export {
  ata106FormSchema as default,
  ata106FormUpdateSchema,
  certificationUpdateSchema,
  organizationSchema,
  aircraftPartSchema,
  traceabilityInformationSchema,
  transferInformationSchema,
  certificationSchema,
  ata106ComplianceCheckSchema,
  validateATA106Compliance,
  AVIATION_CONDITIONS,
  CERTIFIED_AGENCIES,
  TRANSFER_TYPES,
}