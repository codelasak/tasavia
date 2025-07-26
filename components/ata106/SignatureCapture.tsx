'use client'

import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Pen, 
  RotateCcw, 
  Check, 
  X, 
  User, 
  Calendar,
  FileText,
  Shield
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export interface SignatureData {
  signature_data: string  // Base64 encoded signature image
  signer_name: string
  signer_title: string
  signature_date: Date
  certificate_number?: string
  ip_address?: string
  user_agent?: string
}

interface SignatureCaptureProps {
  title: string
  description?: string
  required?: boolean
  onSignatureChange?: (signatureData: SignatureData | null) => void
  existingSignature?: SignatureData
  disabled?: boolean
  className?: string
  canvasProps?: {
    width?: number
    height?: number
    backgroundColor?: string
    penColor?: string
  }
}

export interface SignatureCaptureRef {
  clear: () => void
  isEmpty: () => boolean
  getSignatureData: () => SignatureData | null
  validateSignature: () => boolean
}

const SignatureCapture = forwardRef<SignatureCaptureRef, SignatureCaptureProps>(({
  title,
  description,
  required = false,
  onSignatureChange,
  existingSignature,
  disabled = false,
  className,
  canvasProps = {}
}, ref) => {
  const sigCanvas = useRef<SignatureCanvas>(null)
  const [signerName, setSignerName] = useState(existingSignature?.signer_name || '')
  const [signerTitle, setSignerTitle] = useState(existingSignature?.signer_title || '')
  const [certificateNumber, setCertificateNumber] = useState(existingSignature?.certificate_number || '')
  const [hasSignature, setHasSignature] = useState(false)
  const [isSignatureDirty, setIsSignatureDirty] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const defaultCanvasProps = {
    width: 400,
    height: 150,
    backgroundColor: '#ffffff',
    penColor: '#000000',
    ...canvasProps
  }

  useEffect(() => {
    if (existingSignature) {
      setHasSignature(true)
      // Load existing signature if available
      if (existingSignature.signature_data && sigCanvas.current) {
        const img = new Image()
        img.onload = () => {
          const canvas = sigCanvas.current?.getCanvas()
          const ctx = canvas?.getContext('2d')
          if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            setHasSignature(true)
          }
        }
        img.src = existingSignature.signature_data
      }
    }
  }, [existingSignature])

  const validateSignature = (): boolean => {
    const errors: string[] = []

    if (!signerName.trim()) {
      errors.push('Signer name is required')
    }

    if (!signerTitle.trim()) {
      errors.push('Signer title/position is required')
    }

    if (!hasSignature || sigCanvas.current?.isEmpty()) {
      errors.push('Digital signature is required')
    }

    setValidationErrors(errors)
    return errors.length === 0
  }

  const handleSignatureEnd = () => {
    const isEmpty = sigCanvas.current?.isEmpty()
    setHasSignature(!isEmpty)
    setIsSignatureDirty(true)
    
    if (!isEmpty) {
      notifySignatureChange()
    }
  }

  const handleClearSignature = () => {
    sigCanvas.current?.clear()
    setHasSignature(false)
    setIsSignatureDirty(false)
    setValidationErrors([])
    onSignatureChange?.(null)
    toast.info('Signature cleared')
  }

  const notifySignatureChange = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty() && signerName && signerTitle) {
      const signatureData: SignatureData = {
        signature_data: sigCanvas.current?.toDataURL() || '',
        signer_name: signerName,
        signer_title: signerTitle,
        signature_date: new Date(),
        certificate_number: certificateNumber || undefined,
        ip_address: undefined, // Would be set server-side
        user_agent: navigator.userAgent,
      }
      onSignatureChange?.(signatureData)
    }
  }

  const handleFieldChange = (field: string, value: string) => {
    switch (field) {
      case 'name':
        setSignerName(value)
        break
      case 'title':
        setSignerTitle(value)
        break
      case 'certificate':
        setCertificateNumber(value)
        break
    }

    // Clear validation errors when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors([])
    }

    // Notify parent if we have all required fields and signature
    setTimeout(() => {
      if (hasSignature && !sigCanvas.current?.isEmpty()) {
        notifySignatureChange()
      }
    }, 100)
  }

  // Expose methods through ref
  useImperativeHandle(ref, () => ({
    clear: handleClearSignature,
    isEmpty: () => !hasSignature || sigCanvas.current?.isEmpty() === true,
    getSignatureData: () => {
      if (!hasSignature || sigCanvas.current?.isEmpty() || !signerName || !signerTitle) {
        return null
      }
      return {
        signature_data: sigCanvas.current?.toDataURL() || '',
        signer_name: signerName,
        signer_title: signerTitle,
        signature_date: new Date(),
        certificate_number: certificateNumber || undefined,
        ip_address: undefined,
        user_agent: navigator.userAgent,
      }
    },
    validateSignature,
  }))

  return (
    <Card className={cn("relative", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">{title}</CardTitle>
            {required && <Badge variant="outline" className="text-red-600">Required</Badge>}
          </div>
          {hasSignature && (
            <Badge className="bg-green-100 text-green-800">
              <Check className="h-3 w-3 mr-1" />
              Signed
            </Badge>
          )}
        </div>
        {description && (
          <p className="text-sm text-gray-600">{description}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Signer Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`${title.toLowerCase()}_name`}>
              Authorized Representative Name *
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id={`${title.toLowerCase()}_name`}
                value={signerName}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="Enter full name..."
                disabled={disabled}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${title.toLowerCase()}_title`}>
              Title/Position *
            </Label>
            <Input
              id={`${title.toLowerCase()}_title`}
              value={signerTitle}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              placeholder="e.g., Quality Manager, Director..."
              disabled={disabled}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor={`${title.toLowerCase()}_certificate`}>
              Certificate/License Number
              <span className="text-xs text-gray-500 ml-1">(Optional)</span>
            </Label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id={`${title.toLowerCase()}_certificate`}
                value={certificateNumber}
                onChange={(e) => handleFieldChange('certificate', e.target.value)}
                placeholder="Enter certificate or license number..."
                disabled={disabled}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Signature Canvas */}
        <div className="space-y-2">
          <Label>Digital Signature *</Label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
            <div className="text-center mb-4">
              <Pen className="h-6 w-6 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">
                {hasSignature ? 'Signature captured' : 'Sign in the box below using your mouse or touch'}
              </p>
            </div>
            
            <div className="flex justify-center">
              <div className="border border-gray-300 rounded bg-white">
                <SignatureCanvas
                  ref={sigCanvas}
                  canvasProps={{
                    width: defaultCanvasProps.width,
                    height: defaultCanvasProps.height,
                    className: 'signature-canvas',
                    style: { 
                      border: 'none',
                      borderRadius: '4px'
                    }
                  }}
                  backgroundColor={defaultCanvasProps.backgroundColor}
                  penColor={defaultCanvasProps.penColor}
                  onEnd={handleSignatureEnd}
                  dotSize={1}
                  minWidth={0.5}
                  maxWidth={2.5}
                  throttle={16}
                  minDistance={5}
                  velocityFilterWeight={0.7}
                />
              </div>
            </div>

            <div className="flex justify-center space-x-2 mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearSignature}
                disabled={disabled}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        </div>

        {/* Signature Timestamp */}
        {hasSignature && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-sm text-blue-800">
              <Calendar className="h-4 w-4" />
              <span>
                Signature timestamp: {format(new Date(), 'PPP p')}
              </span>
            </div>
          </div>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <X className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="font-medium mb-1">Signature Incomplete</div>
              <ul className="text-sm space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Compliance Notice */}
        <Alert className="border-blue-200 bg-blue-50">
          <Shield className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 text-sm">
            <strong>Legal Notice:</strong> By signing this document, you certify that the information 
            provided is accurate and complete to the best of your knowledge. This digital signature 
            has the same legal effect as a handwritten signature under applicable electronic signature laws.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
})

SignatureCapture.displayName = 'SignatureCapture'

export default SignatureCapture