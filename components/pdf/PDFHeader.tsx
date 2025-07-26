import Image from 'next/image'
import { format } from 'date-fns'

interface PDFHeaderProps {
  documentType: string
  documentNumber: string
  documentDate: string | Date
  additionalInfo?: Array<{ label: string; value: string }>
}

export default function PDFHeader({ 
  documentType, 
  documentNumber, 
  documentDate,
  additionalInfo = []
}: PDFHeaderProps) {
  const formattedDate = typeof documentDate === 'string' 
    ? format(new Date(documentDate), 'MMMM dd, yyyy')
    : format(documentDate, 'MMMM dd, yyyy')

  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center">
        <Image
          src="/logo.png"
          alt="TASAVIA"
          width={150}
          height={50}
          className="h-12 w-auto"
        />
      </div>
      <div className="text-right">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{documentType}</h1>
        <div className="text-lg font-semibold text-slate-700">{documentNumber}</div>
        <div className="text-sm text-slate-600">Date: {formattedDate}</div>
        {additionalInfo.map((info, index) => (
          <div key={index} className="text-sm text-slate-600">
            {info.label}: {info.value}
          </div>
        ))}
      </div>
    </div>
  )
}