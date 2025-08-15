'use client'

import { ReactNode, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Printer } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface PDFLayoutCompactProps {
  title: string
  documentNumber: string
  onDownload?: () => void
  children: ReactNode
  className?: string
}

export default function PDFLayoutCompact({ 
  title, 
  documentNumber, 
  onDownload, 
  children,
  className = "" 
}: PDFLayoutCompactProps) {
  const router = useRouter()

  useEffect(() => {
    // Add PDF print mode class to html element when component mounts
    document.documentElement.classList.add('pdf-print-mode-compact')
    
    // Cleanup function to remove the class when component unmounts
    return () => {
      document.documentElement.classList.remove('pdf-print-mode-compact')
    }
  }, [])

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    if (onDownload) {
      onDownload()
    } else {
      // Default to print dialog
      window.print()
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Print Controls - Hidden when printing */}
      <div className="no-print bg-slate-50 border-b p-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-lg font-semibold">{title} - {documentNumber}</h1>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* PDF Content - Reduced padding for compact layout */}
      <div className={`max-w-4xl mx-auto p-5 print:p-0 print:max-w-none ${className}`}>
        {children}
      </div>

      {/* Compact Print Styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          body {
            margin: 0;
            padding: 0;
            font-size: 12px; /* Smaller base font for compact layout */
          }
          
          @page {
            margin: 0.3in; /* Reduced from 0.5in to 0.3in for more space */
            size: A4;
          }
          
          .print\\:p-0 {
            padding: 0 !important;
          }
          
          .print\\:max-w-none {
            max-width: none !important;
          }
          
          /* Hide manual page number in footer when printing since CSS will handle it */
          .manual-page-number {
            display: none !important;
          }
          
          /* Compact print mode specific styles */
          .pdf-print-mode-compact {
            /* Further space optimization for compact mode */
            line-height: 1.3 !important;
          }
          
          /* Typography optimization for compact mode */
          .pdf-print-mode-compact h1 { font-size: 1.5rem !important; }
          .pdf-print-mode-compact h2 { font-size: 1.25rem !important; }
          .pdf-print-mode-compact h3 { font-size: 1.1rem !important; }
          .pdf-print-mode-compact h4 { font-size: 1rem !important; }
          .pdf-print-mode-compact p, 
          .pdf-print-mode-compact div,
          .pdf-print-mode-compact td { font-size: 11px !important; }
          
          /* Spacing optimization */
          .pdf-print-mode-compact .compact-spacing {
            margin-bottom: 0.75rem !important;
          }
          
          .pdf-print-mode-compact .compact-gap {
            gap: 1rem !important;
          }
        }
      `}</style>
    </div>
  )
}