import { Badge } from '@/components/ui/badge'
import { FileText, Plane, MapPin, CheckCircle, AlertCircle } from 'lucide-react'

interface AviationComplianceData {
  // Certificate information
  lastCertificate?: string
  certificateAuthority?: string
  certificateNumber?: string
  certificateExpiry?: string
  
  // Traceability
  obtainedFrom: string
  traceableToAirline?: string
  traceableToAirlineIATA?: string
  traceableToAirlineICAO?: string
  traceableToMSN?: string
  traceableToRegistration?: string
  
  // Origin and compliance
  originCountry: string
  originCountryName?: string
  endUse?: string
  intendedUse?: string
  
  // Part condition
  partCondition?: 'new' | 'used' | 'refurbished' | 'ar' | 'serviceable' | 'unserviceable'
  qualitySystemStandard?: 'AS9100' | 'AS9110' | 'AS9120' | 'ISO9001' | 'other'
}

interface PDFAviationComplianceCompactProps {
  data: Partial<AviationComplianceData>
  title?: string
  showTitle?: boolean
  className?: string
}

export default function PDFAviationComplianceCompact({
  data,
  title = "Aviation Compliance",
  showTitle = true,
  className = ""
}: PDFAviationComplianceCompactProps) {
  const hasData = Object.values(data).some(value => value && value.toString().trim().length > 0)
  
  if (!hasData) {
    return null
  }

  return (
    <div className={`border border-slate-300 p-2 mb-3 compact-spacing ${className}`}>
      {showTitle && (
        <div className="flex items-center gap-1 mb-2 pb-1 border-b border-slate-200">
          <Plane className="h-3 w-3" />
          <h3 className="font-bold text-slate-900 text-xs">{title}</h3>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        
        {/* Essential Info - 4 columns compact layout */}
        {data.obtainedFrom && (
          <div>
            <span className="text-slate-500 text-xs">Source:</span>
            <div className="font-medium leading-tight">{data.obtainedFrom}</div>
          </div>
        )}

        {data.originCountry && (
          <div>
            <span className="text-slate-500 text-xs flex items-center gap-0.5">
              <MapPin className="h-2 w-2" />Origin:
            </span>
            <div className="font-medium leading-tight">
              {data.originCountryName || data.originCountry}
            </div>
          </div>
        )}

        {data.traceableToAirline && (
          <div>
            <span className="text-slate-500 text-xs">Airline:</span>
            <div className="font-medium leading-tight flex items-center gap-1">
              <span className="truncate">{data.traceableToAirline}</span>
              {(data.traceableToAirlineIATA || data.traceableToAirlineICAO) && (
                <div className="flex gap-0.5">
                  {data.traceableToAirlineIATA && (
                    <Badge variant="outline" className="text-xs px-0.5 py-0 h-4">
                      {data.traceableToAirlineIATA}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {data.traceableToMSN && (
          <div>
            <span className="text-slate-500 text-xs">MSN:</span>
            <div className="font-medium font-mono leading-tight">{data.traceableToMSN}</div>
          </div>
        )}

        {data.lastCertificate && (
          <div>
            <span className="text-slate-500 text-xs flex items-center gap-0.5">
              <FileText className="h-2 w-2" />Cert:
            </span>
            <div className="font-medium leading-tight">{data.lastCertificate}</div>
          </div>
        )}

        {data.certificateAuthority && (
          <div>
            <span className="text-slate-500 text-xs">Authority:</span>
            <div className="font-medium leading-tight">{data.certificateAuthority}</div>
          </div>
        )}

        {data.partCondition && (
          <div>
            <span className="text-slate-500 text-xs">Condition:</span>
            <div className="font-medium leading-tight">
              <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                {data.partCondition === 'ar' ? 'AR' : 
                 data.partCondition.charAt(0).toUpperCase() + data.partCondition.slice(1)}
              </Badge>
            </div>
          </div>
        )}

        {data.qualitySystemStandard && (
          <div>
            <span className="text-slate-500 text-xs">Standard:</span>
            <div className="font-medium leading-tight">
              <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                {data.qualitySystemStandard}
              </Badge>
            </div>
          </div>
        )}
      </div>

      {/* Compact Status Indicator */}
      <div className="mt-2 pt-1 border-t border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          {(data.lastCertificate && data.obtainedFrom && data.originCountry) ? (
            <>
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span className="text-green-700 font-medium">Compliant</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-3 w-3 text-amber-600" />
              <span className="text-amber-700 font-medium">Partial</span>
            </>
          )}
        </div>
        <div className="text-slate-400 text-xs">
          {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  )
}