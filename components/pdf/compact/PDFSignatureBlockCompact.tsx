interface SignatureFieldCompact {
  label: string
  value?: string
  height?: 'small' | 'medium' | 'large'
  type?: 'signature' | 'text' | 'date'
}

interface SignatureSectionCompact {
  title?: string
  titleClassName?: string
  fields: SignatureFieldCompact[]
  className?: string
}

interface PDFSignatureBlockCompactProps {
  sections: SignatureSectionCompact[]
  columns?: 1 | 2
  gap?: 'small' | 'medium' | 'large'
  className?: string
}

const heightClassesCompact = {
  small: 'h-4',      // Reduced from h-6
  medium: 'h-5',     // Reduced from h-8
  large: 'h-12'      // Reduced from h-20
}

const gapClassesCompact = {
  small: 'gap-2',    // Reduced from gap-4
  medium: 'gap-3',   // Reduced from gap-6
  large: 'gap-4'     // Reduced from gap-8
}

export default function PDFSignatureBlockCompact({
  sections,
  columns = 1,
  gap = 'medium',
  className = ''
}: PDFSignatureBlockCompactProps) {
  const gridClass = columns === 2 ? `grid grid-cols-2 ${gapClassesCompact[gap]}` : 'flex flex-col'
  
  return (
    <div className={`${gridClass} ${className}`}>
      {sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className={`border border-slate-300 p-2 ${section.className || ''}`}>
          {section.title && (
            <h4 className={`font-bold text-slate-900 mb-2 text-center bg-slate-50 p-1 text-xs ${section.titleClassName || ''}`}>
              {section.title}
            </h4>
          )}
          
          <div className="space-y-2 text-xs">
            {section.fields.map((field, fieldIndex) => (
              <div key={fieldIndex}>
                <div className="font-semibold mb-0.5 text-xs">{field.label}:</div>
                {field.value ? (
                  <div className="font-medium text-xs">{field.value}</div>
                ) : (
                  <div className={`border-b border-slate-400 ${heightClassesCompact[field.height || 'medium']} mb-1`}></div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}