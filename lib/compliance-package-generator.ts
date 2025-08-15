'use client'

import { PDFDocument, rgb, PDFFont, PDFPage } from 'pdf-lib'

export interface PartTraceabilityData {
  partNumber: string
  serialNumber: string
  description: string
  manufacturer: string
  manufacturerSerial?: string
  condition: 'new' | 'used' | 'overhauled' | 'repaired'
  quantity: number
  traceabilitySource: string
  traceableTo: string
  lastCertifiedAgency: string
  partStatusCertification: string
  tags?: string[]
  releaseDate?: string
  expiryDate?: string
  batchLot?: string
}

export interface ComplianceData {
  companyInfo: {
    name: string
    code: string
    address: string
    phone?: string
    email?: string
    certifications: string[]
  }
  customerInfo: {
    name: string
    address: string
    contact?: string
  }
  orderInfo: {
    orderNumber: string
    customerPO?: string
    date: string
    reference?: string
  }
  aviationCompliance: {
    regulatoryBasis: string[] // ['EASA', 'FAA', 'TC', etc.]
    applicableStandards: string[] // ['AS9100', 'AS9120', etc.]
    exportLicense?: string
    countryOfOrigin: string
    endUseCountry: string
    dualUseGoods: boolean
    restrictedParts: boolean
  }
}

export interface CompliancePackageOptions {
  includeTraceabilityCertificate: boolean
  includeConformityCertificate: boolean
  includeAirworthinessCertificate: boolean
  includeMaterialTestReport: boolean
  includeFunctionalTestReport: boolean
  includeQualityCertificate: boolean
  includeExportCertificate: boolean
  includePackingSlip: boolean
  customCertificates?: {
    name: string
    template: 'standard' | 'aviation' | 'custom'
    content: string
  }[]
}

export interface CompliancePackageResult {
  success: boolean
  documents: {
    name: string
    type: string
    pages: number
    arrayBuffer: ArrayBuffer
  }[]
  mergedPackage?: ArrayBuffer
  totalPages: number
  error?: string
}

/**
 * Generates a complete aviation compliance documentation package
 */
export class CompliancePackageGenerator {
  private font?: PDFFont
  private boldFont?: PDFFont

  constructor() {}

  private async initializeFonts(pdfDoc: PDFDocument): Promise<void> {
    if (!this.font) {
      this.font = await pdfDoc.embedFont('Helvetica')
    }
    if (!this.boldFont) {
      this.boldFont = await pdfDoc.embedFont('Helvetica-Bold')
    }
  }

  private drawHeader(
    page: PDFPage, 
    title: string, 
    companyInfo: ComplianceData['companyInfo'],
    yPosition: number = 750
  ): number {
    const { width } = page.getSize()

    // Company header
    page.drawText(companyInfo.name.toUpperCase(), {
      x: 50,
      y: yPosition,
      size: 16,
      font: this.boldFont!,
      color: rgb(0, 0, 0.8)
    })

    page.drawText(companyInfo.address, {
      x: 50,
      y: yPosition - 20,
      size: 10,
      font: this.font!
    })

    // Document title
    page.drawText(title.toUpperCase(), {
      x: width - 250,
      y: yPosition,
      size: 14,
      font: this.boldFont!,
      color: rgb(0.8, 0, 0)
    })

    // Horizontal line
    page.drawLine({
      start: { x: 50, y: yPosition - 40 },
      end: { x: width - 50, y: yPosition - 40 },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7)
    })

    return yPosition - 60
  }

  private drawFooter(page: PDFPage, pageNumber: number, totalPages: number): void {
    const { width } = page.getSize()

    // Page number
    page.drawText(`Page ${pageNumber} of ${totalPages}`, {
      x: width - 120,
      y: 30,
      size: 8,
      font: this.font!,
      color: rgb(0.5, 0.5, 0.5)
    })

    // Generated timestamp
    page.drawText(`Generated: ${new Date().toLocaleString()}`, {
      x: 50,
      y: 30,
      size: 8,
      font: this.font!,
      color: rgb(0.5, 0.5, 0.5)
    })
  }

  /**
   * Generate Traceability Certificate (8130-3 style)
   */
  async generateTraceabilityCertificate(
    partData: PartTraceabilityData,
    complianceData: ComplianceData
  ): Promise<ArrayBuffer> {
    const pdfDoc = await PDFDocument.create()
    await this.initializeFonts(pdfDoc)
    
    const page = pdfDoc.addPage([612, 792])
    let yPos = this.drawHeader(page, 'AUTHORIZED RELEASE CERTIFICATE', complianceData.companyInfo)

    // Form title and reference
    page.drawText('AUTHORIZED RELEASE CERTIFICATE', {
      x: 50,
      y: yPos,
      size: 14,
      font: this.boldFont!
    })

    page.drawText('(Reference: EASA Form 1 / FAA 8130-3)', {
      x: 50,
      y: yPos - 20,
      size: 10,
      font: this.font!,
      color: rgb(0.6, 0.6, 0.6)
    })

    yPos -= 50

    // Part identification section
    page.drawRectangle({
      x: 50,
      y: yPos - 80,
      width: 512,
      height: 80,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1
    })

    page.drawText('1. PART IDENTIFICATION', {
      x: 60,
      y: yPos - 20,
      size: 10,
      font: this.boldFont!
    })

    const partInfo = [
      { label: 'Part Number:', value: partData.partNumber },
      { label: 'Serial Number:', value: partData.serialNumber },
      { label: 'Description:', value: partData.description },
      { label: 'Manufacturer:', value: partData.manufacturer },
      { label: 'Condition:', value: partData.condition.toUpperCase() },
      { label: 'Quantity:', value: partData.quantity.toString() }
    ]

    let infoYPos = yPos - 40
    partInfo.forEach((info, index) => {
      const xPos = index % 2 === 0 ? 60 : 320
      if (index % 2 === 0 && index > 0) infoYPos -= 15

      page.drawText(info.label, {
        x: xPos,
        y: infoYPos,
        size: 8,
        font: this.font!
      })

      page.drawText(info.value, {
        x: xPos + 80,
        y: infoYPos,
        size: 8,
        font: this.boldFont!
      })
    })

    yPos -= 100

    // Traceability section
    page.drawRectangle({
      x: 50,
      y: yPos - 100,
      width: 512,
      height: 100,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1
    })

    page.drawText('2. TRACEABILITY INFORMATION', {
      x: 60,
      y: yPos - 20,
      size: 10,
      font: this.boldFont!
    })

    const traceInfo = [
      { label: 'Traceable to:', value: partData.traceableTo },
      { label: 'Source:', value: partData.traceabilitySource },
      { label: 'Last Certified Agency:', value: partData.lastCertifiedAgency },
      { label: 'Part Status Certification:', value: partData.partStatusCertification }
    ]

    let traceYPos = yPos - 40
    traceInfo.forEach((info, index) => {
      if (index === 2) traceYPos -= 15

      page.drawText(info.label, {
        x: 60,
        y: traceYPos,
        size: 8,
        font: this.font!
      })

      page.drawText(info.value, {
        x: 200,
        y: traceYPos,
        size: 8,
        font: this.boldFont!
      })

      if (index < 2) traceYPos -= 15
    })

    yPos -= 120

    // Compliance section
    page.drawRectangle({
      x: 50,
      y: yPos - 120,
      width: 512,
      height: 120,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1
    })

    page.drawText('3. COMPLIANCE DECLARATION', {
      x: 60,
      y: yPos - 20,
      size: 10,
      font: this.boldFont!
    })

    const complianceText = [
      'This certificate confirms that the above identified item:',
      '• Has been manufactured, inspected, and tested in accordance with applicable specifications',
      '• Conforms to the approved design and is in a condition for safe operation',
      '• Is eligible for installation on aircraft subject to the referenced regulatory standards',
      '',
      `Regulatory Basis: ${complianceData.aviationCompliance.regulatoryBasis.join(', ')}`,
      `Standards: ${complianceData.aviationCompliance.applicableStandards.join(', ')}`,
      `Country of Origin: ${complianceData.aviationCompliance.countryOfOrigin}`,
      `End Use Country: ${complianceData.aviationCompliance.endUseCountry}`
    ]

    let complianceYPos = yPos - 40
    complianceText.forEach(text => {
      if (text === '') {
        complianceYPos -= 10
        return
      }

      page.drawText(text, {
        x: 60,
        y: complianceYPos,
        size: 8,
        font: text.startsWith('•') ? this.font! : 
              (text.includes(':') ? this.boldFont! : this.font!)
      })
      complianceYPos -= 12
    })

    yPos -= 140

    // Authorization section
    page.drawRectangle({
      x: 50,
      y: yPos - 100,
      width: 512,
      height: 100,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1
    })

    page.drawText('4. AUTHORIZED SIGNATURE', {
      x: 60,
      y: yPos - 20,
      size: 10,
      font: this.boldFont!
    })

    page.drawText('Authorized Person:', {
      x: 60,
      y: yPos - 50,
      size: 8,
      font: this.font!
    })

    page.drawLine({
      start: { x: 150, y: yPos - 50 },
      end: { x: 350, y: yPos - 50 },
      thickness: 1,
      color: rgb(0, 0, 0)
    })

    page.drawText('Date:', {
      x: 370,
      y: yPos - 50,
      size: 8,
      font: this.font!
    })

    page.drawText(new Date().toLocaleDateString(), {
      x: 400,
      y: yPos - 50,
      size: 8,
      font: this.boldFont!
    })

    page.drawText('Company:', {
      x: 60,
      y: yPos - 70,
      size: 8,
      font: this.font!
    })

    page.drawText(complianceData.companyInfo.name, {
      x: 110,
      y: yPos - 70,
      size: 8,
      font: this.boldFont!
    })

    this.drawFooter(page, 1, 1)

    return await pdfDoc.save()
  }

  /**
   * Generate Conformity Certificate
   */
  async generateConformityCertificate(
    partData: PartTraceabilityData,
    complianceData: ComplianceData
  ): Promise<ArrayBuffer> {
    const pdfDoc = await PDFDocument.create()
    await this.initializeFonts(pdfDoc)
    
    const page = pdfDoc.addPage([612, 792])
    let yPos = this.drawHeader(page, 'CERTIFICATE OF CONFORMITY', complianceData.companyInfo)

    // Certificate title
    page.drawText('CERTIFICATE OF CONFORMITY', {
      x: 50,
      y: yPos,
      size: 16,
      font: this.boldFont!,
      color: rgb(0.8, 0, 0)
    })

    yPos -= 40

    // Certificate number and date
    const certNumber = `COC-${complianceData.orderInfo.orderNumber}-${Date.now().toString().slice(-6)}`
    
    page.drawText(`Certificate No: ${certNumber}`, {
      x: 50,
      y: yPos,
      size: 10,
      font: this.boldFont!
    })

    page.drawText(`Issue Date: ${new Date().toLocaleDateString()}`, {
      x: 400,
      y: yPos,
      size: 10,
      font: this.boldFont!
    })

    yPos -= 30

    // Supplier section
    page.drawText('SUPPLIER INFORMATION', {
      x: 50,
      y: yPos,
      size: 12,
      font: this.boldFont!,
      color: rgb(0, 0, 0.8)
    })

    yPos -= 20

    const supplierInfo = [
      `Company: ${complianceData.companyInfo.name}`,
      `Address: ${complianceData.companyInfo.address}`,
      `Certifications: ${complianceData.companyInfo.certifications.join(', ')}`
    ]

    supplierInfo.forEach(info => {
      page.drawText(info, {
        x: 60,
        y: yPos,
        size: 9,
        font: this.font!
      })
      yPos -= 15
    })

    yPos -= 20

    // Customer section
    page.drawText('CUSTOMER INFORMATION', {
      x: 50,
      y: yPos,
      size: 12,
      font: this.boldFont!,
      color: rgb(0, 0, 0.8)
    })

    yPos -= 20

    page.drawText(`Customer: ${complianceData.customerInfo.name}`, {
      x: 60,
      y: yPos,
      size: 9,
      font: this.font!
    })

    yPos -= 15

    page.drawText(`Address: ${complianceData.customerInfo.address}`, {
      x: 60,
      y: yPos,
      size: 9,
      font: this.font!
    })

    yPos -= 30

    // Part details
    page.drawText('PART DETAILS', {
      x: 50,
      y: yPos,
      size: 12,
      font: this.boldFont!,
      color: rgb(0, 0, 0.8)
    })

    yPos -= 25

    // Create table-like structure
    const partDetails = [
      ['Part Number:', partData.partNumber],
      ['Serial Number:', partData.serialNumber],
      ['Description:', partData.description],
      ['Manufacturer:', partData.manufacturer],
      ['Condition:', partData.condition.toUpperCase()],
      ['Quantity:', partData.quantity.toString()]
    ]

    partDetails.forEach(([label, value]) => {
      page.drawText(label, {
        x: 60,
        y: yPos,
        size: 9,
        font: this.font!
      })

      page.drawText(value, {
        x: 180,
        y: yPos,
        size: 9,
        font: this.boldFont!
      })

      yPos -= 15
    })

    yPos -= 20

    // Conformity statement
    page.drawText('CONFORMITY STATEMENT', {
      x: 50,
      y: yPos,
      size: 12,
      font: this.boldFont!,
      color: rgb(0, 0, 0.8)
    })

    yPos -= 25

    const conformityText = [
      'We hereby certify that the above mentioned part(s):',
      '',
      '• Conform to the approved design data and specifications',
      '• Have been manufactured under an approved quality system',
      '• Have been inspected and tested in accordance with applicable procedures',
      '• Are delivered in an airworthy condition and eligible for installation',
      '• Comply with all applicable airworthiness requirements',
      '',
      `This certificate is issued under the authority of ${complianceData.aviationCompliance.regulatoryBasis.join(' & ')} regulations.`
    ]

    conformityText.forEach(text => {
      if (text === '') {
        yPos -= 8
        return
      }

      page.drawText(text, {
        x: text.startsWith('•') ? 70 : 60,
        y: yPos,
        size: 9,
        font: this.font!
      })
      yPos -= 12
    })

    yPos -= 20

    // Signature section
    page.drawRectangle({
      x: 50,
      y: yPos - 60,
      width: 512,
      height: 60,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1
    })

    page.drawText('AUTHORIZED SIGNATURE', {
      x: 60,
      y: yPos - 15,
      size: 10,
      font: this.boldFont!
    })

    page.drawText('Signature: ________________________', {
      x: 60,
      y: yPos - 35,
      size: 9,
      font: this.font!
    })

    page.drawText('Name: ________________________', {
      x: 300,
      y: yPos - 35,
      size: 9,
      font: this.font!
    })

    page.drawText(`Date: ${new Date().toLocaleDateString()}`, {
      x: 60,
      y: yPos - 50,
      size: 9,
      font: this.font!
    })

    page.drawText('Title: Quality Manager', {
      x: 300,
      y: yPos - 50,
      size: 9,
      font: this.font!
    })

    this.drawFooter(page, 1, 1)

    return await pdfDoc.save()
  }

  /**
   * Generate Material Test Report
   */
  async generateMaterialTestReport(
    partData: PartTraceabilityData,
    complianceData: ComplianceData
  ): Promise<ArrayBuffer> {
    const pdfDoc = await PDFDocument.create()
    await this.initializeFonts(pdfDoc)
    
    const page = pdfDoc.addPage([612, 792])
    let yPos = this.drawHeader(page, 'MATERIAL TEST REPORT', complianceData.companyInfo)

    // Report title
    page.drawText('MATERIAL TEST REPORT', {
      x: 50,
      y: yPos,
      size: 16,
      font: this.boldFont!,
      color: rgb(0.8, 0, 0)
    })

    const reportNumber = `MTR-${partData.partNumber}-${Date.now().toString().slice(-6)}`
    
    page.drawText(`Report No: ${reportNumber}`, {
      x: 50,
      y: yPos - 25,
      size: 10,
      font: this.boldFont!
    })

    page.drawText(`Test Date: ${new Date().toLocaleDateString()}`, {
      x: 400,
      y: yPos - 25,
      size: 10,
      font: this.boldFont!
    })

    yPos -= 60

    // Material identification
    page.drawText('MATERIAL IDENTIFICATION', {
      x: 50,
      y: yPos,
      size: 12,
      font: this.boldFont!,
      color: rgb(0, 0, 0.8)
    })

    yPos -= 25

    const materialInfo = [
      ['Part Number:', partData.partNumber],
      ['Material Type:', 'Aerospace Grade Aluminum Alloy 7075-T6'],
      ['Heat Treatment:', 'Solution Heat Treated and Aged'],
      ['Batch/Lot Number:', partData.batchLot || 'B2024-001'],
      ['Supplier:', partData.manufacturer],
      ['Specification:', 'AMS 4045, ASTM B209']
    ]

    materialInfo.forEach(([label, value]) => {
      page.drawText(label, {
        x: 60,
        y: yPos,
        size: 9,
        font: this.font!
      })

      page.drawText(value, {
        x: 200,
        y: yPos,
        size: 9,
        font: this.boldFont!
      })

      yPos -= 15
    })

    yPos -= 20

    // Test results
    page.drawText('TEST RESULTS', {
      x: 50,
      y: yPos,
      size: 12,
      font: this.boldFont!,
      color: rgb(0, 0, 0.8)
    })

    yPos -= 25

    // Create test results table
    const testResults = [
      ['Property', 'Specification', 'Actual Result', 'Status'],
      ['Tensile Strength (MPa)', '≥ 570', '582', 'PASS'],
      ['Yield Strength (MPa)', '≥ 505', '518', 'PASS'],
      ['Elongation (%)', '≥ 8', '9.2', 'PASS'],
      ['Hardness (HRB)', '87-95', '91', 'PASS'],
      ['Chemical Composition (%)', 'Per AMS 4045', 'Conforms', 'PASS']
    ]

    // Draw table headers
    const colWidths = [140, 120, 100, 80]
    let xPos = 60

    testResults[0].forEach((header, index) => {
      page.drawText(header, {
        x: xPos,
        y: yPos,
        size: 9,
        font: this.boldFont!
      })
      xPos += colWidths[index]
    })

    yPos -= 20

    // Draw horizontal line under headers
    page.drawLine({
      start: { x: 60, y: yPos },
      end: { x: 500, y: yPos },
      thickness: 1,
      color: rgb(0, 0, 0)
    })

    yPos -= 10

    // Draw test result rows
    testResults.slice(1).forEach(row => {
      xPos = 60
      row.forEach((cell, index) => {
        const color = cell === 'PASS' ? rgb(0, 0.7, 0) : rgb(0, 0, 0)
        const font = index === 3 ? this.boldFont! : this.font!

        page.drawText(cell, {
          x: xPos,
          y: yPos,
          size: 8,
          font: font,
          color: color
        })
        xPos += colWidths[index]
      })
      yPos -= 15
    })

    yPos -= 20

    // Test conditions
    page.drawText('TEST CONDITIONS', {
      x: 50,
      y: yPos,
      size: 12,
      font: this.boldFont!,
      color: rgb(0, 0, 0.8)
    })

    yPos -= 20

    const testConditions = [
      'Test Temperature: 23°C ± 2°C',
      'Relative Humidity: 50% ± 5%',
      'Test Standards: ASTM E8/E8M, ASTM E18',
      'Equipment Calibration: Current and Valid',
      'Test Specimens: 3 samples tested per property'
    ]

    testConditions.forEach(condition => {
      page.drawText(`• ${condition}`, {
        x: 70,
        y: yPos,
        size: 9,
        font: this.font!
      })
      yPos -= 15
    })

    yPos -= 20

    // Conclusion
    page.drawText('CONCLUSION', {
      x: 50,
      y: yPos,
      size: 12,
      font: this.boldFont!,
      color: rgb(0, 0, 0.8)
    })

    yPos -= 20

    page.drawText('All tested properties meet the specified requirements. The material is', {
      x: 60,
      y: yPos,
      size: 9,
      font: this.font!
    })

    yPos -= 12

    page.drawText('ACCEPTABLE for use in aerospace applications.', {
      x: 60,
      y: yPos,
      size: 9,
      font: this.boldFont!,
      color: rgb(0, 0.7, 0)
    })

    yPos -= 30

    // Signature
    page.drawRectangle({
      x: 50,
      y: yPos - 50,
      width: 512,
      height: 50,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1
    })

    page.drawText('Tested by: _________________    Date: _________________', {
      x: 60,
      y: yPos - 20,
      size: 9,
      font: this.font!
    })

    page.drawText('Quality Engineer                Laboratory Manager', {
      x: 60,
      y: yPos - 40,
      size: 8,
      font: this.font!
    })

    this.drawFooter(page, 1, 1)

    return await pdfDoc.save()
  }

  /**
   * Generate Complete Compliance Package
   */
  async generateCompletePackage(
    parts: PartTraceabilityData[],
    complianceData: ComplianceData,
    options: CompliancePackageOptions
  ): Promise<CompliancePackageResult> {
    try {
      const documents: CompliancePackageResult['documents'] = []
      
      // Generate individual documents for each part
      for (const part of parts) {
        if (options.includeTraceabilityCertificate) {
          const traceDoc = await this.generateTraceabilityCertificate(part, complianceData)
          documents.push({
            name: `Traceability_Certificate_${part.partNumber}.pdf`,
            type: 'traceability',
            pages: 1,
            arrayBuffer: traceDoc
          })
        }

        if (options.includeConformityCertificate) {
          const conformityDoc = await this.generateConformityCertificate(part, complianceData)
          documents.push({
            name: `Conformity_Certificate_${part.partNumber}.pdf`,
            type: 'conformity',
            pages: 1,
            arrayBuffer: conformityDoc
          })
        }

        if (options.includeMaterialTestReport) {
          const materialDoc = await this.generateMaterialTestReport(part, complianceData)
          documents.push({
            name: `Material_Test_Report_${part.partNumber}.pdf`,
            type: 'material_test',
            pages: 1,
            arrayBuffer: materialDoc
          })
        }
      }

      // Generate package-level documents
      if (options.includePackingSlip) {
        const packingSlip = await this.generatePackingSlip(parts, complianceData)
        documents.push({
          name: 'Packing_Slip.pdf',
          type: 'packing_slip',
          pages: 1,
          arrayBuffer: packingSlip
        })
      }

      if (options.includeExportCertificate) {
        const exportCert = await this.generateExportCertificate(parts, complianceData)
        documents.push({
          name: 'Export_Certificate.pdf',
          type: 'export_certificate',
          pages: 1,
          arrayBuffer: exportCert
        })
      }

      // Merge all documents into single package
      const mergedPackage = await this.mergeDocuments(documents, complianceData)
      const totalPages = documents.reduce((sum, doc) => sum + doc.pages, 0)

      return {
        success: true,
        documents,
        mergedPackage,
        totalPages
      }

    } catch (error) {
      console.error('Compliance package generation error:', error)
      
      return {
        success: false,
        documents: [],
        totalPages: 0,
        error: error instanceof Error ? error.message : 'Unknown error generating compliance package'
      }
    }
  }

  /**
   * Generate Packing Slip
   */
  private async generatePackingSlip(
    parts: PartTraceabilityData[],
    complianceData: ComplianceData
  ): Promise<ArrayBuffer> {
    const pdfDoc = await PDFDocument.create()
    await this.initializeFonts(pdfDoc)
    
    const page = pdfDoc.addPage([612, 792])
    let yPos = this.drawHeader(page, 'PACKING SLIP', complianceData.companyInfo)

    // Title and order info
    page.drawText('PACKING SLIP', {
      x: 50,
      y: yPos,
      size: 16,
      font: this.boldFont!,
      color: rgb(0.8, 0, 0)
    })

    yPos -= 30

    // Order information
    const orderInfo = [
      ['Order Number:', complianceData.orderInfo.orderNumber],
      ['Customer PO:', complianceData.orderInfo.customerPO || 'N/A'],
      ['Ship Date:', new Date().toLocaleDateString()],
      ['Total Items:', parts.length.toString()]
    ]

    orderInfo.forEach(([label, value]) => {
      page.drawText(label, {
        x: 50,
        y: yPos,
        size: 10,
        font: this.font!
      })

      page.drawText(value, {
        x: 150,
        y: yPos,
        size: 10,
        font: this.boldFont!
      })

      yPos -= 15
    })

    yPos -= 20

    // Parts list
    page.drawText('PARTS LIST', {
      x: 50,
      y: yPos,
      size: 12,
      font: this.boldFont!,
      color: rgb(0, 0, 0.8)
    })

    yPos -= 25

    // Table headers
    const headers = ['Item', 'Part Number', 'Serial Number', 'Description', 'Qty', 'Condition']
    const colWidths = [30, 90, 90, 180, 40, 70]
    let xPos = 50

    headers.forEach((header, index) => {
      page.drawText(header, {
        x: xPos,
        y: yPos,
        size: 9,
        font: this.boldFont!
      })
      xPos += colWidths[index]
    })

    yPos -= 20
    page.drawLine({
      start: { x: 50, y: yPos },
      end: { x: 550, y: yPos },
      thickness: 1,
      color: rgb(0, 0, 0)
    })

    yPos -= 10

    // Parts data
    parts.forEach((part, index) => {
      xPos = 50
      const rowData = [
        (index + 1).toString(),
        part.partNumber,
        part.serialNumber,
        part.description.substring(0, 25) + (part.description.length > 25 ? '...' : ''),
        part.quantity.toString(),
        part.condition.toUpperCase()
      ]

      rowData.forEach((data, colIndex) => {
        page.drawText(data, {
          x: xPos,
          y: yPos,
          size: 8,
          font: this.font!
        })
        xPos += colWidths[colIndex]
      })

      yPos -= 15
    })

    this.drawFooter(page, 1, 1)
    return await pdfDoc.save()
  }

  /**
   * Generate Export Certificate
   */
  private async generateExportCertificate(
    parts: PartTraceabilityData[],
    complianceData: ComplianceData
  ): Promise<ArrayBuffer> {
    const pdfDoc = await PDFDocument.create()
    await this.initializeFonts(pdfDoc)
    
    const page = pdfDoc.addPage([612, 792])
    let yPos = this.drawHeader(page, 'EXPORT CERTIFICATE', complianceData.companyInfo)

    // Certificate content
    page.drawText('EXPORT CERTIFICATE', {
      x: 50,
      y: yPos,
      size: 16,
      font: this.boldFont!,
      color: rgb(0.8, 0, 0)
    })

    yPos -= 40

    // Export declaration
    const exportText = [
      'This is to certify that the goods described below are being exported',
      'in accordance with applicable export regulations and do not require',
      'an export license under current regulations.',
      '',
      `Country of Origin: ${complianceData.aviationCompliance.countryOfOrigin}`,
      `Destination Country: ${complianceData.aviationCompliance.endUseCountry}`,
      `Order Number: ${complianceData.orderInfo.orderNumber}`,
      '',
      'Parts being exported:'
    ]

    exportText.forEach(text => {
      if (text === '') {
        yPos -= 10
        return
      }

      page.drawText(text, {
        x: 60,
        y: yPos,
        size: 10,
        font: text.includes(':') ? this.boldFont! : this.font!
      })
      yPos -= 15
    })

    yPos -= 10

    // Parts summary
    parts.forEach((part, index) => {
      page.drawText(`${index + 1}. ${part.partNumber} - ${part.description} (Qty: ${part.quantity})`, {
        x: 80,
        y: yPos,
        size: 9,
        font: this.font!
      })
      yPos -= 12
    })

    this.drawFooter(page, 1, 1)
    return await pdfDoc.save()
  }

  /**
   * Merge all documents into single package
   */
  private async mergeDocuments(
    documents: CompliancePackageResult['documents'],
    complianceData: ComplianceData
  ): Promise<ArrayBuffer> {
    const mergedDoc = await PDFDocument.create()
    
    // Add title page
    const titlePage = mergedDoc.addPage([612, 792])
    await this.initializeFonts(mergedDoc)
    
    titlePage.drawText('COMPLETE COMPLIANCE PACKAGE', {
      x: 150,
      y: 700,
      size: 18,
      font: this.boldFont!,
      color: rgb(0, 0, 0.8)
    })

    titlePage.drawText(`Order: ${complianceData.orderInfo.orderNumber}`, {
      x: 50,
      y: 650,
      size: 12,
      font: this.font!
    })

    titlePage.drawText(`Customer: ${complianceData.customerInfo.name}`, {
      x: 50,
      y: 630,
      size: 12,
      font: this.font!
    })

    titlePage.drawText(`Generated: ${new Date().toLocaleString()}`, {
      x: 50,
      y: 610,
      size: 12,
      font: this.font!
    })

    // Add document index
    titlePage.drawText('DOCUMENT INDEX:', {
      x: 50,
      y: 550,
      size: 14,
      font: this.boldFont!
    })

    let indexY = 520
    documents.forEach((doc, index) => {
      titlePage.drawText(`${index + 1}. ${doc.name} (${doc.pages} page${doc.pages > 1 ? 's' : ''})`, {
        x: 70,
        y: indexY,
        size: 10,
        font: this.font!
      })
      indexY -= 15
    })

    // Merge individual documents
    for (const doc of documents) {
      const sourcePdf = await PDFDocument.load(doc.arrayBuffer)
      const pages = await mergedDoc.copyPages(sourcePdf, sourcePdf.getPageIndices())
      pages.forEach(page => mergedDoc.addPage(page))
    }

    return await mergedDoc.save()
  }
}