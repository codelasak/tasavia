import Image from 'next/image'
import { format } from 'date-fns'

interface PDFHeaderCompactProps {
  documentType: string
  documentNumber: string
  documentDate: string | Date
  additionalInfo?: Array<{ label: string; value: string }>
}

export default function PDFHeaderCompact({ 
  documentType, 
  documentNumber, 
  documentDate,
  additionalInfo = []
}: PDFHeaderCompactProps) {
  const formattedDate = typeof documentDate === 'string' 
    ? format(new Date(documentDate), 'MMM dd, yyyy')
    : format(documentDate, 'MMM dd, yyyy')

  return (
    <div className="flex items-center justify-between mb-4 compact-spacing">
      <div className="flex items-center">
        <Image
          src="/logo.png"
          alt="TASAVIA"
          width={120}
          height={40}
          className="h-8 w-auto" // Reduced from h-12 to h-8
        />
      </div>
      <div className="text-right">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">{documentType}</h1>
        <div className="text-base font-semibold text-slate-700">{documentNumber}</div>
        <div className="text-xs text-slate-600">{formattedDate}</div>
        {additionalInfo.map((info, index) => (
          <div key={index} className="text-xs text-slate-600">
            {info.label}: {info.value}
          </div>
        ))}
      </div>
    </div>
  )
}