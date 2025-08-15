'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { 
  FileText, 
  Download, 
  Plus, 
  Trash2, 
  CheckCircle,
  AlertCircle,
  Settings,
  Package,
  Shield,
  Award,
  Plane,
  X
} from 'lucide-react'
import {
  CompliancePackageGenerator,
  PartTraceabilityData,
  ComplianceData,
  CompliancePackageOptions,
  CompliancePackageResult
} from '@/lib/compliance-package-generator'
import { toast } from 'sonner'

interface CompliancePackageBuilderProps {
  initialParts?: Partial<PartTraceabilityData>[]
  initialComplianceData?: Partial<ComplianceData>
  onPackageGenerated?: (result: CompliancePackageResult) => void
  className?: string
}

const defaultPart: PartTraceabilityData = {
  partNumber: '',
  serialNumber: '',
  description: '',
  manufacturer: '',
  manufacturerSerial: '',
  condition: 'new',
  quantity: 1,
  traceabilitySource: '',
  traceableTo: '',
  lastCertifiedAgency: '',
  partStatusCertification: '',
  tags: [],
  releaseDate: new Date().toISOString().split('T')[0],
  batchLot: ''
}

const defaultComplianceData: ComplianceData = {
  companyInfo: {
    name: 'TASAVIA',
    code: 'TAS',
    address: '',
    phone: '',
    email: '',
    certifications: ['AS9100', 'AS9120', 'EASA.145']
  },
  customerInfo: {
    name: '',
    address: '',
    contact: ''
  },
  orderInfo: {
    orderNumber: '',
    customerPO: '',
    date: new Date().toISOString().split('T')[0],
    reference: ''
  },
  aviationCompliance: {
    regulatoryBasis: ['EASA', 'FAA'],
    applicableStandards: ['AS9100', 'AS9120'],
    exportLicense: '',
    countryOfOrigin: 'Turkey',
    endUseCountry: '',
    dualUseGoods: false,
    restrictedParts: false
  }
}

export default function CompliancePackageBuilder({
  initialParts = [],
  initialComplianceData = {},
  onPackageGenerated,
  className = ""
}: CompliancePackageBuilderProps) {
  
  // State management
  const [parts, setParts] = useState<PartTraceabilityData[]>(() => 
    initialParts.length > 0 
      ? initialParts.map(part => ({ ...defaultPart, ...part })) 
      : [defaultPart]
  )
  
  const [complianceData, setComplianceData] = useState<ComplianceData>(() => ({
    ...defaultComplianceData,
    ...initialComplianceData,
    companyInfo: { ...defaultComplianceData.companyInfo, ...initialComplianceData.companyInfo },
    customerInfo: { ...defaultComplianceData.customerInfo, ...initialComplianceData.customerInfo },
    orderInfo: { ...defaultComplianceData.orderInfo, ...initialComplianceData.orderInfo },
    aviationCompliance: { ...defaultComplianceData.aviationCompliance, ...initialComplianceData.aviationCompliance }
  }))

  const [packageOptions, setPackageOptions] = useState<CompliancePackageOptions>({
    includeTraceabilityCertificate: true,
    includeConformityCertificate: true,
    includeAirworthinessCertificate: false,
    includeMaterialTestReport: true,
    includeFunctionalTestReport: false,
    includeQualityCertificate: true,
    includeExportCertificate: true,
    includePackingSlip: true,
    customCertificates: []
  })

  const [isGenerating, setIsGenerating] = useState(false)
  const [generationResult, setGenerationResult] = useState<CompliancePackageResult | null>(null)
  const [activeTab, setActiveTab] = useState('parts')

  // Part management functions
  const addPart = useCallback(() => {
    setParts(prev => [...prev, { ...defaultPart, partNumber: `PART-${prev.length + 1}` }])
  }, [])

  const removePart = useCallback((index: number) => {
    if (parts.length > 1) {
      setParts(prev => prev.filter((_, i) => i !== index))
    }
  }, [parts.length])

  const updatePart = useCallback((index: number, updates: Partial<PartTraceabilityData>) => {
    setParts(prev => prev.map((part, i) => i === index ? { ...part, ...updates } : part))
  }, [])

  // Compliance data update functions
  const updateComplianceData = useCallback((section: keyof ComplianceData, updates: any) => {
    setComplianceData(prev => ({
      ...prev,
      [section]: { ...prev[section], ...updates }
    }))
  }, [])

  // Package options update
  const updatePackageOptions = useCallback((updates: Partial<CompliancePackageOptions>) => {
    setPackageOptions(prev => ({ ...prev, ...updates }))
  }, [])

  // Generate compliance package
  const generatePackage = useCallback(async () => {
    // Validate required fields
    const missingFields: string[] = []
    
    if (!complianceData.orderInfo.orderNumber) missingFields.push('Order Number')
    if (!complianceData.customerInfo.name) missingFields.push('Customer Name')
    if (!complianceData.aviationCompliance.endUseCountry) missingFields.push('End Use Country')

    parts.forEach((part, index) => {
      if (!part.partNumber) missingFields.push(`Part ${index + 1} - Part Number`)
      if (!part.serialNumber) missingFields.push(`Part ${index + 1} - Serial Number`)
      if (!part.description) missingFields.push(`Part ${index + 1} - Description`)
    })

    if (missingFields.length > 0) {
      toast.error(`Missing required fields: ${missingFields.join(', ')}`)
      return
    }

    setIsGenerating(true)
    setGenerationResult(null)

    try {
      const generator = new CompliancePackageGenerator()
      const result = await generator.generateCompletePackage(
        parts,
        complianceData,
        packageOptions
      )

      setGenerationResult(result)

      if (result.success) {
        toast.success(`Successfully generated compliance package with ${result.documents.length} documents`)
        if (onPackageGenerated) {
          onPackageGenerated(result)
        }
      } else {
        toast.error('Failed to generate compliance package')
      }

    } catch (error) {
      console.error('Package generation error:', error)
      toast.error('An error occurred while generating the package')
      
      setGenerationResult({
        success: false,
        documents: [],
        totalPages: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsGenerating(false)
    }
  }, [parts, complianceData, packageOptions, onPackageGenerated])

  // Download package
  const downloadPackage = useCallback(() => {
    if (generationResult?.success && generationResult.mergedPackage) {
      const blob = new Blob([generationResult.mergedPackage], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `Compliance_Package_${complianceData.orderInfo.orderNumber}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      URL.revokeObjectURL(url)
    }
  }, [generationResult, complianceData.orderInfo.orderNumber])

  // Download individual document
  const downloadIndividualDocument = useCallback((doc: CompliancePackageResult['documents'][0]) => {
    const blob = new Blob([doc.arrayBuffer], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = doc.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
  }, [])

  const selectedDocumentCount = Object.values(packageOptions).filter(v => v === true).length

  return (
    <div className={`space-y-6 ${className}`}>
      
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Aviation Compliance Package Builder
          </CardTitle>
          <CardDescription>
            Generate complete aviation compliance documentation packages with traceability certificates,
            conformity declarations, and test reports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex space-x-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{parts.length}</p>
                <p className="text-sm text-slate-600">Parts</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{selectedDocumentCount}</p>
                <p className="text-sm text-slate-600">Documents</p>
              </div>
              {generationResult?.success && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{generationResult.totalPages}</p>
                  <p className="text-sm text-slate-600">Pages</p>
                </div>
              )}
            </div>
            <Button 
              onClick={generatePackage}
              disabled={isGenerating || parts.length === 0}
              size="lg"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Package className="h-4 w-4 mr-2" />
                  Generate Package
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="parts">Parts ({parts.length})</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="documents">Documents ({selectedDocumentCount})</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        {/* Parts Tab */}
        <TabsContent value="parts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Plane className="h-5 w-5" />
                    Part Traceability Data
                  </CardTitle>
                  <CardDescription>
                    Enter detailed information for each part requiring compliance documentation
                  </CardDescription>
                </div>
                <Button onClick={addPart} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Part
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {parts.map((part, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Part {index + 1}</h4>
                    {parts.length > 1 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removePart(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`part-${index}-number`}>Part Number *</Label>
                      <Input
                        id={`part-${index}-number`}
                        value={part.partNumber}
                        onChange={(e) => updatePart(index, { partNumber: e.target.value })}
                        placeholder="e.g., MS21919DG4"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`part-${index}-serial`}>Serial Number *</Label>
                      <Input
                        id={`part-${index}-serial`}
                        value={part.serialNumber}
                        onChange={(e) => updatePart(index, { serialNumber: e.target.value })}
                        placeholder="e.g., SN123456"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`part-${index}-condition`}>Condition</Label>
                      <Select 
                        value={part.condition} 
                        onValueChange={(value: any) => updatePart(index, { condition: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="used">Used</SelectItem>
                          <SelectItem value="overhauled">Overhauled</SelectItem>
                          <SelectItem value="repaired">Repaired</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor={`part-${index}-description`}>Description *</Label>
                      <Input
                        id={`part-${index}-description`}
                        value={part.description}
                        onChange={(e) => updatePart(index, { description: e.target.value })}
                        placeholder="e.g., Hydraulic Fitting, Straight"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`part-${index}-quantity`}>Quantity</Label>
                      <Input
                        id={`part-${index}-quantity`}
                        type="number"
                        min="1"
                        value={part.quantity}
                        onChange={(e) => updatePart(index, { quantity: parseInt(e.target.value) || 1 })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`part-${index}-manufacturer`}>Manufacturer</Label>
                      <Input
                        id={`part-${index}-manufacturer`}
                        value={part.manufacturer}
                        onChange={(e) => updatePart(index, { manufacturer: e.target.value })}
                        placeholder="e.g., Parker Hannifin"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`part-${index}-traceable-to`}>Traceable To</Label>
                      <Input
                        id={`part-${index}-traceable-to`}
                        value={part.traceableTo}
                        onChange={(e) => updatePart(index, { traceableTo: e.target.value })}
                        placeholder="e.g., Original Manufacturer"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`part-${index}-source`}>Traceability Source</Label>
                      <Input
                        id={`part-${index}-source`}
                        value={part.traceabilitySource}
                        onChange={(e) => updatePart(index, { traceabilitySource: e.target.value })}
                        placeholder="e.g., Factory New"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`part-${index}-agency`}>Last Certified Agency</Label>
                      <Input
                        id={`part-${index}-agency`}
                        value={part.lastCertifiedAgency}
                        onChange={(e) => updatePart(index, { lastCertifiedAgency: e.target.value })}
                        placeholder="e.g., EASA, FAA"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`part-${index}-certification`}>Part Status Certification</Label>
                      <Input
                        id={`part-${index}-certification`}
                        value={part.partStatusCertification}
                        onChange={(e) => updatePart(index, { partStatusCertification: e.target.value })}
                        placeholder="e.g., Airworthy"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-4">
          
          {/* Order Information */}
          <Card>
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="order-number">Order Number *</Label>
                <Input
                  id="order-number"
                  value={complianceData.orderInfo.orderNumber}
                  onChange={(e) => updateComplianceData('orderInfo', { orderNumber: e.target.value })}
                  placeholder="e.g., SO-2024-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer-po">Customer PO</Label>
                <Input
                  id="customer-po"
                  value={complianceData.orderInfo.customerPO}
                  onChange={(e) => updateComplianceData('orderInfo', { customerPO: e.target.value })}
                  placeholder="e.g., PO-123456"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="order-date">Order Date</Label>
                <Input
                  id="order-date"
                  type="date"
                  value={complianceData.orderInfo.date}
                  onChange={(e) => updateComplianceData('orderInfo', { date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">Reference</Label>
                <Input
                  id="reference"
                  value={complianceData.orderInfo.reference}
                  onChange={(e) => updateComplianceData('orderInfo', { reference: e.target.value })}
                  placeholder="Internal reference"
                />
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer-name">Customer Name *</Label>
                <Input
                  id="customer-name"
                  value={complianceData.customerInfo.name}
                  onChange={(e) => updateComplianceData('customerInfo', { name: e.target.value })}
                  placeholder="e.g., Turkish Airlines"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer-address">Customer Address</Label>
                <Textarea
                  id="customer-address"
                  value={complianceData.customerInfo.address}
                  onChange={(e) => updateComplianceData('customerInfo', { address: e.target.value })}
                  placeholder="Complete customer address"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer-contact">Contact Person</Label>
                <Input
                  id="customer-contact"
                  value={complianceData.customerInfo.contact}
                  onChange={(e) => updateComplianceData('customerInfo', { contact: e.target.value })}
                  placeholder="Contact person name and details"
                />
              </div>
            </CardContent>
          </Card>

          {/* Aviation Compliance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Aviation Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country-origin">Country of Origin</Label>
                  <Input
                    id="country-origin"
                    value={complianceData.aviationCompliance.countryOfOrigin}
                    onChange={(e) => updateComplianceData('aviationCompliance', { countryOfOrigin: e.target.value })}
                    placeholder="e.g., Turkey"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-use-country">End Use Country *</Label>
                  <Input
                    id="end-use-country"
                    value={complianceData.aviationCompliance.endUseCountry}
                    onChange={(e) => updateComplianceData('aviationCompliance', { endUseCountry: e.target.value })}
                    placeholder="e.g., Germany"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="export-license">Export License</Label>
                  <Input
                    id="export-license"
                    value={complianceData.aviationCompliance.exportLicense}
                    onChange={(e) => updateComplianceData('aviationCompliance', { exportLicense: e.target.value })}
                    placeholder="Export license number (if required)"
                  />
                </div>
              </div>

              <div className="flex space-x-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="dual-use"
                    checked={complianceData.aviationCompliance.dualUseGoods}
                    onCheckedChange={(checked) => 
                      updateComplianceData('aviationCompliance', { dualUseGoods: !!checked })
                    }
                  />
                  <Label htmlFor="dual-use">Dual Use Goods</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="restricted-parts"
                    checked={complianceData.aviationCompliance.restrictedParts}
                    onCheckedChange={(checked) => 
                      updateComplianceData('aviationCompliance', { restrictedParts: !!checked })
                    }
                  />
                  <Label htmlFor="restricted-parts">Restricted Parts</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Document Selection
              </CardTitle>
              <CardDescription>
                Select which compliance documents to include in the package
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Core Certificates */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-green-700">Core Certificates</h4>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="traceability-cert"
                      checked={packageOptions.includeTraceabilityCertificate}
                      onCheckedChange={(checked) => 
                        updatePackageOptions({ includeTraceabilityCertificate: !!checked })
                      }
                    />
                    <Label htmlFor="traceability-cert" className="text-sm">
                      Traceability Certificate (8130-3 style)
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="conformity-cert"
                      checked={packageOptions.includeConformityCertificate}
                      onCheckedChange={(checked) => 
                        updatePackageOptions({ includeConformityCertificate: !!checked })
                      }
                    />
                    <Label htmlFor="conformity-cert" className="text-sm">
                      Certificate of Conformity
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="quality-cert"
                      checked={packageOptions.includeQualityCertificate}
                      onCheckedChange={(checked) => 
                        updatePackageOptions({ includeQualityCertificate: !!checked })
                      }
                    />
                    <Label htmlFor="quality-cert" className="text-sm">
                      Quality Certificate
                    </Label>
                  </div>
                </div>

                {/* Test Reports */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-blue-700">Test Reports</h4>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="material-test"
                      checked={packageOptions.includeMaterialTestReport}
                      onCheckedChange={(checked) => 
                        updatePackageOptions({ includeMaterialTestReport: !!checked })
                      }
                    />
                    <Label htmlFor="material-test" className="text-sm">
                      Material Test Report
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="functional-test"
                      checked={packageOptions.includeFunctionalTestReport}
                      onCheckedChange={(checked) => 
                        updatePackageOptions({ includeFunctionalTestReport: !!checked })
                      }
                    />
                    <Label htmlFor="functional-test" className="text-sm">
                      Functional Test Report
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="airworthiness-cert"
                      checked={packageOptions.includeAirworthinessCertificate}
                      onCheckedChange={(checked) => 
                        updatePackageOptions({ includeAirworthinessCertificate: !!checked })
                      }
                    />
                    <Label htmlFor="airworthiness-cert" className="text-sm">
                      Airworthiness Certificate
                    </Label>
                  </div>
                </div>

                {/* Shipping Documents */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-purple-700">Shipping Documents</h4>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="packing-slip"
                      checked={packageOptions.includePackingSlip}
                      onCheckedChange={(checked) => 
                        updatePackageOptions({ includePackingSlip: !!checked })
                      }
                    />
                    <Label htmlFor="packing-slip" className="text-sm">
                      Packing Slip
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="export-cert"
                      checked={packageOptions.includeExportCertificate}
                      onCheckedChange={(checked) => 
                        updatePackageOptions({ includeExportCertificate: !!checked })
                      }
                    />
                    <Label htmlFor="export-cert" className="text-sm">
                      Export Certificate
                    </Label>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">
                  <strong>Selected:</strong> {selectedDocumentCount} document types will be generated, 
                  creating {selectedDocumentCount * parts.length} individual documents plus package-level documents.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-4">
          {!generationResult ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Package className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-600">No package generated yet</p>
                  <p className="text-sm text-slate-500 mt-2">
                    Configure your parts and compliance settings, then generate the package
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Results Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {generationResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                    Package Generation Result
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {generationResult.success ? (
                    <div className="space-y-4">
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          Successfully generated compliance package with {generationResult.documents.length} documents 
                          ({generationResult.totalPages} total pages)
                        </AlertDescription>
                      </Alert>

                      <div className="flex gap-2">
                        <Button onClick={downloadPackage} className="flex-1">
                          <Download className="h-4 w-4 mr-2" />
                          Download Complete Package
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Package generation failed: {generationResult.error}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Individual Documents */}
              {generationResult.success && generationResult.documents.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Individual Documents</CardTitle>
                    <CardDescription>
                      Download individual compliance documents
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {generationResult.documents.map((doc, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <FileText className="h-4 w-4 text-blue-600" />
                            <div>
                              <span className="font-medium">{doc.name}</span>
                              <div className="text-sm text-slate-500">
                                {doc.type.replace('_', ' ')} • {doc.pages} page{doc.pages > 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadIndividualDocument(doc)}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}