'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  ValidationResult,
  validateInvoiceDocument,
  validatePurchaseOrderDocument,
  getValidationSummary,
  type DocumentType
} from '@/lib/validation/pdf-document-validation'

interface UsePDFValidationOptions {
  documentData: any
  aviationCompliance?: any
  documentType: DocumentType
  autoValidate?: boolean
}

interface UsePDFValidationReturn {
  validationResult: ValidationResult | null
  isValidating: boolean
  canGeneratePDF: boolean
  completenessScore: number
  errorCount: number
  warningCount: number
  summary: {
    status: 'ready' | 'warnings' | 'errors'
    message: string
    canGenerate: boolean
  }
  validate: () => Promise<ValidationResult>
  reset: () => void
}

/**
 * Custom hook for PDF document validation
 * Provides validation state management and consistent interface
 */
export function usePDFValidation({
  documentData,
  aviationCompliance,
  documentType,
  autoValidate = true
}: UsePDFValidationOptions): UsePDFValidationReturn {
  
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  // Validate document
  const validate = useCallback(async (): Promise<ValidationResult> => {
    if (!documentData) {
      throw new Error('No document data provided for validation')
    }

    setIsValidating(true)
    
    try {
      let result: ValidationResult

      switch (documentType) {
        case 'invoice':
          result = validateInvoiceDocument(documentData, aviationCompliance)
          break
        case 'purchase_order':
          result = validatePurchaseOrderDocument(documentData, aviationCompliance)
          break
        case 'repair_order':
          // For now, use invoice validation as base - can be extended later
          result = validateInvoiceDocument(documentData, aviationCompliance)
          break
        default:
          throw new Error(`Unsupported document type: ${documentType}`)
      }

      setValidationResult(result)
      return result
      
    } catch (error) {
      console.error('PDF validation error:', error)
      
      const errorResult: ValidationResult = {
        isValid: false,
        errors: [{
          field: 'system',
          message: error instanceof Error ? error.message : 'Unknown validation error',
          severity: 'critical',
          category: 'required'
        }],
        warnings: [],
        completenessScore: 0,
        requiredFields: [],
        optionalFields: []
      }
      
      setValidationResult(errorResult)
      return errorResult
      
    } finally {
      setIsValidating(false)
    }
  }, [documentData, aviationCompliance, documentType])

  // Reset validation state
  const reset = useCallback(() => {
    setValidationResult(null)
    setIsValidating(false)
  }, [])

  // Auto-validate when dependencies change
  useEffect(() => {
    if (autoValidate && documentData) {
      validate()
    }
  }, [validate, autoValidate, documentData])

  // Compute derived values
  const summary = validationResult ? getValidationSummary(validationResult) : {
    status: 'errors' as const,
    message: 'Document not validated',
    canGenerate: false
  }

  const canGeneratePDF = validationResult ? summary.canGenerate : false
  const completenessScore = validationResult?.completenessScore || 0
  const errorCount = validationResult?.errors.length || 0
  const warningCount = validationResult?.warnings.length || 0

  return {
    validationResult,
    isValidating,
    canGeneratePDF,
    completenessScore,
    errorCount,
    warningCount,
    summary,
    validate,
    reset
  }
}

/**
 * Helper hook for validation status display
 */
export function useValidationStatus(validationResult: ValidationResult | null) {
  if (!validationResult) {
    return {
      icon: '⏳',
      color: 'text-slate-500',
      bgColor: 'bg-slate-100',
      label: 'Pending'
    }
  }

  if (validationResult.errors.length > 0) {
    return {
      icon: '❌',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      label: 'Errors'
    }
  }

  if (validationResult.warnings.length > 0) {
    return {
      icon: '⚠️',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      label: 'Warnings'
    }
  }

  return {
    icon: '✅',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Ready'
  }
}

/**
 * Helper hook for validation metrics
 */
export function useValidationMetrics(validationResult: ValidationResult | null) {
  if (!validationResult) {
    return {
      completenessPercentage: 0,
      requiredFieldsComplete: 0,
      totalRequiredFields: 0,
      optionalFieldsProvided: 0,
      totalOptionalFields: 0,
      criticalIssues: 0,
      recommendations: 0
    }
  }

  const requiredFieldsComplete = validationResult.requiredFields.filter(f => f.isValid).length
  const totalRequiredFields = validationResult.requiredFields.length
  const optionalFieldsProvided = validationResult.optionalFields.filter(f => f.isPresent).length
  const totalOptionalFields = validationResult.optionalFields.length

  return {
    completenessPercentage: validationResult.completenessScore,
    requiredFieldsComplete,
    totalRequiredFields,
    optionalFieldsProvided,
    totalOptionalFields,
    criticalIssues: validationResult.errors.length,
    recommendations: validationResult.warnings.length
  }
}