'use client'

import { useState, useCallback, useMemo } from 'react'
import { 
  PDFMergeSource, 
  PDFMergeOptions, 
  PDFMergeResult,
  mergePDFs,
  downloadMergedPDF,
  createPDFSource
} from '@/lib/pdf-merger'

export interface GeneratedDocument {
  id: string
  name: string
  arrayBuffer: ArrayBuffer
  description?: string
  type: 'invoice' | 'purchase_order' | 'repair_order' | 'packing_slip'
  documentNumber?: string
  companyName?: string
}

export interface UsePDFMergerOptions {
  defaultOutputName?: string
  autoIncludeGenerated?: boolean
  defaultTitlePageContent?: {
    title: string
    subtitle?: string
    companyName?: string
  }
}

export interface UsePDFMergerReturn {
  // State
  sources: PDFMergeSource[]
  isLoading: boolean
  mergeResult: PDFMergeResult | null
  error: string | null
  
  // Generated documents management
  generatedDocuments: GeneratedDocument[]
  addGeneratedDocument: (doc: GeneratedDocument) => void
  removeGeneratedDocument: (id: string) => void
  clearGeneratedDocuments: () => void
  
  // Source management
  addSupplierDocument: (file: File, description?: string) => Promise<void>
  removeSource: (sourceId: string) => void
  reorderSources: (sourceIds: string[]) => void
  clearSources: () => void
  
  // Merge operations
  mergePDFs: (options?: Partial<PDFMergeOptions>) => Promise<PDFMergeResult>
  downloadResult: () => void
  resetResult: () => void
  
  // Utility functions
  canMerge: boolean
  totalDocuments: number
  supplierDocuments: PDFMergeSource[]
  generatedSources: PDFMergeSource[]
}

/**
 * Custom hook for PDF merging functionality
 * Provides state management and operations for combining supplier and generated documents
 */
export function usePDFMerger(options: UsePDFMergerOptions = {}): UsePDFMergerReturn {
  const {
    defaultOutputName = `merged-documents-${new Date().toISOString().split('T')[0]}.pdf`,
    autoIncludeGenerated = true,
    defaultTitlePageContent = {
      title: 'Complete Documentation Package',
      subtitle: 'Aviation Parts Documentation',
      companyName: 'TASAVIA'
    }
  } = options

  // State management
  const [sources, setSources] = useState<PDFMergeSource[]>([])
  const [generatedDocuments, setGeneratedDocuments] = useState<GeneratedDocument[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [mergeResult, setMergeResult] = useState<PDFMergeResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Add generated document
  const addGeneratedDocument = useCallback((doc: GeneratedDocument) => {
    setGeneratedDocuments(prev => {
      // Check if already exists
      const exists = prev.some(d => d.id === doc.id)
      if (exists) return prev
      
      const newDocs = [...prev, doc]
      
      // Auto-include in sources if enabled
      if (autoIncludeGenerated) {
        setSources(prevSources => {
          const sourceExists = prevSources.some(s => s.id === `generated-${doc.id}`)
          if (sourceExists) return prevSources
          
          const newSource: PDFMergeSource = {
            id: `generated-${doc.id}`,
            name: doc.name,
            file: doc.arrayBuffer,
            type: 'generated',
            order: prevSources.length + 1,
            description: doc.description || `Generated ${doc.type}: ${doc.name}`
          }
          
          return [...prevSources, newSource]
        })
      }
      
      return newDocs
    })
  }, [autoIncludeGenerated])

  // Remove generated document
  const removeGeneratedDocument = useCallback((id: string) => {
    setGeneratedDocuments(prev => prev.filter(doc => doc.id !== id))
    // Also remove from sources if present
    setSources(prev => prev.filter(source => source.id !== `generated-${id}`))
  }, [])

  // Clear generated documents
  const clearGeneratedDocuments = useCallback(() => {
    setGeneratedDocuments([])
    setSources(prev => prev.filter(source => source.type !== 'generated'))
  }, [])

  // Add supplier document
  const addSupplierDocument = useCallback(async (file: File, description?: string) => {
    if (file.type !== 'application/pdf') {
      throw new Error('Only PDF files are supported')
    }

    setIsLoading(true)
    setError(null)

    try {
      const source = createPDFSource(
        `supplier-${Date.now()}-${Math.random()}`,
        file,
        'supplier',
        sources.length + 1,
        description || `Supplier document: ${file.name}`
      )

      setSources(prev => [...prev, source])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add supplier document'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [sources.length])

  // Remove source
  const removeSource = useCallback((sourceId: string) => {
    setSources(prev => {
      const filtered = prev.filter(s => s.id !== sourceId)
      // Reorder remaining sources
      return filtered.map((source, index) => ({
        ...source,
        order: index + 1
      }))
    })
  }, [])

  // Reorder sources
  const reorderSources = useCallback((sourceIds: string[]) => {
    setSources(prev => {
      const sourceMap = new Map(prev.map(source => [source.id, source]))
      
      return sourceIds.map((id, index) => {
        const source = sourceMap.get(id)
        if (!source) return null
        
        return {
          ...source,
          order: index + 1
        }
      }).filter(Boolean) as PDFMergeSource[]
    })
  }, [])

  // Clear all sources
  const clearSources = useCallback(() => {
    setSources([])
    setMergeResult(null)
    setError(null)
  }, [])

  // Merge PDFs
  const handleMergePDFs = useCallback(async (mergeOptions: Partial<PDFMergeOptions> = {}) => {
    if (sources.length === 0) {
      throw new Error('No documents to merge')
    }

    setIsLoading(true)
    setError(null)
    setMergeResult(null)

    try {
      const options: PDFMergeOptions = {
        sources,
        outputFileName: defaultOutputName,
        addPageNumbers: true,
        addTitlePage: true,
        titlePageContent: {
          ...defaultTitlePageContent,
          documentDate: new Date().toLocaleDateString()
        },
        ...mergeOptions
      }

      const result = await mergePDFs(options)
      setMergeResult(result)

      if (!result.success) {
        setError(result.error || 'Merge operation failed')
      }

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to merge PDFs'
      setError(errorMessage)
      
      const failureResult: PDFMergeResult = {
        success: false,
        fileName: defaultOutputName,
        totalPages: 0,
        sourceInfo: [],
        error: errorMessage
      }
      
      setMergeResult(failureResult)
      return failureResult
    } finally {
      setIsLoading(false)
    }
  }, [sources, defaultOutputName, defaultTitlePageContent])

  // Download result
  const downloadResult = useCallback(() => {
    if (mergeResult && mergeResult.success) {
      downloadMergedPDF(mergeResult)
    } else {
      throw new Error('No successful merge result available for download')
    }
  }, [mergeResult])

  // Reset result
  const resetResult = useCallback(() => {
    setMergeResult(null)
    setError(null)
  }, [])

  // Computed values
  const canMerge = useMemo(() => sources.length > 0 && !isLoading, [sources.length, isLoading])
  
  const totalDocuments = sources.length
  
  const supplierDocuments = useMemo(() => 
    sources.filter(source => source.type === 'supplier'), 
    [sources]
  )
  
  const generatedSources = useMemo(() => 
    sources.filter(source => source.type === 'generated'), 
    [sources]
  )

  return {
    // State
    sources,
    isLoading,
    mergeResult,
    error,
    
    // Generated documents management
    generatedDocuments,
    addGeneratedDocument,
    removeGeneratedDocument,
    clearGeneratedDocuments,
    
    // Source management
    addSupplierDocument,
    removeSource,
    reorderSources,
    clearSources,
    
    // Merge operations
    mergePDFs: handleMergePDFs,
    downloadResult,
    resetResult,
    
    // Utility functions
    canMerge,
    totalDocuments,
    supplierDocuments,
    generatedSources
  }
}

/**
 * Helper hook for integration with existing document pages
 * Automatically handles PDF generation and merger setup
 */
export function usePDFMergerIntegration(documentData: {
  type: 'invoice' | 'purchase_order' | 'repair_order'
  number: string
  companyName?: string
}) {
  const merger = usePDFMerger({
    defaultOutputName: `${documentData.type}-${documentData.number}-complete-package.pdf`,
    defaultTitlePageContent: {
      title: `${documentData.type.replace('_', ' ').toUpperCase()} - Complete Package`,
      subtitle: `Document #${documentData.number}`,
      companyName: documentData.companyName || 'TASAVIA'
    }
  })

  // Function to generate current document and add to merger
  const addCurrentDocument = useCallback(async (generatePDF: () => Promise<ArrayBuffer>) => {
    try {
      const pdfBuffer = await generatePDF()
      
      const document: GeneratedDocument = {
        id: `current-${documentData.type}-${documentData.number}`,
        name: `${documentData.type.replace('_', ' ')} ${documentData.number}.pdf`,
        arrayBuffer: pdfBuffer,
        type: documentData.type,
        documentNumber: documentData.number,
        companyName: documentData.companyName,
        description: `Generated ${documentData.type.replace('_', ' ')} document`
      }
      
      merger.addGeneratedDocument(document)
      return document
    } catch (error) {
      console.error('Failed to generate current document:', error)
      throw error
    }
  }, [documentData, merger])

  return {
    ...merger,
    addCurrentDocument
  }
}