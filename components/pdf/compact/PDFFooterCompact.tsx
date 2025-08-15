import { format } from 'date-fns'

interface PDFFooterCompactProps {
  documentType: string
  documentNumber: string
  status?: string
  additionalInfo?: Array<{ label: string; value: string }>
  className?: string
}

export default function PDFFooterCompact({ 
  documentType, 
  documentNumber, 
  status,
  additionalInfo = [],
  className = ""
}: PDFFooterCompactProps) {
  return (
    <div className={`flex justify-between items-center text-xs text-slate-500 mt-6 pt-2 border-t border-slate-200 ${className}`}>
      <div className="leading-tight">
        <div>{documentType} generated on {format(new Date(), 'MMM dd, yyyy HH:mm')}</div>
        <div className="mt-0.5">{documentType} Number: {documentNumber}</div>
        {status && <div className="mt-0.5">Status: {status}</div>}
        {additionalInfo.map((info, index) => (
          <div key={index} className="mt-0.5">{info.label}: {info.value}</div>
        ))}
      </div>
      <div className="text-right manual-page-number">
        <div className="font-medium text-xs">Page 1 of 1</div>
      </div>
    </div>
  )
}