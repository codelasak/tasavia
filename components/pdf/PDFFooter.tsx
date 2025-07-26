import { format } from 'date-fns'

interface PDFFooterProps {
  documentType: string
  documentNumber: string
  status?: string
  additionalInfo?: Array<{ label: string; value: string }>
  className?: string
}

export default function PDFFooter({ 
  documentType, 
  documentNumber, 
  status,
  additionalInfo = [],
  className = ""
}: PDFFooterProps) {
  return (
    <div className={`flex justify-between items-center text-xs text-slate-500 mt-12 pt-4 border-t border-slate-200 ${className}`}>
      <div>
        <div>{documentType} generated on {format(new Date(), 'MMMM dd, yyyy HH:mm')}</div>
        <div className="mt-1">{documentType} Number: {documentNumber}</div>
        {status && <div className="mt-1">Status: {status}</div>}
        {additionalInfo.map((info, index) => (
          <div key={index} className="mt-1">{info.label}: {info.value}</div>
        ))}
      </div>
      <div className="text-right manual-page-number">
        <div className="font-medium">Page 1 of 1</div>
      </div>
    </div>
  )
}