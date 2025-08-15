/**
 * PDF Document Validation System
 * Ensures document completeness before PDF generation
 */

import { z } from 'zod'

// Base validation result interface
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  completenessScore: number // 0-100
  requiredFields: FieldValidation[]
  optionalFields: FieldValidation[]
}

export interface ValidationError {
  field: string
  message: string
  severity: 'critical' | 'high' | 'medium'
  category: 'required' | 'format' | 'business_rule' | 'compliance'
}

export interface ValidationWarning {
  field: string
  message: string
  recommendation: string
  category: 'completeness' | 'best_practice' | 'compliance'
}

export interface FieldValidation {
  fieldName: string
  displayName: string
  isPresent: boolean
  value?: any
  isValid: boolean
  errorMessage?: string
}

// Aviation compliance validation schema
const aviationComplianceSchema = z.object({
  obtainedFrom: z.string().min(1, "Source is required for aviation compliance"),
  originCountry: z.string().min(2, "Origin country is required"),
  originCountryName: z.string().optional(),
  lastCertificate: z.string().optional(),
  certificateAuthority: z.string().optional(),
  certificateNumber: z.string().optional(),
  certificateExpiry: z.string().optional(),
  traceableToAirline: z.string().optional(),
  traceableToAirlineIATA: z.string().optional(),
  traceableToAirlineICAO: z.string().optional(),
  traceableToMSN: z.string().optional(),
  traceableToRegistration: z.string().optional(),
  endUse: z.string().optional(),
  intendedUse: z.string().optional(),
  partCondition: z.enum(['new', 'used', 'refurbished', 'ar', 'serviceable', 'unserviceable']).optional(),
  qualitySystemStandard: z.enum(['AS9100', 'AS9110', 'AS9120', 'ISO9001', 'other']).optional()
})

// Invoice document validation schema
const invoiceDocumentSchema = z.object({
  // Required fields
  invoice_number: z.string().min(1, "Invoice number is required"),
  invoice_date: z.string().min(1, "Invoice date is required"),
  currency: z.string().min(1, "Currency is required"),
  total_net: z.number().min(0, "Total amount must be positive"),
  
  // Company information
  my_companies: z.object({
    my_company_name: z.string().min(1, "Company name is required"),
    company_addresses: z.array(z.object({
      address_line1: z.string().min(1, "Address is required"),
      city: z.string().optional(),
      country: z.string().optional()
    })).min(1, "At least one company address is required"),
    company_contacts: z.array(z.object({
      contact_name: z.string().min(1, "Contact name is required"),
      email: z.string().email("Valid email is required").optional(),
      phone: z.string().optional()
    })).min(1, "At least one contact is required")
  }),
  
  companies: z.object({
    company_name: z.string().min(1, "Customer company name is required")
  }),
  
  // Line items
  invoice_items: z.array(z.object({
    line_number: z.number().min(1, "Line number is required"),
    unit_price: z.number().min(0, "Unit price must be positive"),
    line_total: z.number().min(0, "Line total must be positive"),
    inventory: z.object({
      pn_master_table: z.object({
        pn: z.string().min(1, "Part number is required"),
        description: z.string().optional()
      }),
      quantity: z.number().min(1, "Quantity must be at least 1"),
      condition: z.string().optional(),
      serial_number: z.string().optional()
    })
  })).min(1, "At least one line item is required"),
  
  // Optional but recommended
  customer_po_number: z.string().optional(),
  payment_terms: z.string().optional(),
  remarks: z.string().optional()
})

// Purchase Order validation schema
const purchaseOrderDocumentSchema = z.object({
  po_number: z.string().min(1, "PO number is required"),
  po_date: z.string().min(1, "PO date is required"),
  currency: z.string().min(1, "Currency is required"),
  total_amount: z.number().min(0, "Total amount must be positive"),
  
  my_companies: z.object({
    my_company_name: z.string().min(1, "Company name is required"),
    company_addresses: z.array(z.object({
      address_line1: z.string().min(1, "Address is required")
    })).min(1, "Company address is required")
  }),
  
  companies: z.object({
    company_name: z.string().min(1, "Vendor company name is required")
  }),
  
  purchase_order_items: z.array(z.object({
    line_number: z.number().min(1, "Line number is required"),
    unit_price: z.number().min(0, "Unit price must be positive"),
    line_total: z.number().min(0, "Line total must be positive"),
    pn_master_table: z.object({
      pn: z.string().min(1, "Part number is required")
    }),
    quantity: z.number().min(1, "Quantity must be at least 1")
  })).min(1, "At least one line item is required")
})

/**
 * Validate Invoice document for PDF generation
 */
export function validateInvoiceDocument(data: any, aviationCompliance?: any): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  const requiredFields: FieldValidation[] = []
  const optionalFields: FieldValidation[] = []

  // Validate required fields using Zod
  try {
    invoiceDocumentSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        errors.push({
          field: err.path.join('.'),
          message: err.message,
          severity: 'critical',
          category: 'required'
        })
      })
    }
  }

  // Validate aviation compliance if provided
  if (aviationCompliance) {
    try {
      aviationComplianceSchema.parse(aviationCompliance)
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          errors.push({
            field: `aviation.${err.path.join('.')}`,
            message: err.message,
            severity: 'high',
            category: 'compliance'
          })
        })
      }
    }

    // Business rule validations for aviation compliance
    if (aviationCompliance.traceableToAirline && !aviationCompliance.traceableToMSN) {
      warnings.push({
        field: 'aviation.traceableToMSN',
        message: 'MSN not provided with airline traceability',
        recommendation: 'Add MSN for complete traceability documentation',
        category: 'compliance'
      })
    }

    if (aviationCompliance.lastCertificate && !aviationCompliance.certificateAuthority) {
      warnings.push({
        field: 'aviation.certificateAuthority',
        message: 'Certificate authority not specified',
        recommendation: 'Add certificate authority for complete certification info',
        category: 'compliance'
      })
    }
  }

  // Business rule validations
  if (data.invoice_items) {
    // Check for missing descriptions
    data.invoice_items.forEach((item: any, index: number) => {
      if (!item.inventory?.pn_master_table?.description?.trim()) {
        warnings.push({
          field: `invoice_items.${index}.description`,
          message: 'Part description missing',
          recommendation: 'Add part description for better documentation',
          category: 'completeness'
        })
      }

      if (!item.inventory?.serial_number?.trim() && item.inventory?.condition !== 'new') {
        warnings.push({
          field: `invoice_items.${index}.serial_number`,
          message: 'Serial number missing for used/refurbished part',
          recommendation: 'Add serial number for traceability',
          category: 'compliance'
        })
      }
    })
  }

  // Check for bank details if high value
  if (data.total_net > 10000 && (!data.my_companies?.company_bank_details?.length)) {
    warnings.push({
      field: 'my_companies.company_bank_details',
      message: 'Bank details missing for high-value invoice',
      recommendation: 'Add wire transfer details for payment processing',
      category: 'best_practice'
    })
  }

  // Calculate completeness score
  const totalChecks = 20 // Adjust based on total validation checks
  const passedChecks = totalChecks - errors.length - (warnings.length * 0.5)
  const completenessScore = Math.max(0, Math.min(100, (passedChecks / totalChecks) * 100))

  // Build field validation arrays
  buildFieldValidations(data, aviationCompliance, requiredFields, optionalFields)

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    completenessScore: Math.round(completenessScore),
    requiredFields,
    optionalFields
  }
}

/**
 * Validate Purchase Order document for PDF generation
 */
export function validatePurchaseOrderDocument(data: any, aviationCompliance?: any): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  const requiredFields: FieldValidation[] = []
  const optionalFields: FieldValidation[] = []

  // Validate required fields
  try {
    purchaseOrderDocumentSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        errors.push({
          field: err.path.join('.'),
          message: err.message,
          severity: 'critical',
          category: 'required'
        })
      })
    }
  }

  // Aviation compliance validation (same as invoice)
  if (aviationCompliance) {
    try {
      aviationComplianceSchema.parse(aviationCompliance)
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          errors.push({
            field: `aviation.${err.path.join('.')}`,
            message: err.message,
            severity: 'high',
            category: 'compliance'
          })
        })
      }
    }
  }

  // Calculate completeness score
  const totalChecks = 15
  const passedChecks = totalChecks - errors.length - (warnings.length * 0.5)
  const completenessScore = Math.max(0, Math.min(100, (passedChecks / totalChecks) * 100))

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    completenessScore: Math.round(completenessScore),
    requiredFields,
    optionalFields
  }
}

/**
 * Build field validation arrays for UI display
 */
function buildFieldValidations(
  data: any, 
  aviationCompliance: any, 
  requiredFields: FieldValidation[], 
  optionalFields: FieldValidation[]
) {
  // Required fields
  const required = [
    { field: 'invoice_number', display: 'Invoice Number', value: data.invoice_number },
    { field: 'invoice_date', display: 'Invoice Date', value: data.invoice_date },
    { field: 'currency', display: 'Currency', value: data.currency },
    { field: 'total_net', display: 'Total Amount', value: data.total_net },
    { field: 'my_companies.my_company_name', display: 'Company Name', value: data.my_companies?.my_company_name },
    { field: 'companies.company_name', display: 'Customer Name', value: data.companies?.company_name },
    { field: 'invoice_items', display: 'Line Items', value: data.invoice_items?.length || 0 }
  ]

  required.forEach(field => {
    const isPresent = field.value !== undefined && field.value !== null && field.value !== ''
    requiredFields.push({
      fieldName: field.field,
      displayName: field.display,
      isPresent,
      value: field.value,
      isValid: isPresent,
      errorMessage: !isPresent ? `${field.display} is required` : undefined
    })
  })

  // Optional but recommended fields
  const optional = [
    { field: 'customer_po_number', display: 'Customer PO Number', value: data.customer_po_number },
    { field: 'payment_terms', display: 'Payment Terms', value: data.payment_terms },
    { field: 'remarks', display: 'Remarks', value: data.remarks },
    { field: 'aviation.obtainedFrom', display: 'Aviation Source', value: aviationCompliance?.obtainedFrom },
    { field: 'aviation.originCountry', display: 'Origin Country', value: aviationCompliance?.originCountry },
    { field: 'aviation.lastCertificate', display: 'Last Certificate', value: aviationCompliance?.lastCertificate }
  ]

  optional.forEach(field => {
    const isPresent = field.value !== undefined && field.value !== null && field.value !== ''
    optionalFields.push({
      fieldName: field.field,
      displayName: field.display,
      isPresent,
      value: field.value,
      isValid: true // Optional fields are always valid
    })
  })
}

/**
 * Get validation summary for UI display
 */
export function getValidationSummary(result: ValidationResult): {
  status: 'ready' | 'warnings' | 'errors'
  message: string
  canGenerate: boolean
} {
  if (result.errors.length > 0) {
    return {
      status: 'errors',
      message: `${result.errors.length} critical errors must be fixed before PDF generation`,
      canGenerate: false
    }
  }

  if (result.warnings.length > 0) {
    return {
      status: 'warnings',
      message: `Document ready with ${result.warnings.length} recommendations for improvement`,
      canGenerate: true
    }
  }

  return {
    status: 'ready',
    message: 'Document is complete and ready for PDF generation',
    canGenerate: true
  }
}

/**
 * Export validation types
 */
export type DocumentType = 'invoice' | 'purchase_order' | 'repair_order'