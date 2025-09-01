'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  FileText, 
  ChevronDown, 
  Download,
  AlertTriangle,
  Info
} from 'lucide-react'
import { 
  ValidationResult, 
  ValidationError, 
  ValidationWarning, 
  FieldValidation,
  validateInvoiceDocument,
  validatePurchaseOrderDocument,
  getValidationSummary,
  type DocumentType
} from '@/lib/validation/pdf-document-validation'

interface PDFValidationPanelProps {
  documentData: any
  aviationCompliance?: any
  documentType: DocumentType
  onGeneratePDF: () => void
  className?: string
}

export default function PDFValidationPanel({
  documentData,
  aviationCompliance,
  documentType,
  onGeneratePDF,
  className = ""
}: PDFValidationPanelProps) {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [isValidating, setIsValidating] = useState(false)

  const validateDocument = useCallback(async () => {
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
        default:
          throw new Error(`Unsupported document type: ${documentType}`)
      }
      
      setValidationResult(result)
    } catch (error) {
      console.error('Validation error:', error)
      // Create error result
      setValidationResult({
        isValid: false,
        errors: [{
          field: 'system',
          message: 'Validation system error',
          severity: 'critical',
          category: 'required'
        }],
        warnings: [],
        completenessScore: 0,
        requiredFields: [],
        optionalFields: []
      })
    } finally {
      setIsValidating(false)
    }
  }, [documentData, aviationCompliance, documentType]);

  // Run validation when data changes
  useEffect(() => {
    if (documentData) {
      validateDocument()
    }
  }, [documentData, aviationCompliance, documentType, validateDocument])

  if (!validationResult || isValidating) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document Validation
          </CardTitle>
          <CardDescription>
            Checking document completeness for PDF generation...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const summary = getValidationSummary(validationResult)
  const StatusIcon = summary.status === 'ready' ? CheckCircle : 
                    summary.status === 'warnings' ? AlertTriangle : XCircle
  const statusColor = summary.status === 'ready' ? 'text-green-600' : 
                     summary.status === 'warnings' ? 'text-yellow-600' : 'text-red-600'

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Document Validation
        </CardTitle>
        <CardDescription>
          Document completeness: {validationResult.completenessScore}%
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Validation Summary */}
        <Alert variant={summary.status === 'errors' ? 'destructive' : 'default'}>
          <StatusIcon className={`h-4 w-4 ${statusColor}`} />
          <AlertDescription>
            {summary.message}
          </AlertDescription>
        </Alert>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Completeness Score</span>
            <span className="font-medium">{validationResult.completenessScore}%</span>
          </div>
          <Progress 
            value={validationResult.completenessScore} 
            className="h-2"
          />
        </div>

        {/* Critical Errors */}
        {validationResult.errors.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-red-600 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Critical Issues ({validationResult.errors.length})
            </h4>
            <div className="space-y-1">
              {validationResult.errors.slice(0, 3).map((error, index) => (
                <div key={index} className="text-sm p-2 bg-red-50 border border-red-200 rounded">
                  <div className="font-medium text-red-800">{error.field}</div>
                  <div className="text-red-600">{error.message}</div>
                </div>
              ))}
              {validationResult.errors.length > 3 && (
                <div className="text-sm text-red-600">
                  +{validationResult.errors.length - 3} more errors
                </div>
              )}
            </div>
          </div>
        )}

        {/* Warnings */}
        {validationResult.warnings.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-yellow-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Recommendations ({validationResult.warnings.length})
            </h4>
            <div className="space-y-1">
              {validationResult.warnings.slice(0, 2).map((warning, index) => (
                <div key={index} className="text-sm p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <div className="font-medium text-yellow-800">{warning.field}</div>
                  <div className="text-yellow-600">{warning.message}</div>
                  <div className="text-yellow-600 text-xs mt-1">💡 {warning.recommendation}</div>
                </div>
              ))}
              {validationResult.warnings.length > 2 && (
                <div className="text-sm text-yellow-600">
                  +{validationResult.warnings.length - 2} more recommendations
                </div>
              )}
            </div>
          </div>
        )}

        {/* Field Status Summary */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div className="font-medium">Required Fields</div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {validationResult.requiredFields.filter(f => f.isValid).length}/{validationResult.requiredFields.length}
              </Badge>
              <span className="text-slate-600">Complete</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="font-medium">Optional Fields</div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {validationResult.optionalFields.filter(f => f.isPresent).length}/{validationResult.optionalFields.length}
              </Badge>
              <span className="text-slate-600">Provided</span>
            </div>
          </div>
        </div>

        {/* Detailed Field Status */}
        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-sm font-medium hover:bg-slate-50 rounded">
            <span>Field Details</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 mt-2">
            
            {/* Required Fields Detail */}
            <div className="space-y-2">
              <h5 className="font-medium text-sm text-slate-700">Required Fields</h5>
              <div className="space-y-1">
                {validationResult.requiredFields.map((field, index) => (
                  <div key={index} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded">
                    <div className="flex items-center gap-2">
                      {field.isValid ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-600" />
                      )}
                      <span>{field.displayName}</span>
                    </div>
                    <div className="text-slate-500">
                      {field.isPresent ? '✓' : '✗'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Optional Fields Detail */}
            <div className="space-y-2">
              <h5 className="font-medium text-sm text-slate-700">Optional Fields</h5>
              <div className="space-y-1">
                {validationResult.optionalFields.map((field, index) => (
                  <div key={index} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded">
                    <div className="flex items-center gap-2">
                      <Info className="h-3 w-3 text-blue-600" />
                      <span>{field.displayName}</span>
                    </div>
                    <div className="text-slate-500">
                      {field.isPresent ? '✓' : '○'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={onGeneratePDF}
            disabled={!summary.canGenerate}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Generate PDF
          </Button>
          <Button
            variant="outline"
            onClick={validateDocument}
            size="sm"
          >
            Re-validate
          </Button>
        </div>

        {/* Generation Warning */}
        {!summary.canGenerate && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              PDF generation is blocked due to critical validation errors. Please fix the issues above and try again.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}