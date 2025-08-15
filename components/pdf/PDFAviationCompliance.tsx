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

interface PDFAviationComplianceProps {
  data: Partial<AviationComplianceData>
  title?: string
  showTitle?: boolean
  compact?: boolean
  className?: string
}

export default function PDFAviationCompliance({
  data,
  title = "Aviation Compliance Information",
  showTitle = true,
  compact = false,
  className = ""
}: PDFAviationComplianceProps) {
  const hasData = Object.values(data).some(value => value && value.toString().trim().length > 0)
  
  if (!hasData) {
    return null
  }

  const textSize = compact ? 'text-xs' : 'text-sm'
  const spacing = compact ? 'space-y-1' : 'space-y-2'
  const marginBottom = compact ? 'mb-3' : 'mb-6'
  const padding = compact ? 'p-3' : 'p-4'

  return (
    <div className={`border border-slate-300 ${padding} ${marginBottom} ${className}`}>
      {showTitle && (
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
          <Plane className={compact ? "h-4 w-4" : "h-5 w-5"} />
          <h3 className={`font-bold text-slate-900 ${compact ? 'text-sm' : 'text-base'}`}>
            {title}
          </h3>
        </div>
      )}

      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${compact ? 'gap-3' : 'gap-4'}`}>
        
        {/* Source & Origin Section */}
        {(data.obtainedFrom || data.originCountry) && (
          <div className={spacing}>
            <h4 className={`font-semibold text-slate-700 mb-1 ${compact ? 'text-xs' : 'text-sm'}`}>
              Source & Origin
            </h4>
            {data.obtainedFrom && (
              <div className={textSize}>
                <span className="text-slate-500">Obtained From:</span>
                <div className="font-medium">{data.obtainedFrom}</div>
              </div>
            )}
            {data.originCountry && (
              <div className={textSize}>
                <span className="text-slate-500 flex items-center gap-1">
                  <MapPin className={compact ? "h-3 w-3" : "h-4 w-4"} />
                  Origin Country:
                </span>
                <div className="font-medium">
                  {data.originCountryName || data.originCountry}
                  {data.originCountryName && data.originCountry && (
                    <span className="text-slate-400 ml-1">({data.originCountry})</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Traceability Section */}
        {(data.traceableToAirline || data.traceableToMSN || data.traceableToRegistration) && (
          <div className={spacing}>
            <h4 className={`font-semibold text-slate-700 mb-1 ${compact ? 'text-xs' : 'text-sm'}`}>
              Traceability
            </h4>
            {data.traceableToAirline && (
              <div className={textSize}>
                <span className="text-slate-500">Airline:</span>
                <div className="font-medium flex items-center gap-2">
                  {data.traceableToAirline}
                  <div className="flex gap-1">
                    {data.traceableToAirlineIATA && (
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        {data.traceableToAirlineIATA}
                      </Badge>
                    )}
                    {data.traceableToAirlineICAO && (
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        {data.traceableToAirlineICAO}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}
            {data.traceableToMSN && (
              <div className={textSize}>
                <span className="text-slate-500">MSN:</span>
                <div className="font-medium font-mono">{data.traceableToMSN}</div>
              </div>
            )}
            {data.traceableToRegistration && (
              <div className={textSize}>
                <span className="text-slate-500">Registration:</span>
                <div className="font-medium font-mono">{data.traceableToRegistration}</div>
              </div>
            )}
          </div>
        )}

        {/* Certificate Section */}
        {(data.lastCertificate || data.certificateAuthority || data.certificateNumber) && (
          <div className={spacing}>
            <h4 className={`font-semibold text-slate-700 mb-1 ${compact ? 'text-xs' : 'text-sm'}`}>
              Certification
            </h4>
            {data.lastCertificate && (
              <div className={textSize}>
                <span className="text-slate-500 flex items-center gap-1">
                  <FileText className={compact ? "h-3 w-3" : "h-4 w-4"} />
                  Certificate Type:
                </span>
                <div className="font-medium">{data.lastCertificate}</div>
              </div>
            )}
            {data.certificateAuthority && (
              <div className={textSize}>
                <span className="text-slate-500">Authority:</span>
                <div className="font-medium">{data.certificateAuthority}</div>
              </div>
            )}
            {data.certificateNumber && (
              <div className={textSize}>
                <span className="text-slate-500">Certificate #:</span>
                <div className="font-medium font-mono">{data.certificateNumber}</div>
              </div>
            )}
            {data.certificateExpiry && (
              <div className={textSize}>
                <span className="text-slate-500">Expires:</span>
                <div className="font-medium">{new Date(data.certificateExpiry).toLocaleDateString()}</div>
              </div>
            )}
          </div>
        )}

        {/* Usage & Condition Section */}
        {(data.endUse || data.intendedUse || data.partCondition || data.qualitySystemStandard) && (
          <div className={spacing}>
            <h4 className={`font-semibold text-slate-700 mb-1 ${compact ? 'text-xs' : 'text-sm'}`}>
              Usage & Condition
            </h4>
            {data.endUse && (
              <div className={textSize}>
                <span className="text-slate-500">End Use:</span>
                <div className="font-medium">{data.endUse}</div>
              </div>
            )}
            {data.intendedUse && (
              <div className={textSize}>
                <span className="text-slate-500">Intended Use:</span>
                <div className="font-medium capitalize">{data.intendedUse}</div>
              </div>
            )}
            {data.partCondition && (
              <div className={textSize}>
                <span className="text-slate-500">Condition:</span>
                <div className="font-medium">
                  <Badge 
                    variant={data.partCondition === 'new' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {data.partCondition === 'ar' ? 'As Removed' : 
                     data.partCondition.charAt(0).toUpperCase() + data.partCondition.slice(1)}
                  </Badge>
                </div>
              </div>
            )}
            {data.qualitySystemStandard && (
              <div className={textSize}>
                <span className="text-slate-500">Quality Standard:</span>
                <div className="font-medium">
                  <Badge variant="outline" className="text-xs">
                    {data.qualitySystemStandard}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Compliance Status Indicator */}
      <div className={`mt-3 pt-2 border-t border-slate-100 flex items-center justify-between ${textSize}`}>
        <div className="flex items-center gap-2">
          {(data.lastCertificate && data.obtainedFrom && data.originCountry) ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-green-700 font-medium">Aviation Compliance Documentation Available</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="text-amber-700 font-medium">Partial Aviation Compliance Information</span>
            </>
          )}
        </div>
        <div className="text-slate-400 text-xs">
          Generated: {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  )
}