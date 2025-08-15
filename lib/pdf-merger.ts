'use client'

import { PDFDocument, PDFPage, rgb } from 'pdf-lib'

export interface PDFMergeSource {
  id: string
  name: string
  file: File | Blob | ArrayBuffer
  type: 'supplier' | 'generated'
  order: number
  description?: string
}

export interface PDFMergeOptions {
  sources: PDFMergeSource[]
  outputFileName?: string
  addPageNumbers?: boolean
  addTitlePage?: boolean
  titlePageContent?: {
    title: string
    subtitle?: string
    companyName?: string
    documentDate?: string
  }
}

export interface PDFMergeResult {
  success: boolean
  mergedPdf?: ArrayBuffer
  fileName: string
  totalPages: number
  sourceInfo: {
    sourceId: string
    name: string
    pageRange: { start: number; end: number }
    pageCount: number
  }[]
  error?: string
}

/**
 * Converts various file types to ArrayBuffer for PDF processing
 */
async function fileToArrayBuffer(file: File | Blob | ArrayBuffer): Promise<ArrayBuffer> {
  if (file instanceof ArrayBuffer) {
    return file
  }
  
  if ((typeof Blob !== 'undefined' && file instanceof Blob) || 
      (typeof File !== 'undefined' && file instanceof File)) {
    return await file.arrayBuffer()
  }
  
  throw new Error('Unsupported file type for PDF processing')
}

/**
 * Validates that a file is a valid PDF document
 */
async function validatePDFFile(arrayBuffer: ArrayBuffer): Promise<boolean> {
  try {
    await PDFDocument.load(arrayBuffer)
    return true
  } catch (error) {
    console.warn('Invalid PDF file:', error)
    return false
  }
}

/**
 * Creates a title page for the merged document
 */
async function createTitlePage(
  pdfDoc: PDFDocument, 
  titleContent: PDFMergeOptions['titlePageContent']
): Promise<PDFPage> {
  const page = pdfDoc.addPage([612, 792]) // Standard letter size
  const { width, height } = page.getSize()
  
  // Add title page content
  const font = await pdfDoc.embedFont('Helvetica-Bold')
  const regularFont = await pdfDoc.embedFont('Helvetica')
  
  let yPosition = height - 150
  
  // Main title
  if (titleContent?.title) {
    page.drawText(titleContent.title, {
      x: 72,
      y: yPosition,
      size: 24,
      font: font,
    })
    yPosition -= 50
  }
  
  // Subtitle
  if (titleContent?.subtitle) {
    page.drawText(titleContent.subtitle, {
      x: 72,
      y: yPosition,
      size: 16,
      font: regularFont,
    })
    yPosition -= 40
  }
  
  // Company name
  if (titleContent?.companyName) {
    page.drawText(`Company: ${titleContent.companyName}`, {
      x: 72,
      y: yPosition,
      size: 12,
      font: regularFont,
    })
    yPosition -= 30
  }
  
  // Document date
  if (titleContent?.documentDate) {
    page.drawText(`Date: ${titleContent.documentDate}`, {
      x: 72,
      y: yPosition,
      size: 12,
      font: regularFont,
    })
    yPosition -= 30
  }
  
  // Add separator line
  page.drawLine({
    start: { x: 72, y: yPosition - 10 },
    end: { x: width - 72, y: yPosition - 10 },
    thickness: 1,
    color: rgb(0.5, 0.5, 0.5)
  })
  
  return page
}

/**
 * Adds page numbers to all pages in the document
 */
async function addPageNumbers(pdfDoc: PDFDocument, startPageNumber: number = 1): Promise<void> {
  const pages = pdfDoc.getPages()
  const font = await pdfDoc.embedFont('Helvetica')
  
  pages.forEach((page, index) => {
    const { width } = page.getSize()
    const pageNumber = startPageNumber + index
    const text = `Page ${pageNumber}`
    
    // Add page number at bottom right
    page.drawText(text, {
      x: width - 100,
      y: 30,
      size: 10,
      font: font,
      color: rgb(0.5, 0.5, 0.5)
    })
  })
}

/**
 * Main PDF merging function
 */
export async function mergePDFs(options: PDFMergeOptions): Promise<PDFMergeResult> {
  try {
    // Validate inputs
    if (!options.sources || options.sources.length === 0) {
      throw new Error('No PDF sources provided for merging')
    }

    // Sort sources by order
    const sortedSources = [...options.sources].sort((a, b) => a.order - b.order)
    
    // Create new PDF document
    const mergedDoc = await PDFDocument.create()
    
    let currentPageNumber = 1
    const sourceInfo: PDFMergeResult['sourceInfo'] = []
    
    // Add title page if requested
    if (options.addTitlePage && options.titlePageContent) {
      await createTitlePage(mergedDoc, options.titlePageContent)
      currentPageNumber = 2
    }
    
    // Process each source PDF
    for (const source of sortedSources) {
      try {
        // Convert to ArrayBuffer
        const arrayBuffer = await fileToArrayBuffer(source.file)
        
        // Validate PDF
        const isValidPDF = await validatePDFFile(arrayBuffer)
        if (!isValidPDF) {
          console.warn(`Skipping invalid PDF: ${source.name}`)
          continue
        }
        
        // Load source PDF
        const sourcePdf = await PDFDocument.load(arrayBuffer)
        const pageIndices = sourcePdf.getPageIndices()
        
        // Copy pages from source to merged document
        const copiedPages = await mergedDoc.copyPages(sourcePdf, pageIndices)
        
        const startPage = currentPageNumber
        copiedPages.forEach(page => mergedDoc.addPage(page))
        const endPage = currentPageNumber + copiedPages.length - 1
        
        // Track source information
        sourceInfo.push({
          sourceId: source.id,
          name: source.name,
          pageRange: { start: startPage, end: endPage },
          pageCount: copiedPages.length
        })
        
        currentPageNumber += copiedPages.length
        
      } catch (error) {
        console.error(`Error processing PDF source ${source.name}:`, error)
        // Continue with other sources rather than failing completely
        continue
      }
    }
    
    // Add page numbers if requested
    if (options.addPageNumbers) {
      await addPageNumbers(mergedDoc, 1)
    }
    
    // Generate final PDF
    const pdfBytes = await mergedDoc.save()
    const totalPages = mergedDoc.getPageCount()
    
    // Generate filename
    const fileName = options.outputFileName || 
                    `merged-document-${new Date().toISOString().split('T')[0]}.pdf`
    
    return {
      success: true,
      mergedPdf: pdfBytes,
      fileName,
      totalPages,
      sourceInfo
    }
    
  } catch (error) {
    console.error('PDF merge error:', error)
    
    return {
      success: false,
      fileName: options.outputFileName || 'merged-document.pdf',
      totalPages: 0,
      sourceInfo: [],
      error: error instanceof Error ? error.message : 'Unknown PDF merge error'
    }
  }
}

/**
 * Helper function to download merged PDF
 */
export function downloadMergedPDF(result: PDFMergeResult): void {
  if (!result.success || !result.mergedPdf) {
    throw new Error('Cannot download failed PDF merge result')
  }
  
  const blob = new Blob([result.mergedPdf], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = result.fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

/**
 * Utility to create PDF merge source from file
 */
export function createPDFSource(
  id: string,
  file: File,
  type: 'supplier' | 'generated',
  order: number,
  description?: string
): PDFMergeSource {
  return {
    id,
    name: file.name,
    file,
    type,
    order,
    description
  }
}

/**
 * Utility to reorder PDF sources
 */
export function reorderPDFSources(sources: PDFMergeSource[], newOrder: string[]): PDFMergeSource[] {
  const sourceMap = new Map(sources.map(source => [source.id, source]))
  
  return newOrder.map((id, index) => {
    const source = sourceMap.get(id)
    if (!source) {
      throw new Error(`Source with id ${id} not found`)
    }
    
    return {
      ...source,
      order: index + 1
    }
  })
}

/**
 * Utility to validate PDF merge sources
 */
export async function validatePDFSources(sources: PDFMergeSource[]): Promise<{
  valid: PDFMergeSource[]
  invalid: { source: PDFMergeSource; error: string }[]
}> {
  const valid: PDFMergeSource[] = []
  const invalid: { source: PDFMergeSource; error: string }[] = []
  
  for (const source of sources) {
    try {
      const arrayBuffer = await fileToArrayBuffer(source.file)
      const isValid = await validatePDFFile(arrayBuffer)
      
      if (isValid) {
        valid.push(source)
      } else {
        invalid.push({
          source,
          error: 'Invalid PDF format'
        })
      }
    } catch (error) {
      invalid.push({
        source,
        error: error instanceof Error ? error.message : 'Unknown validation error'
      })
    }
  }
  
  return { valid, invalid }
}