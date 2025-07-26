'use client'

import { ReactNode, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Printer } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface PDFLayoutProps {
  title: string
  documentNumber: string
  onDownload?: () => void
  children: ReactNode
  className?: string
}

export default function PDFLayout({ 
  title, 
  documentNumber, 
  onDownload, 
  children,
  className = "" 
}: PDFLayoutProps) {
  const router = useRouter()

  useEffect(() => {
    // Add PDF print mode class to html element when component mounts
    document.documentElement.classList.add('pdf-print-mode')
    
    // Cleanup function to remove the class when component unmounts
    return () => {
      document.documentElement.classList.remove('pdf-print-mode')
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
      <div className="no-print bg-slate-50 border-b p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-semibold">{title} - {documentNumber}</h1>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* PDF Content */}
      <div className={`max-w-4xl mx-auto p-8 print:p-0 print:max-w-none ${className}`}>
        {children}
      </div>

      {/* Unified Print Styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          body {
            margin: 0;
            padding: 0;
          }
          
          @page {
            margin: 0.5in;
            size: A4;
            @bottom-right {
              content: "Page " counter(page) " of " counter(pages);
              font-size: 10px;
              color: #6b7280;
            }
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
        }
      `}</style>
    </div>
  )
}