'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Shield, 
  FileText, 
  Award, 
  CheckCircle, 
  Info,
  ArrowLeft,
  Sparkles
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CompliancePackageBuilder } from '@/components/compliance'
import { CompliancePackageResult, PartTraceabilityData, ComplianceData } from '@/lib/compliance-package-generator'
import { toast } from 'sonner'

interface CompanyData {
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
    phone: string | null
    email: string | null
  }>
}

interface InventoryPart {
  serial_number: string | null
  condition: string | null
  quantity: number | null
  traceability_source: string | null
  traceable_to: string | null
  last_certified_agency: string | null
  part_status_certification: string | null
  pn_master_table: {
    pn: string
    description: string | null
  }
}

interface FullTracePaperworkPageProps {
  companyData: CompanyData | null
  recentParts: InventoryPart[]
}

export default function FullTracePaperworkPage({ 
  companyData, 
  recentParts = [] 
}: FullTracePaperworkPageProps) {
  const router = useRouter()
  const [showBuilder, setShowBuilder] = useState(false)
  const [generatedPackages, setGeneratedPackages] = useState<CompliancePackageResult[]>([])

  // Prepare initial compliance data from company information
  const initialComplianceData = useMemo((): Partial<ComplianceData> => {
    if (!companyData) return {}

    const primaryAddress = companyData.company_addresses?.[0]
    const primaryContact = companyData.company_contacts?.[0]

    return {
      companyInfo: {
        name: companyData.my_company_name || 'TASAVIA',
        code: companyData.my_company_code || 'TAS',
        address: primaryAddress ? 
          `${primaryAddress.address_line1}${primaryAddress.address_line2 ? ', ' + primaryAddress.address_line2 : ''}, ${primaryAddress.city}, ${primaryAddress.country}` 
          : '',
        phone: primaryContact?.phone || '',
        email: primaryContact?.email || '',
        certifications: ['AS9100', 'AS9120', 'EASA.145']
      }
    }
  }, [companyData])

  // Convert recent parts to suggested parts format
  const suggestedParts = useMemo((): Partial<PartTraceabilityData>[] => {
    return recentParts.slice(0, 3).map(part => ({
      partNumber: part.pn_master_table.pn,
      serialNumber: part.serial_number || '',
      description: part.pn_master_table.description || '',
      condition: (part.condition as any) || 'new',
      quantity: part.quantity || 1,
      traceabilitySource: part.traceability_source || '',
      traceableTo: part.traceable_to || '',
      lastCertifiedAgency: part.last_certified_agency || '',
      partStatusCertification: part.part_status_certification || ''
    }))
  }, [recentParts])

  const handlePackageGenerated = (result: CompliancePackageResult) => {
    if (result.success) {
      setGeneratedPackages(prev => [result, ...prev])
      toast.success('Full trace paperwork package generated successfully!')
    }
  }

  const features = [
    {
      icon: Shield,
      title: 'Complete Traceability',
      description: 'Full chain of custody documentation from manufacturer to end user',
      badges: ['8130-3', 'EASA Form 1']
    },
    {
      icon: Award,
      title: 'Regulatory Compliance',
      description: 'Meets EASA, FAA, and other international aviation standards',
      badges: ['AS9100', 'AS9120']
    },
    {
      icon: FileText,
      title: 'Professional Documentation',
      description: 'Industry-standard certificates and test reports',
      badges: ['PDF/A', 'Signed']
    }
  ]

  const documentTypes = [
    'Authorized Release Certificate (8130-3 style)',
    'Certificate of Conformity',
    'Material Test Report',
    'Quality Certificate',
    'Packing Slip',
    'Export Certificate'
  ]

  if (showBuilder) {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => setShowBuilder(false)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Overview
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Full Trace Paperwork Generator</h1>
                <p className="text-slate-600">Create complete aviation compliance documentation packages</p>
              </div>
            </div>
          </div>
        </div>

        {/* Builder */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <CompliancePackageBuilder
            initialParts={suggestedParts}
            initialComplianceData={initialComplianceData}
            onPackageGenerated={handlePackageGenerated}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Shield className="h-8 w-8" />
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  Aviation Compliance
                </Badge>
              </div>
              <h1 className="text-4xl font-bold mb-4">Full Trace Paperwork</h1>
              <p className="text-xl text-blue-100 max-w-2xl">
                Generate complete aviation compliance documentation packages with full traceability,
                conformity certificates, and regulatory compliance.
              </p>
            </div>
            <div className="hidden md:block">
              <Sparkles className="h-32 w-32 text-blue-200/30" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 -mt-8 relative z-10 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">6+</div>
              <div className="text-sm text-slate-600">Document Types</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">100%</div>
              <div className="text-sm text-slate-600">Compliant</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">{generatedPackages.length}</div>
              <div className="text-sm text-slate-600">Generated</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600 mb-1">{recentParts.length}</div>
              <div className="text-sm text-slate-600">Ready Parts</div>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {features.map((feature, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <feature.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-slate-600 text-sm mb-3">{feature.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {feature.badges.map((badge, badgeIndex) => (
                        <Badge key={badgeIndex} variant="secondary" className="text-xs">
                          {badge}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Action */}
        <Card className="mb-8">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Generate Full Trace Paperwork</CardTitle>
            <CardDescription>
              Create comprehensive aviation compliance documentation for your parts and orders
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            
            {/* Quick Start Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Start Fresh</h4>
                <p className="text-sm text-slate-600 mb-4">
                  Begin with empty forms and enter all part and compliance information manually
                </p>
                <Button 
                  onClick={() => setShowBuilder(true)}
                  variant="outline"
                  className="w-full"
                >
                  Create New Package
                </Button>
              </div>

              {recentParts.length > 0 && (
                <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                  <h4 className="font-medium mb-2">Use Recent Parts</h4>
                  <p className="text-sm text-slate-600 mb-4">
                    Pre-fill with {Math.min(3, recentParts.length)} recent parts from your inventory
                  </p>
                  <Button 
                    onClick={() => setShowBuilder(true)}
                    className="w-full"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Quick Start
                  </Button>
                </div>
              )}
            </div>

            {/* Information Alert */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                The generated documentation package will include all necessary certificates and reports
                for full aviation compliance and traceability requirements.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Document Types */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Included Document Types</CardTitle>
            <CardDescription>
              Professional aviation compliance documents generated automatically
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {documentTypes.map((docType, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">{docType}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Packages */}
        {generatedPackages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recently Generated Packages</CardTitle>
              <CardDescription>
                Previously created compliance documentation packages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {generatedPackages.map((pkg, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="font-medium">Compliance Package #{index + 1}</div>
                        <div className="text-sm text-slate-600">
                          {pkg.documents.length} documents, {pkg.totalPages} pages
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary">Generated</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="mt-8 text-center">
          <Link href="/portal">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Portal
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}