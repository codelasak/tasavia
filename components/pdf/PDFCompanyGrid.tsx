interface CompanyAddress {
  address_line1: string
  address_line2?: string | null
  city?: string | null
  country?: string | null
  state?: string | null
  postal_code?: string | null
}

interface CompanyContact {
  contact_name: string
  phone?: string | null
  email?: string | null
}

interface CompanyInfo {
  company_name: string
  company_code?: string | null
  customer_number?: string | null
  my_company_name?: string
  my_company_code?: string
  company_addresses: CompanyAddress[]
  company_contacts: CompanyContact[]
}

interface ShipToInfo {
  company_name?: string | null
  address_details?: string | null
  contact_name?: string | null
  contact_phone?: string | null
  contact_email?: string | null
}

interface CompanySection {
  title: string
  company: CompanyInfo | null
  shipToData?: ShipToInfo | null
  customContent?: React.ReactNode
}

interface PDFCompanyGridProps {
  sections: CompanySection[]
  className?: string
}

function CompanySection({ section }: { section: CompanySection }) {
  const { title, company, shipToData, customContent } = section

  if (customContent) {
    return (
      <div>
        <h3 className="font-bold text-slate-900 mb-3 border-b pb-1">{title}:</h3>
        {customContent}
      </div>
    )
  }

  if (shipToData) {
    return (
      <div>
        <h3 className="font-bold text-slate-900 mb-3 border-b pb-1">{title}:</h3>
        <div className="space-y-1 text-sm">
          {shipToData.company_name?.trim() && (
            <div className="font-semibold">{shipToData.company_name}</div>
          )}
          {shipToData.address_details?.trim() && (
            <div className="whitespace-pre-line">{shipToData.address_details}</div>
          )}
          {shipToData.contact_name?.trim() && (
            <div>Contact: {shipToData.contact_name}</div>
          )}
          {shipToData.contact_phone?.trim() && (
            <div>Tel: {shipToData.contact_phone}</div>
          )}
          {shipToData.contact_email?.trim() && (
            <div>Email: {shipToData.contact_email}</div>
          )}
        </div>
      </div>
    )
  }

  if (!company) {
    return (
      <div>
        <h3 className="font-bold text-slate-900 mb-3 border-b pb-1">{title}:</h3>
        <div className="space-y-1 text-sm text-slate-500">
          No information available
        </div>
      </div>
    )
  }

  return (
    <div>
      <h3 className="font-bold text-slate-900 mb-3 border-b pb-1">{title}:</h3>
      <div className="space-y-1 text-sm">
        <div className="font-semibold">
          {company.my_company_name || company.company_name}
        </div>
        <div>{company.my_company_code || company.company_code}</div>
        {company.customer_number && (
          <div className="font-medium text-blue-600">Customer #: {company.customer_number}</div>
        )}
        {company.company_addresses?.length > 0 && (
          <>
            {company.company_addresses.map((addr, idx) => (
              <div key={idx}>
                <div>{addr.address_line1}</div>
                {addr.address_line2 && <div>{addr.address_line2}</div>}
                {(addr.city || addr.country || addr.state) && (
                  <div>
                    {[addr.city, addr.state].filter(Boolean).join(', ')}
                    {(addr.city || addr.state) && addr.country && ', '}
                    {addr.country}
                    {addr.postal_code && ` ${addr.postal_code}`}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
        {company.company_contacts?.length > 0 && (
          <>
            {company.company_contacts.map((contact, idx) => (
              <div key={idx}>
                {contact.phone && <div>Tel: {contact.phone}</div>}
                {contact.email && <div>Email: {contact.email}</div>}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

export default function PDFCompanyGrid({ sections, className = "" }: PDFCompanyGridProps) {
  // Determine grid columns based on number of sections
  const gridCols = sections.length === 3 ? 'grid-cols-3' : 
                   sections.length === 2 ? 'grid-cols-2' : 
                   'grid-cols-1'

  return (
    <div className={`grid gap-6 mb-8 ${gridCols} ${className}`}>
      {sections.map((section, index) => (
        <CompanySection key={index} section={section} />
      ))}
    </div>
  )
}

// Helper function to determine if ship-to info is different from bill-to
export function shouldShowShipTo(
  billTo: CompanyInfo | null,
  shipTo: CompanyInfo | null,
  shipToData?: ShipToInfo | null
): boolean {
  // If we have explicit ship-to data, check if it's meaningful
  if (shipToData) {
    return !!(
      shipToData.company_name?.trim() || 
      shipToData.address_details?.trim() ||
      shipToData.contact_name?.trim()
    )
  }

  // If ship-to company is different from bill-to company
  if (billTo && shipTo) {
    return billTo.company_name !== shipTo.company_name
  }

  return false
}