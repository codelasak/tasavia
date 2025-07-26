import { Button } from '@/components/ui/button'
import { ArrowLeft, Printer } from 'lucide-react'

interface PDFPrintControlsProps {
  onBack?: () => void
  onPrint: () => void
  showExportButton?: boolean
  exportButtonComponent?: React.ReactNode
  className?: string
}

export default function PDFPrintControls({
  onBack,
  onPrint,
  showExportButton = false,
  exportButtonComponent,
  className = ''
}: PDFPrintControlsProps) {
  return (
    <div className={`print:hidden mb-6 flex items-center justify-between ${className}`}>
      {onBack && (
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      )}
      
      <div className="flex space-x-2">
        {showExportButton && exportButtonComponent && exportButtonComponent}
        <Button onClick={onPrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>
    </div>
  )
}