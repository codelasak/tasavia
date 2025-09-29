import Image from 'next/image'

interface SignatureField {
  label: string
  value?: string
  height?: 'small' | 'medium' | 'large'
  type?: 'signature' | 'text' | 'date' | 'signature-image'
}

interface SignatureSection {
  title?: string
  titleClassName?: string
  fields: SignatureField[]
  className?: string
}

interface PDFSignatureBlockProps {
  sections: SignatureSection[]
  columns?: 1 | 2
  gap?: 'small' | 'medium' | 'large'
  className?: string
}

const heightClasses = {
  small: 'h-6',
  medium: 'h-8',
  large: 'h-20'
}

const signatureImageSizes = {
  small: { width: 85, height: 46 },    // ~1.85:1 aspect ratio from 914x494 - smaller
  medium: { width: 110, height: 60 },  // Scaled appropriately - smaller
  large: { width: 140, height: 76 }   // Scaled appropriately - smaller
}

const gapClasses = {
  small: 'gap-4',
  medium: 'gap-6',
  large: 'gap-8'
}

export default function PDFSignatureBlock({
  sections,
  columns = 1,
  gap = 'medium',
  className = ''
}: PDFSignatureBlockProps) {
  const gridClass = columns === 2 ? `grid grid-cols-2 ${gapClasses[gap]}` : 'flex flex-col'
  
  return (
    <div className={`${gridClass} ${className}`}>
      {sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className={`border border-slate-300 p-4 ${section.className || ''}`}>
          {section.title && (
            <h4 className={`font-bold text-slate-900 mb-4 text-center bg-slate-50 p-2 ${section.titleClassName || ''}`}>
              {section.title}
            </h4>
          )}
          
          <div className="space-y-3 text-sm">
            {section.fields.map((field, fieldIndex) => (
              <div key={fieldIndex}>
                <div className="font-semibold mb-1">{field.label}:</div>
                {field.value ? (
                  <div className="font-medium">{field.value}</div>
                ) : field.type === 'signature-image' ? (
                  <div className="mb-2">
                    <Image
                      src="/signature.png"
                      alt="Signature"
                      width={signatureImageSizes[field.height || 'medium'].width}
                      height={signatureImageSizes[field.height || 'medium'].height}
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className={`border-b border-slate-400 ${heightClasses[field.height || 'medium']} mb-2`}></div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}