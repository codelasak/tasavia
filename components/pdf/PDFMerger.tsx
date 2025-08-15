'use client'

import React, { useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { 
  Upload, 
  FileText, 
  X, 
  Download, 
  ArrowUp, 
  ArrowDown, 
  AlertCircle,
  CheckCircle,
  GripVertical,
  Plus,
  Settings
} from 'lucide-react'
import {
  PDFMergeSource,
  PDFMergeOptions,
  PDFMergeResult,
  mergePDFs,
  downloadMergedPDF,
  createPDFSource,
  reorderPDFSources,
  validatePDFSources
} from '@/lib/pdf-merger'

interface PDFMergerProps {
  generatedDocuments?: {
    id: string
    name: string
    arrayBuffer: ArrayBuffer
    description?: string
  }[]
  defaultOptions?: Partial<PDFMergeOptions>
  onMergeComplete?: (result: PDFMergeResult) => void
  className?: string
}

export default function PDFMerger({
  generatedDocuments = [],
  defaultOptions = {},
  onMergeComplete,
  className = ""
}: PDFMergerProps) {
  const [sources, setSources] = useState<PDFMergeSource[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isMerging, setIsMerging] = useState(false)
  const [mergeResult, setMergeResult] = useState<PDFMergeResult | null>(null)
  const [validationResult, setValidationResult] = useState<{
    valid: PDFMergeSource[]
    invalid: { source: PDFMergeSource; error: string }[]
  } | null>(null)
  
  // Merge options
  const [outputFileName, setOutputFileName] = useState(
    defaultOptions.outputFileName || `merged-document-${new Date().toISOString().split('T')[0]}.pdf`
  )
  const [addPageNumbers, setAddPageNumbers] = useState(defaultOptions.addPageNumbers ?? true)
  const [addTitlePage, setAddTitlePage] = useState(defaultOptions.addTitlePage ?? true)
  const [titlePageTitle, setTitlePageTitle] = useState(
    defaultOptions.titlePageContent?.title || 'Complete Documentation Package'
  )
  const [titlePageSubtitle, setTitlePageSubtitle] = useState(
    defaultOptions.titlePageContent?.subtitle || 'Aviation Parts Documentation'
  )
  const [titlePageCompany, setTitlePageCompany] = useState(
    defaultOptions.titlePageContent?.companyName || 'TASAVIA'
  )
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle file upload for supplier documents
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    
    setIsUploading(true)
    
    try {
      const newSources: PDFMergeSource[] = []
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        // Check if it's a PDF
        if (file.type !== 'application/pdf') {
          console.warn(`Skipping non-PDF file: ${file.name}`)
          continue
        }
        
        const source = createPDFSource(
          `supplier-${Date.now()}-${i}`,
          file,
          'supplier',
          sources.length + newSources.length + 1,
          `Supplier document: ${file.name}`
        )
        
        newSources.push(source)
      }
      
      setSources(prev => [...prev, ...newSources])
      
    } catch (error) {
      console.error('File upload error:', error)
    } finally {
      setIsUploading(false)
    }
  }, [sources.length])

  // Add generated document to merge sources
  const handleAddGeneratedDocument = useCallback((doc: typeof generatedDocuments[0]) => {
    const source: PDFMergeSource = {
      id: `generated-${doc.id}`,
      name: doc.name,
      file: doc.arrayBuffer,
      type: 'generated',
      order: sources.length + 1,
      description: doc.description || `Generated TASAVIA document: ${doc.name}`
    }
    
    setSources(prev => [...prev, source])
  }, [sources.length])

  // Remove source from merge list
  const handleRemoveSource = useCallback((sourceId: string) => {
    setSources(prev => {
      const filtered = prev.filter(s => s.id !== sourceId)
      // Reorder remaining sources
      return filtered.map((source, index) => ({
        ...source,
        order: index + 1
      }))
    })
  }, [])

  // Move source up/down in order
  const handleMoveSource = useCallback((sourceId: string, direction: 'up' | 'down') => {
    setSources(prev => {
      const currentIndex = prev.findIndex(s => s.id === sourceId)
      if (currentIndex === -1) return prev
      
      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
      if (newIndex < 0 || newIndex >= prev.length) return prev
      
      const newSources = [...prev]
      const [movedSource] = newSources.splice(currentIndex, 1)
      newSources.splice(newIndex, 0, movedSource)
      
      // Update order numbers
      return newSources.map((source, index) => ({
        ...source,
        order: index + 1
      }))
    })
  }, [])

  // Validate sources before merging
  const handleValidateSources = useCallback(async () => {
    if (sources.length === 0) return
    
    setIsUploading(true)
    try {
      const result = await validatePDFSources(sources)
      setValidationResult(result)
    } catch (error) {
      console.error('Validation error:', error)
    } finally {
      setIsUploading(false)
    }
  }, [sources])

  // Perform PDF merge
  const handleMergePDFs = useCallback(async () => {
    if (sources.length === 0) {
      alert('Please add at least one document to merge')
      return
    }
    
    setIsMerging(true)
    setMergeResult(null)
    
    try {
      const mergeOptions: PDFMergeOptions = {
        sources,
        outputFileName,
        addPageNumbers,
        addTitlePage,
        titlePageContent: addTitlePage ? {
          title: titlePageTitle,
          subtitle: titlePageSubtitle,
          companyName: titlePageCompany,
          documentDate: new Date().toLocaleDateString()
        } : undefined
      }
      
      const result = await mergePDFs(mergeOptions)
      setMergeResult(result)
      
      if (result.success && onMergeComplete) {
        onMergeComplete(result)
      }
      
    } catch (error) {
      console.error('Merge error:', error)
      setMergeResult({
        success: false,
        fileName: outputFileName,
        totalPages: 0,
        sourceInfo: [],
        error: error instanceof Error ? error.message : 'Unknown merge error'
      })
    } finally {
      setIsMerging(false)
    }
  }, [sources, outputFileName, addPageNumbers, addTitlePage, titlePageTitle, titlePageSubtitle, titlePageCompany, onMergeComplete])

  // Download merged PDF
  const handleDownload = useCallback(() => {
    if (mergeResult && mergeResult.success) {
      downloadMergedPDF(mergeResult)
    }
  }, [mergeResult])

  return (
    <div className={`space-y-6 ${className}`}>
      
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Document Sources
          </CardTitle>
          <CardDescription>
            Upload supplier documents and add generated TASAVIA documents to create a complete package
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* File Upload */}
          <div className="space-y-2">
            <Label>Upload Supplier Documents (PDF)</Label>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                multiple
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? 'Uploading...' : 'Upload PDFs'}
              </Button>
              {sources.length > 0 && (
                <Button
                  variant="outline"
                  onClick={handleValidateSources}
                  disabled={isUploading}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Validate All
                </Button>
              )}
            </div>
          </div>

          {/* Generated Documents */}
          {generatedDocuments.length > 0 && (
            <div className="space-y-2">
              <Label>Available Generated Documents</Label>
              <div className="flex flex-wrap gap-2">
                {generatedDocuments.map(doc => {
                  const isAdded = sources.some(s => s.id === `generated-${doc.id}`)
                  return (
                    <Button
                      key={doc.id}
                      variant={isAdded ? "default" : "outline"}
                      size="sm"
                      onClick={() => !isAdded && handleAddGeneratedDocument(doc)}
                      disabled={isAdded}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {doc.name}
                      {isAdded && <CheckCircle className="h-3 w-3 ml-1" />}
                    </Button>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document List */}
      {sources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents to Merge ({sources.length})
            </CardTitle>
            <CardDescription>
              Drag to reorder or use arrows. Documents will be merged in this order.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sources.map((source, index) => (
                <div
                  key={source.id}
                  className="flex items-center gap-3 p-3 border rounded-lg bg-slate-50"
                >
                  <GripVertical className="h-4 w-4 text-slate-400" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={source.type === 'supplier' ? 'secondary' : 'default'}>
                        {source.type === 'supplier' ? 'Supplier' : 'Generated'}
                      </Badge>
                      <span className="font-medium truncate">{source.name}</span>
                    </div>
                    {source.description && (
                      <p className="text-sm text-slate-600 truncate">{source.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveSource(source.id, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveSource(source.id, 'down')}
                      disabled={index === sources.length - 1}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSource(source.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Merge Options */}
      {sources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Merge Options
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Output filename */}
            <div className="space-y-2">
              <Label htmlFor="output-filename">Output Filename</Label>
              <Input
                id="output-filename"
                value={outputFileName}
                onChange={(e) => setOutputFileName(e.target.value)}
                placeholder="merged-document.pdf"
              />
            </div>

            {/* Options checkboxes */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="add-page-numbers"
                  checked={addPageNumbers}
                  onCheckedChange={(checked) => setAddPageNumbers(!!checked)}
                />
                <Label htmlFor="add-page-numbers">Add page numbers</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="add-title-page"
                  checked={addTitlePage}
                  onCheckedChange={(checked) => setAddTitlePage(!!checked)}
                />
                <Label htmlFor="add-title-page">Add title page</Label>
              </div>
            </div>

            {/* Title page options */}
            {addTitlePage && (
              <div className="space-y-3 p-4 border rounded-lg bg-slate-50">
                <h4 className="font-medium">Title Page Content</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="title-page-title">Title</Label>
                    <Input
                      id="title-page-title"
                      value={titlePageTitle}
                      onChange={(e) => setTitlePageTitle(e.target.value)}
                      placeholder="Complete Documentation Package"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="title-page-company">Company</Label>
                    <Input
                      id="title-page-company"
                      value={titlePageCompany}
                      onChange={(e) => setTitlePageCompany(e.target.value)}
                      placeholder="TASAVIA"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="title-page-subtitle">Subtitle</Label>
                  <Input
                    id="title-page-subtitle"
                    value={titlePageSubtitle}
                    onChange={(e) => setTitlePageSubtitle(e.target.value)}
                    placeholder="Aviation Parts Documentation"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Validation Results */}
      {validationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {validationResult.invalid.length === 0 ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              Validation Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {validationResult.invalid.length > 0 ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {validationResult.invalid.length} document(s) failed validation and will be skipped during merge.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  All {validationResult.valid.length} documents passed validation and are ready for merging.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Merge Actions */}
      {sources.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <Button
                onClick={handleMergePDFs}
                disabled={isMerging || sources.length === 0}
                className="flex-1"
              >
                {isMerging ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Merging...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Merge PDFs
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Merge Result */}
      {mergeResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {mergeResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              Merge Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mergeResult.success ? (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Successfully merged {mergeResult.sourceInfo.length} documents into {mergeResult.totalPages} pages.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <h4 className="font-medium">Document Structure:</h4>
                  {mergeResult.sourceInfo.map((info, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                      <span className="font-medium">{info.name}</span>
                      <Badge variant="outline">
                        Pages {info.pageRange.start}-{info.pageRange.end} ({info.pageCount} pages)
                      </Badge>
                    </div>
                  ))}
                </div>

                <Button onClick={handleDownload} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download Merged PDF ({mergeResult.fileName})
                </Button>
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Merge failed: {mergeResult.error || 'Unknown error'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}