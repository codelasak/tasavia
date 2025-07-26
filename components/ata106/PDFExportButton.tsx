'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Download, 
  FileText, 
  Printer, 
  Mail, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  ChevronDown 
} from 'lucide-react'
import { toast } from 'sonner'
import { 
  generateATA106HTML, 
  convertSalesOrderToATA106,
  type ATA106PDFOptions 
} from '@/lib/pdf/ata106-generator'

interface PDFExportButtonProps {
  salesOrderData: any
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
  showDropdown?: boolean
  className?: string
}

export default function PDFExportButton({
  salesOrderData,
  variant = 'default',
  size = 'default',
  showDropdown = true,
  className
}: PDFExportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  // Check if sales order has traceable items
  const traceableItems = salesOrderData?.sales_order_items?.filter((item: any) => 
    item.inventory?.traceability_source || 
    item.inventory?.traceable_to || 
    item.inventory?.last_certified_agency
  ) || []

  const hasTraceableItems = traceableItems.length > 0
  const complianceLevel = getComplianceLevel()

  function getComplianceLevel(): 'complete' | 'partial' | 'none' {
    if (!hasTraceableItems) return 'none'
    
    const requiredFields = ['traceability_source', 'traceable_to', 'last_certified_agency']
    let completeItems = 0
    
    traceableItems.forEach((item: any) => {
      const hasAllFields = requiredFields.every(field => item.inventory?.[field])
      if (hasAllFields) completeItems++
    })
    
    if (completeItems === traceableItems.length) return 'complete'
    if (completeItems > 0) return 'partial'
    return 'none'
  }

  const getComplianceBadge = () => {
    switch (complianceLevel) {
      case 'complete':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Fully Compliant
          </Badge>
        )
      case 'partial':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Partially Compliant
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-gray-600">
            No ATA 106 Data
          </Badge>
        )
    }
  }

  const handlePDFGeneration = async (options: ATA106PDFOptions = {}) => {
    if (!hasTraceableItems) {
      toast.error('No traceable items found in this sales order')
      return
    }

    setIsGenerating(true)
    setExportError(null)

    try {
      // Convert sales order data to ATA 106 format
      const ata106Data = convertSalesOrderToATA106(salesOrderData)
      
      // Generate HTML content
      const htmlContent = generateATA106HTML(ata106Data, {
        includeWatermark: complianceLevel !== 'complete',
        watermarkText: complianceLevel === 'partial' ? 'PARTIAL COMPLIANCE' : 'DRAFT',
        ...options
      })

      // For now, we'll download the HTML file
      // In a real implementation, this would generate a PDF
      const blob = new Blob([htmlContent], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `ATA106-${salesOrderData.invoice_number}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('ATA 106 form exported successfully')
      
    } catch (error) {
      console.error('PDF generation error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setExportError(errorMessage)
      toast.error(`Export failed: ${errorMessage}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePreview = async () => {
    if (!hasTraceableItems) {
      toast.error('No traceable items found in this sales order')
      return
    }

    try {
      // Convert sales order data to ATA 106 format
      const ata106Data = convertSalesOrderToATA106(salesOrderData)
      
      // Generate HTML content
      const htmlContent = generateATA106HTML(ata106Data, {
        includeWatermark: true,
        watermarkText: 'PREVIEW'
      })

      // Open in new window for preview
      const newWindow = window.open('', '_blank')
      if (newWindow) {
        newWindow.document.write(htmlContent)
        newWindow.document.close()
      } else {
        toast.error('Unable to open preview window. Please check popup settings.')
      }
      
    } catch (error) {
      console.error('Preview error:', error)
      toast.error('Preview failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handlePrint = () => {
    handlePreview()
    setTimeout(() => {
      toast.info('Use your browser\'s print function to print the ATA 106 form')
    }, 1000)
  }

  const handleEmailExport = async () => {
    toast.info('Email export feature coming soon')
    // This would integrate with an email service to send the PDF
  }

  if (!showDropdown) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={() => handlePDFGeneration()}
        disabled={!hasTraceableItems || isGenerating}
        className={className}
      >
        {isGenerating ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        Export ATA 106
      </Button>
    )
  }

  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            disabled={!hasTraceableItems || isGenerating}
            className={className}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            ATA 106 Export
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Export Options</span>
            {getComplianceBadge()}
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => handlePDFGeneration()}>
            <Download className="h-4 w-4 mr-2" />
            Download Form (HTML)
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handlePreview}>
            <FileText className="h-4 w-4 mr-2" />
            Preview Form
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print Form
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleEmailExport} disabled>
            <Mail className="h-4 w-4 mr-2" />
            Email Form
            <Badge variant="outline" className="ml-auto text-xs">Soon</Badge>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <div className="px-2 py-1 text-xs text-gray-500">
            Format Options:
          </div>
          
          <DropdownMenuItem onClick={() => handlePDFGeneration({ format: 'A4' })}>
            <FileText className="h-4 w-4 mr-2" />
            A4 Format
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handlePDFGeneration({ format: 'Letter' })}>
            <FileText className="h-4 w-4 mr-2" />
            US Letter Format
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Compliance Status Alert */}
      {hasTraceableItems && complianceLevel !== 'complete' && (
        <Alert className="mt-4 border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <div className="font-medium">ATA 106 Compliance Warning</div>
            <div className="text-sm mt-1">
              {complianceLevel === 'partial' 
                ? 'Some items have incomplete traceability information. The exported form will be marked as "PARTIAL COMPLIANCE".'
                : 'Items have minimal traceability information. Consider adding complete ATA 106 data for full compliance.'
              }
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* No Traceable Items Alert */}
      {!hasTraceableItems && (
        <Alert className="mt-4 border-gray-200 bg-gray-50">
          <AlertTriangle className="h-4 w-4 text-gray-600" />
          <AlertDescription className="text-gray-700">
            <div className="font-medium">No ATA 106 Traceability Required</div>
            <div className="text-sm mt-1">
              This sales order contains no items with traceability information. 
              ATA 106 form export is not available.
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Export Error Alert */}
      {exportError && (
        <Alert className="mt-4 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="font-medium">Export Error</div>
            <div className="text-sm mt-1">{exportError}</div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}