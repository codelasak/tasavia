// Date formatting using native JavaScript methods

// ATA 106 PDF Generation Utility
// Generates official ATA 106 forms for regulatory compliance

export interface ATA106PDFData {
  // Form identification
  form_number: string
  date_issued: Date
  page_number: string
  
  // Organizations
  transferor: {
    organization_name: string
    organization_code: string
    address: string
    authorized_representative?: string
    title_position?: string
  }
  
  transferee: {
    organization_name: string
    organization_code: string
    address: string
    authorized_representative?: string
    title_position?: string
  }
  
  // Transfer information
  transfer_info: {
    transfer_type: 'SALE' | 'LOAN' | 'LEASE' | 'CONSIGNMENT' | 'EXCHANGE' | 'RETURN'
    transfer_date: Date
    reference_number: string
    contract_number?: string
  }
  
  // Parts information
  parts: Array<{
    line_number: number
    part_number: string
    serial_number?: string
    description: string
    quantity: number
    condition: string
    application?: string
    dimensions?: string
    traceability_source: string
    last_certified_agency: string
  }>
  
  // Certification (optional for PDF generation)
  certification?: {
    transferor_signature?: string
    transferor_name?: string
    transferor_title?: string
    transferor_date?: Date
    transferor_certificate_number?: string
    transferee_signature?: string
    transferee_name?: string
    transferee_title?: string
    transferee_date?: Date
    transferee_certificate_number?: string
  }
}

export interface ATA106PDFOptions {
  format?: 'A4' | 'Letter'
  orientation?: 'portrait' | 'landscape'
  includeSignatures?: boolean
  includeWatermark?: boolean
  watermarkText?: string
  fontSize?: number
  margins?: {
    top: number
    right: number
    bottom: number
    left: number
  }
}

/**
 * Generate ATA 106 PDF document as HTML string
 * This HTML can be converted to PDF using libraries like puppeteer, jsPDF, or react-pdf
 */
export function generateATA106HTML(data: ATA106PDFData, options: ATA106PDFOptions = {}): string {
  const {
    format = 'A4',
    orientation = 'portrait',
    includeSignatures = false,
    includeWatermark = false,
    watermarkText = 'DRAFT',
    fontSize = 12,
    margins = { top: 20, right: 20, bottom: 20, left: 20 }
  } = options

  const pageWidth = format === 'A4' ? '210mm' : '8.5in'
  const pageHeight = format === 'A4' ? '297mm' : '11in'

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ATA 106 Form - ${data.form_number}</title>
    <style>
        @page {
            size: ${pageWidth} ${pageHeight} ${orientation};
            margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: Arial, sans-serif;
            font-size: ${fontSize}px;
            line-height: 1.4;
            color: #000;
            background: #fff;
            ${includeWatermark ? `
                position: relative;
                background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 200'%3e%3ctext x='50%25' y='50%25' font-size='48' fill='%23f0f0f0' text-anchor='middle' dominant-baseline='middle' transform='rotate(-45 150 100)'%3e${watermarkText}%3c/text%3e%3c/svg%3e");
                background-repeat: repeat;
                background-size: 300px 200px;
            ` : ''}
        }
        
        .form-container {
            max-width: 100%;
            margin: 0 auto;
            background: #fff;
            position: relative;
            z-index: 1;
        }
        
        .header {
            border: 2px solid #000;
            margin-bottom: 6mm;
        }
        
        .header-title {
            background: #f0f0f0;
            padding: 8px;
            text-align: center;
            border-bottom: 2px solid #000;
        }
        
        .header-title h1 {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 2px;
        }
        
        .header-title .spec {
            font-size: 16px;
            font-weight: bold;
        }
        
        .header-title .compliance {
            font-size: 10px;
            margin-top: 2px;
        }
        
        .form-info {
            padding: 8px;
            background: #fff;
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 8px;
        }
        
        .form-info-item {
            border: 1px solid #666;
            padding: 4px;
            min-height: 40px;
        }
        
        .form-info-label {
            font-weight: bold;
            font-size: 10px;
        }
        
        .form-info-value {
            font-family: monospace;
            font-size: 11px;
            margin-top: 2px;
        }
        
        .section {
            border: 2px solid #000;
            margin-bottom: 6mm;
        }
        
        .section-header {
            background: #f0f0f0;
            padding: 4px;
            border-bottom: 2px solid #000;
            text-align: center;
            font-weight: bold;
        }
        
        .section-content {
            padding: 8px;
        }
        
        .transfer-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 8px;
            margin-bottom: 8px;
        }
        
        .transfer-item {
            border: 1px solid #666;
            padding: 4px;
            min-height: 35px;
        }
        
        .org-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0;
        }
        
        .org-section {
            padding: 8px;
        }
        
        .org-section:first-child {
            border-right: 1px solid #000;
        }
        
        .org-header {
            text-align: center;
            background: #f8f8f8;
            padding: 4px;
            border: 1px solid #666;
            font-weight: bold;
            margin-bottom: 8px;
        }
        
        .org-field {
            border: 1px solid #666;
            padding: 4px;
            margin-bottom: 8px;
            min-height: 30px;
        }
        
        .org-field-label {
            font-weight: bold;
            font-size: 10px;
        }
        
        .org-field-value {
            font-size: 11px;
            margin-top: 2px;
        }
        
        .parts-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
        }
        
        .parts-table th,
        .parts-table td {
            border: 1px solid #000;
            padding: 2px;
            text-align: center;
            vertical-align: top;
        }
        
        .parts-table th {
            background: #f0f0f0;
            font-weight: bold;
            font-size: 8px;
        }
        
        .parts-table .part-number {
            font-family: monospace;
            font-weight: bold;
        }
        
        .parts-table .description {
            text-align: left;
            max-width: 120px;
            word-wrap: break-word;
        }
        
        .certification-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0;
        }
        
        .cert-section {
            padding: 8px;
        }
        
        .cert-section:first-child {
            border-right: 1px solid #000;
        }
        
        .cert-header {
            text-align: center;
            background: #f8f8f8;
            padding: 4px;
            border: 1px solid #666;
            font-weight: bold;
            margin-bottom: 8px;
        }
        
        .cert-field {
            border: 1px solid #666;
            padding: 4px;
            margin-bottom: 8px;
            min-height: 25px;
        }
        
        .cert-field-label {
            font-weight: bold;
            font-size: 10px;
            margin-bottom: 2px;
        }
        
        .signature-line {
            border-bottom: 1px solid #666;
            height: 20px;
            margin-bottom: 4px;
        }
        
        .compliance-text {
            font-size: 9px;
            line-height: 1.3;
            text-align: justify;
            margin-bottom: 8px;
        }
        
        .compliance-text strong {
            font-weight: bold;
        }
        
        .footer {
            border-top: 1px solid #ccc;
            padding-top: 8px;
            text-align: center;
            font-size: 9px;
            color: #666;
            margin-top: 8mm;
        }
        
        .footer-line {
            margin: 2px 0;
        }
        
        .transfer-checkbox {
            display: inline-block;
            margin-right: 10px;
        }
        
        .checkbox-checked {
            font-weight: bold;
        }
        
        @media print {
            body { margin: 0; }
            .form-container { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="form-container">
        <!-- Header -->
        <div class="header">
            <div class="header-title">
                <h1>AIRCRAFT PARTS TRACEABILITY FORM</h1>
                <div class="spec">ATA SPEC 106 - FORM 1</div>
                <div class="compliance">
                    In accordance with ATA Specification 106 for Aircraft Parts Traceability
                </div>
            </div>
            
            <div class="form-info">
                <div class="form-info-item">
                    <div class="form-info-label">FORM NUMBER:</div>
                    <div class="form-info-value">${data.form_number}</div>
                </div>
                <div class="form-info-item">
                    <div class="form-info-label">DATE ISSUED:</div>
                    <div class="form-info-value">${new Date(data.date_issued).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                </div>
                <div class="form-info-item">
                    <div class="form-info-label">PAGE:</div>
                    <div class="form-info-value">${data.page_number}</div>
                </div>
            </div>
        </div>

        <!-- Section I - Transfer Information -->
        <div class="section">
            <div class="section-header">SECTION I - TRANSFER INFORMATION</div>
            <div class="section-content">
                <div class="transfer-grid">
                    <div class="transfer-item">
                        <div class="form-info-label">TRANSFER TYPE:</div>
                        <div style="margin-top: 4px;">
                            ${generateTransferTypeCheckboxes(data.transfer_info.transfer_type)}
                        </div>
                    </div>
                    <div class="transfer-item">
                        <div class="form-info-label">TRANSFER DATE:</div>
                        <div class="form-info-value">${new Date(data.transfer_info.transfer_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    </div>
                    <div class="transfer-item">
                        <div class="form-info-label">REFERENCE NUMBER:</div>
                        <div class="form-info-value">${data.transfer_info.reference_number}</div>
                    </div>
                </div>
                ${data.transfer_info.contract_number ? `
                <div class="transfer-item" style="margin-top: 8px;">
                    <div class="form-info-label">CONTRACT NUMBER:</div>
                    <div class="form-info-value">${data.transfer_info.contract_number}</div>
                </div>
                ` : ''}
            </div>
        </div>

        <!-- Section II - Organization Information -->
        <div class="section">
            <div class="section-header">SECTION II - ORGANIZATION INFORMATION</div>
            <div class="org-grid">
                <div class="org-section">
                    <div class="org-header">TRANSFEROR (FROM)</div>
                    <div class="org-field">
                        <div class="org-field-label">ORGANIZATION NAME:</div>
                        <div class="org-field-value">${data.transferor.organization_name}</div>
                    </div>
                    <div class="org-field">
                        <div class="org-field-label">ORGANIZATION CODE:</div>
                        <div class="org-field-value">${data.transferor.organization_code}</div>
                    </div>
                    <div class="org-field">
                        <div class="org-field-label">ADDRESS:</div>
                        <div class="org-field-value">${data.transferor.address}</div>
                    </div>
                    <div class="org-field">
                        <div class="org-field-label">AUTHORIZED REPRESENTATIVE:</div>
                        <div class="org-field-value">${data.transferor.authorized_representative || ''}</div>
                    </div>
                    <div class="org-field">
                        <div class="org-field-label">TITLE/POSITION:</div>
                        <div class="org-field-value">${data.transferor.title_position || ''}</div>
                    </div>
                </div>

                <div class="org-section">
                    <div class="org-header">TRANSFEREE (TO)</div>
                    <div class="org-field">
                        <div class="org-field-label">ORGANIZATION NAME:</div>
                        <div class="org-field-value">${data.transferee.organization_name}</div>
                    </div>
                    <div class="org-field">
                        <div class="org-field-label">ORGANIZATION CODE:</div>
                        <div class="org-field-value">${data.transferee.organization_code}</div>
                    </div>
                    <div class="org-field">
                        <div class="org-field-label">ADDRESS:</div>
                        <div class="org-field-value">${data.transferee.address}</div>
                    </div>
                    <div class="org-field">
                        <div class="org-field-label">AUTHORIZED REPRESENTATIVE:</div>
                        <div class="org-field-value">${data.transferee.authorized_representative || ''}</div>
                    </div>
                    <div class="org-field">
                        <div class="org-field-label">TITLE/POSITION:</div>
                        <div class="org-field-value">${data.transferee.title_position || ''}</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Section III - Aircraft Parts Traceability Record -->
        <div class="section">
            <div class="section-header">SECTION III - AIRCRAFT PARTS TRACEABILITY RECORD</div>
            <div class="section-content">
                <table class="parts-table">
                    <thead>
                        <tr>
                            <th>LINE</th>
                            <th>PART NUMBER</th>
                            <th>SERIAL NUMBER</th>
                            <th>DESCRIPTION</th>
                            <th>QTY</th>
                            <th>CONDITION</th>
                            <th>APPLICATION</th>
                            <th>DIMENSIONS</th>
                            <th>TRACEABILITY SOURCE</th>
                            <th>LAST CERTIFIED AGENCY</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.parts.map(part => `
                            <tr>
                                <td>${part.line_number}</td>
                                <td class="part-number">${part.part_number}</td>
                                <td>${part.serial_number || 'N/A'}</td>
                                <td class="description">${part.description}</td>
                                <td>${part.quantity}</td>
                                <td>${part.condition}</td>
                                <td>${part.application || 'N/S'}</td>
                                <td>${part.dimensions || 'N/S'}</td>
                                <td>${part.traceability_source}</td>
                                <td>${part.last_certified_agency}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        ${includeSignatures ? generateCertificationSection(data.certification) : ''}

        <!-- Section V - Regulatory Compliance -->
        <div class="section">
            <div class="section-header">SECTION V - REGULATORY COMPLIANCE</div>
            <div class="section-content">
                <div class="compliance-text">
                    <div style="font-weight: bold; margin-bottom: 4px;">NOTICE TO RECIPIENTS:</div>
                    <div style="margin-bottom: 8px;">
                        This form is submitted in accordance with ATA Specification 106 for Aircraft Parts Traceability. 
                        Recipients are advised that the parts described herein are subject to applicable airworthiness 
                        regulations and may only be installed on aircraft in accordance with approved procedures by 
                        properly certificated personnel.
                    </div>
                    <div style="margin-bottom: 8px;">
                        <strong>EXPORT CONTROL:</strong> These parts may be subject to export control regulations. 
                        Consult applicable export control laws before transferring or exporting these parts outside 
                        the country of origin.
                    </div>
                    <div>
                        <strong>RECORD RETENTION:</strong> This form and supporting documentation must be retained 
                        in accordance with applicable regulations for the operational life of the aircraft or 
                        component, whichever is longer.
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <div class="footer-line">
                This ATA 106 form was generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} by ${data.transferor.organization_name}
            </div>
            <div class="footer-line">
                Reference: ${data.transfer_info.reference_number} | Form: ${data.form_number}
            </div>
            <div class="footer-line" style="font-style: italic;">
                This form complies with ATA Specification 106 for Aircraft Parts Traceability
            </div>
        </div>
    </div>
</body>
</html>
  `.trim()
}

function generateTransferTypeCheckboxes(selectedType: string): string {
  const types = ['SALE', 'LOAN', 'LEASE', 'OTHER']
  
  return types.map(type => {
    const isChecked = type === selectedType || (selectedType === 'CONSIGNMENT' && type === 'OTHER')
    const symbol = isChecked ? '☑' : '☐'
    const className = isChecked ? 'checkbox-checked' : ''
    
    return `<span class="transfer-checkbox ${className}">${symbol} ${type}</span>`
  }).join('')
}

function generateCertificationSection(certification?: ATA106PDFData['certification']): string {
  if (!certification) return ''
  
  return `
    <!-- Section IV - Certification and Compliance -->
    <div class="section">
        <div class="section-header">SECTION IV - CERTIFICATION AND COMPLIANCE</div>
        <div class="section-content">
            <!-- Certification Statement -->
            <div style="border-bottom: 1px solid #000; padding-bottom: 8px; margin-bottom: 8px;">
                <div class="compliance-text" style="font-weight: bold; margin-bottom: 8px;">CERTIFICATION STATEMENT:</div>
                <div class="compliance-text" style="margin-bottom: 8px;">
                    I hereby certify that the information contained in this Aircraft Parts Traceability Form is 
                    complete and accurate to the best of my knowledge and belief. The parts described herein have 
                    been maintained in accordance with applicable airworthiness regulations, manufacturer's 
                    instructions, and industry standards. All records related to the maintenance, repair, and 
                    alteration of these parts are on file and available for inspection by authorized personnel.
                </div>
                <div class="compliance-text" style="margin-bottom: 8px;">
                    This certification is made in compliance with ATA Specification 106 for Aircraft Parts 
                    Traceability and applicable Federal Aviation Regulations (FAR) or equivalent international 
                    aviation regulations. The undersigned understands that any false, fictitious, or fraudulent 
                    statements may subject the person making such statements to criminal prosecution under 
                    applicable law.
                </div>
            </div>
            
            <!-- Signature Blocks -->
            <div class="certification-grid">
                <div class="cert-section">
                    <div class="cert-header">TRANSFEROR CERTIFICATION</div>
                    <div class="cert-field">
                        <div class="cert-field-label">AUTHORIZED SIGNATURE:</div>
                        <div class="signature-line"></div>
                    </div>
                    <div class="cert-field">
                        <div class="cert-field-label">PRINT NAME:</div>
                        <div class="org-field-value">${certification.transferor_name || ''}</div>
                    </div>
                    <div class="cert-field">
                        <div class="cert-field-label">TITLE/POSITION:</div>
                        <div class="org-field-value">${certification.transferor_title || ''}</div>
                    </div>
                    <div class="cert-field">
                        <div class="cert-field-label">DATE:</div>
                        <div class="org-field-value">${certification.transferor_date ? new Date(certification.transferor_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</div>
                    </div>
                    <div class="cert-field">
                        <div class="cert-field-label">CERTIFICATE/LICENSE NO.:</div>
                        <div class="org-field-value">${certification.transferor_certificate_number || ''}</div>
                    </div>
                </div>

                <div class="cert-section">
                    <div class="cert-header">TRANSFEREE ACCEPTANCE</div>
                    <div class="cert-field">
                        <div class="cert-field-label">AUTHORIZED SIGNATURE:</div>
                        <div class="signature-line"></div>
                    </div>
                    <div class="cert-field">
                        <div class="cert-field-label">PRINT NAME:</div>
                        <div class="org-field-value">${certification.transferee_name || ''}</div>
                    </div>
                    <div class="cert-field">
                        <div class="cert-field-label">TITLE/POSITION:</div>
                        <div class="org-field-value">${certification.transferee_title || ''}</div>
                    </div>
                    <div class="cert-field">
                        <div class="cert-field-label">DATE:</div>
                        <div class="org-field-value">${certification.transferee_date ? new Date(certification.transferee_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</div>
                    </div>
                    <div class="cert-field">
                        <div class="cert-field-label">CERTIFICATE/LICENSE NO.:</div>
                        <div class="org-field-value">${certification.transferee_certificate_number || ''}</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  `
}

/**
 * Convert sales order data to ATA 106 PDF format
 */
export function convertSalesOrderToATA106(salesOrderData: any): ATA106PDFData {
  const traceableItems = salesOrderData.sales_order_items.filter((item: any) => 
    item.inventory?.traceability_source || 
    item.inventory?.traceable_to || 
    item.inventory?.last_certified_agency
  )

  if (traceableItems.length === 0) {
    throw new Error('No traceable items found in sales order')
  }

  return {
    form_number: `ATA106-${salesOrderData.invoice_number}`,
    date_issued: salesOrderData.sales_date ? new Date(salesOrderData.sales_date) : new Date(),
    page_number: '1 of 1',
    
    transferor: {
      organization_name: salesOrderData.my_companies.my_company_name,
      organization_code: salesOrderData.my_companies.my_company_code,
      address: formatAddress(salesOrderData.my_companies),
    },
    
    transferee: {
      organization_name: salesOrderData.companies.company_name,
      organization_code: salesOrderData.companies.company_code,
      address: formatAddress(salesOrderData.companies),
    },
    
    transfer_info: {
      transfer_type: 'SALE',
      transfer_date: salesOrderData.sales_date ? new Date(salesOrderData.sales_date) : new Date(),
      reference_number: salesOrderData.invoice_number,
      contract_number: salesOrderData.customer_po_number,
    },
    
    parts: traceableItems.map((item: any, index: number) => ({
      line_number: item.line_number || index + 1,
      part_number: item.inventory.pn_master_table.pn,
      serial_number: item.inventory.serial_number,
      description: item.inventory.pn_master_table.description || 'N/A',
      quantity: item.inventory.quantity,
      condition: item.inventory.condition || 'N/A',
      application: item.inventory.application_code,
      dimensions: item.inventory.dimensions,
      traceability_source: item.inventory.traceability_source,
      last_certified_agency: item.inventory.last_certified_agency,
    })),
  }
}

function formatAddress(company: any): string {
  const parts = [
    company.address_line_1,
    company.address_line_2,
    company.city && company.state ? `${company.city}, ${company.state}` : company.city || company.state,
    company.postal_code,
    company.country
  ].filter(Boolean)
  
  return parts.join(', ')
}

/**
 * Generate PDF buffer using HTML content (requires puppeteer or similar)
 * This is a placeholder for actual PDF generation implementation
 */
export async function generateATA106PDF(
  data: ATA106PDFData, 
  options: ATA106PDFOptions = {}
): Promise<Buffer> {
  const html = generateATA106HTML(data, options)
  
  // This would typically use puppeteer, playwright, or similar to convert HTML to PDF
  // For now, we'll throw an error indicating this needs to be implemented
  throw new Error('PDF generation requires puppeteer or similar library to be implemented')
}

export { generateATA106HTML as default }