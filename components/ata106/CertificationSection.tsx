'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  Save, 
  FileText,
  Clock,
  User
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import SignatureCapture, { 
  type SignatureData, 
  type SignatureCaptureRef 
} from './SignatureCapture'

interface CertificationSectionProps {
  salesOrderData: any
  onCertificationChange?: (certificationData: CertificationData) => void
  existingCertification?: CertificationData
  readOnly?: boolean
  className?: string
}

export interface CertificationData {
  transferor_signature?: SignatureData
  transferee_signature?: SignatureData
  certification_status: 'draft' | 'pending_transferee' | 'completed'
  last_updated: Date
  form_version: string
}

export default function CertificationSection({
  salesOrderData,
  onCertificationChange,
  existingCertification,
  readOnly = false,
  className
}: CertificationSectionProps) {
  const [certificationData, setCertificationData] = useState<CertificationData>(
    existingCertification || {
      certification_status: 'draft',
      last_updated: new Date(),
      form_version: '1.0'
    }
  )
  
  const [isSaving, setIsSaving] = useState(false)
  const transferorSigRef = useRef<SignatureCaptureRef>(null)
  const transfereeSigRef = useRef<SignatureCaptureRef>(null)

  // Calculate completion status
  const getCompletionStatus = () => {
    const hasTransferorSig = certificationData.transferor_signature != null
    const hasTransfereeSig = certificationData.transferee_signature != null
    
    if (hasTransferorSig && hasTransfereeSig) {
      return { status: 'completed', label: 'Fully Signed', color: 'green' }
    } else if (hasTransferorSig) {
      return { status: 'pending_transferee', label: 'Pending Transferee', color: 'yellow' }
    } else {
      return { status: 'draft', label: 'Draft', color: 'gray' }
    }
  }

  const completionStatus = getCompletionStatus()

  const handleTransferorSignature = (signatureData: SignatureData | null) => {
    const updatedData = {
      ...certificationData,
      transferor_signature: signatureData || undefined,
      last_updated: new Date(),
      certification_status: signatureData ? 
        (certificationData.transferee_signature ? 'completed' : 'pending_transferee') : 
        'draft'
    } as CertificationData

    setCertificationData(updatedData)
    onCertificationChange?.(updatedData)

    if (signatureData) {
      toast.success('Transferor signature captured')
    }
  }

  const handleTransfereeSignature = (signatureData: SignatureData | null) => {
    const updatedData = {
      ...certificationData,
      transferee_signature: signatureData || undefined,
      last_updated: new Date(),
      certification_status: signatureData && certificationData.transferor_signature ? 
        'completed' : 
        (certificationData.transferor_signature ? 'pending_transferee' : 'draft')
    } as CertificationData

    setCertificationData(updatedData)
    onCertificationChange?.(updatedData)

    if (signatureData) {
      toast.success('Transferee signature captured')
    }
  }

  const handleSaveCertification = async () => {
    // Validate signatures
    const transferorValid = transferorSigRef.current?.validateSignature() ?? false
    const transfereeValid = transfereeSigRef.current?.validateSignature() ?? false

    if (!transferorValid || !transfereeValid) {
      toast.error('Please complete all required signature fields')
      return
    }

    setIsSaving(true)
    
    try {
      // Here you would typically save to your backend
      // For now, we'll simulate the save
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success('Certification saved successfully')
    } catch (error) {
      console.error('Error saving certification:', error)
      toast.error('Failed to save certification')
    } finally {
      setIsSaving(false)
    }
  }

  const getStatusBadge = () => {
    switch (completionStatus.color) {
      case 'green':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            {completionStatus.label}
          </Badge>
        )
      case 'yellow':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {completionStatus.label}
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-gray-600">
            <FileText className="h-3 w-3 mr-1" />
            {completionStatus.label}
          </Badge>
        )
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <CardTitle>ATA 106 Certification & Digital Signatures</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge()}
            {!readOnly && (
              <Button
                onClick={handleSaveCertification}
                disabled={isSaving || completionStatus.status === 'draft'}
                size="sm"
              >
                <Save className="h-4 w-4 mr-1" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Certification Statement */}
        <Alert className="border-blue-200 bg-blue-50">
          <Shield className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <div className="font-medium mb-2">CERTIFICATION STATEMENT</div>
            <div className="text-sm leading-relaxed space-y-2">
              <p>
                I hereby certify that the information contained in this Aircraft Parts Traceability 
                Form is complete and accurate to the best of my knowledge and belief. The parts 
                described herein have been maintained in accordance with applicable airworthiness 
                regulations, manufacturer's instructions, and industry standards.
              </p>
              <p>
                This certification is made in compliance with ATA Specification 106 for Aircraft 
                Parts Traceability and applicable Federal Aviation Regulations (FAR) or equivalent 
                international aviation regulations.
              </p>
            </div>
          </AlertDescription>
        </Alert>

        {/* Form Information */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-gray-500" />
              <span className="font-medium">Form:</span>
              <span>ATA106-{salesOrderData.invoice_number}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="font-medium">Last Updated:</span>
              <span>{format(certificationData.last_updated, 'PPp')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-medium">Version:</span>
              <span>{certificationData.form_version}</span>
            </div>
          </div>
        </div>

        {/* Transferor Signature */}
        <div>
          <SignatureCapture
            ref={transferorSigRef}
            title="Transferor Certification"
            description={`Digital signature for ${salesOrderData.my_companies?.my_company_name || 'Transferor'}`}
            required
            onSignatureChange={handleTransferorSignature}
            existingSignature={certificationData.transferor_signature}
            disabled={readOnly}
          />
        </div>

        <Separator />

        {/* Transferee Signature */}
        <div>
          <SignatureCapture
            ref={transfereeSigRef}
            title="Transferee Acceptance"
            description={`Digital signature for ${salesOrderData.companies?.company_name || 'Transferee'}`}
            required
            onSignatureChange={handleTransfereeSignature}
            existingSignature={certificationData.transferee_signature}
            disabled={readOnly}
          />
        </div>

        {/* Completion Status */}
        {completionStatus.status === 'completed' && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <div className="font-medium">Form Fully Executed</div>
              <div className="text-sm mt-1">
                Both transferor and transferee signatures have been captured. This ATA 106 form 
                is now complete and ready for regulatory compliance.
              </div>
            </AlertDescription>
          </Alert>
        )}

        {completionStatus.status === 'pending_transferee' && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <div className="font-medium">Awaiting Transferee Signature</div>
              <div className="text-sm mt-1">
                The transferor has signed the form. The transferee signature is required to 
                complete the ATA 106 certification process.
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Legal Notice */}
        <Alert className="border-gray-200 bg-gray-50">
          <Shield className="h-4 w-4 text-gray-600" />
          <AlertDescription className="text-gray-700 text-sm">
            <div className="font-medium mb-1">Legal Notice & Record Retention</div>
            <div className="space-y-1">
              <p>
                <strong>Electronic Signatures:</strong> Digital signatures captured above have the 
                same legal effect as handwritten signatures under applicable electronic signature laws.
              </p>
              <p>
                <strong>Record Retention:</strong> This form and all supporting documentation must 
                be retained for the operational life of the aircraft or component, whichever is longer.
              </p>
              <p>
                <strong>Export Control:</strong> These parts may be subject to export control regulations. 
                Consult applicable laws before international transfer.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}