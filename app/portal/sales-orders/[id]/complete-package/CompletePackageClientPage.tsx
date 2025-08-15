'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  FileText, 
  Package, 
  Download, 
  ArrowLeft, 
  CheckCircle,
  AlertCircle,
  Plus
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PDFMerger, usePDFMergerIntegration } from '@/components/pdf'
import { toast } from 'sonner'

// Types for sales order data (matching the actual database schema)
interface SalesOrderData {
  sales_order_id: string
  invoice_number: string
  customer_po_number: string | null
  reference_number: string | null
  contract_number: string | null
  sales_date: string | null
  status: string | null
  sub_total: number | null
  total_net: number | null
  currency: string | null
  my_companies: {
    my_company_name: string
    my_company_code: string
    company_addresses: Array<{
      address_line1: string
      address_line2: string | null
      city: string | null
      country: string | null
    }>
    company_contacts: Array<{
      contact_name: string
      phone: string | null
      email: string | null
    }>
  }
  companies: any
  sales_order_items: Array<{
    line_number: number
    unit_price: number
    line_total: number | null
    inventory: {
      serial_number: string | null
      condition: string | null
      quantity: number | null
      pn_master_table: {
        pn: string
        description: string | null
      }
    }
  }>
}

interface CompletePackageClientPageProps {
  salesOrder: SalesOrderData
}

export default function CompletePackageClientPage({ salesOrder }: CompletePackageClientPageProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  // Initialize PDF merger with sales order context
  const pdfMerger = usePDFMergerIntegration({
    type: 'invoice',
    number: salesOrder.invoice_number,
    companyName: salesOrder.my_companies?.my_company_name
  })

  // Function to generate the sales order PDF and add it to merger
  const generateAndAddSalesOrderPDF = useCallback(async () => {
    setIsGeneratingPDF(true)
    
    try {
      // This would normally call your existing PDF generation function
      // For now, we'll simulate it
      const generateSalesOrderPDF = async (): Promise<ArrayBuffer> => {
        // In a real implementation, this would:
        // 1. Create a hidden iframe with the PDF page
        // 2. Use Puppeteer or similar to generate PDF
        // 3. Return the ArrayBuffer
        
        // For demonstration, we'll create a simple PDF using pdf-lib
        const { PDFDocument, rgb } = await import('pdf-lib')
        
        const pdfDoc = await PDFDocument.create()
        const page = pdfDoc.addPage([612, 792])
        
        const font = await pdfDoc.embedFont('Helvetica-Bold')
        const regularFont = await pdfDoc.embedFont('Helvetica')
        
        // Add title
        page.drawText('INVOICE', {
          x: 50,
          y: 750,
          size: 24,
          font: font,
          color: rgb(0, 0, 0)
        })
        
        // Add invoice details
        page.drawText(`Invoice Number: ${salesOrder.invoice_number}`, {
          x: 50,
          y: 700,
          size: 12,
          font: regularFont
        })
        
        page.drawText(`Date: ${salesOrder.sales_date || 'N/A'}`, {
          x: 50,
          y: 680,
          size: 12,
          font: regularFont
        })
        
        page.drawText(`Total: ${salesOrder.currency || 'USD'} ${salesOrder.total_net || '0.00'}`, {
          x: 50,
          y: 660,
          size: 12,
          font: regularFont
        })
        
        // Add items
        let yPos = 620
        page.drawText('Items:', {
          x: 50,
          y: yPos,
          size: 14,
          font: font
        })
        
        yPos -= 30
        salesOrder.sales_order_items?.forEach((item, index) => {
          if (yPos < 100) return // Prevent overflow
          
          page.drawText(`${index + 1}. ${item.inventory.pn_master_table.pn} - ${item.inventory.pn_master_table.description || 'N/A'}`, {
            x: 50,
            y: yPos,
            size: 10,
            font: regularFont
          })
          
          page.drawText(`   Qty: ${item.inventory.quantity || 1} @ ${salesOrder.currency || 'USD'} ${item.unit_price} = ${salesOrder.currency || 'USD'} ${item.line_total || 0}`, {
            x: 50,
            y: yPos - 15,
            size: 10,
            font: regularFont
          })
          
          yPos -= 40
        })
        
        return await pdfDoc.save()
      }
      
      await pdfMerger.addCurrentDocument(generateSalesOrderPDF)
      
      toast.success('Sales order PDF added to package')
      setActiveTab('merger')
      
    } catch (error) {
      console.error('Failed to generate sales order PDF:', error)
      toast.error('Failed to generate sales order PDF')
    } finally {
      setIsGeneratingPDF(false)
    }
  }, [salesOrder, pdfMerger])

  // Quick stats for overview
  const stats = {
    totalItems: salesOrder.sales_order_items?.length || 0,
    totalValue: salesOrder.total_net || 0,
    currency: salesOrder.currency || 'USD',
    status: salesOrder.status || 'unknown'
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Complete Documentation Package</h1>
                <p className="text-slate-600">
                  Invoice #{salesOrder.invoice_number} - {salesOrder.my_companies?.my_company_name}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={stats.status === 'completed' ? 'default' : 'secondary'}>
                {stats.status}
              </Badge>
              <Link href={`/portal/sales-orders/${salesOrder.sales_order_id}/pdf`}>
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  View PDF
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="merger">Document Merger</TabsTrigger>
            <TabsTrigger value="history">Package History</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Total Items</p>
                      <p className="text-2xl font-bold">{stats.totalItems}</p>
                    </div>
                    <Package className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Total Value</p>
                      <p className="text-2xl font-bold">{stats.currency} {stats.totalValue}</p>
                    </div>
                    <FileText className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Documents</p>
                      <p className="text-2xl font-bold">{pdfMerger.totalDocuments}</p>
                    </div>
                    <FileText className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Status</p>
                      <p className="text-lg font-semibold capitalize">{stats.status}</p>
                    </div>
                    {stats.status === 'completed' ? (
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    ) : (
                      <AlertCircle className="h-8 w-8 text-yellow-600" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Get started with creating a complete documentation package
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={generateAndAddSalesOrderPDF}
                    disabled={isGeneratingPDF}
                    className="justify-start h-auto p-4"
                  >
                    <div className="flex items-start space-x-3">
                      <Plus className="h-5 w-5 mt-0.5" />
                      <div className="text-left">
                        <div className="font-medium">Add Invoice PDF</div>
                        <div className="text-sm opacity-90">
                          Generate and add the current invoice to the package
                        </div>
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('merger')}
                    className="justify-start h-auto p-4"
                  >
                    <div className="flex items-start space-x-3">
                      <Package className="h-5 w-5 mt-0.5" />
                      <div className="text-left">
                        <div className="font-medium">Open Document Merger</div>
                        <div className="text-sm opacity-70">
                          Add supplier documents and create complete package
                        </div>
                      </div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Package Preview */}
            {pdfMerger.totalDocuments > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Current Package Contents</CardTitle>
                  <CardDescription>
                    {pdfMerger.totalDocuments} documents ready for merging
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {pdfMerger.sources.map((source, index) => (
                      <div key={source.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Badge variant={source.type === 'supplier' ? 'secondary' : 'default'}>
                            {source.type === 'supplier' ? 'Supplier' : 'Generated'}
                          </Badge>
                          <span className="font-medium">{source.name}</span>
                        </div>
                        <span className="text-sm text-slate-500">Order: {source.order}</span>
                      </div>
                    ))}
                  </div>
                  
                  {pdfMerger.canMerge && (
                    <div className="mt-4 pt-4 border-t">
                      <Button
                        onClick={() => pdfMerger.mergePDFs()}
                        disabled={pdfMerger.isLoading}
                        className="w-full"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {pdfMerger.isLoading ? 'Creating Package...' : 'Create Complete Package'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Merger Tab */}
          <TabsContent value="merger">
            <Card>
              <CardHeader>
                <CardTitle>PDF Document Merger</CardTitle>
                <CardDescription>
                  Combine your invoice with supplier certificates, packing slips, and other supporting documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pdfMerger.error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{pdfMerger.error}</AlertDescription>
                  </Alert>
                )}

                <PDFMerger
                  generatedDocuments={pdfMerger.generatedDocuments.map(doc => ({
                    id: doc.id,
                    name: doc.name,
                    arrayBuffer: doc.arrayBuffer,
                    description: doc.description
                  }))}
                  defaultOptions={{
                    outputFileName: `invoice-${salesOrder.invoice_number}-complete-package.pdf`,
                    addPageNumbers: true,
                    addTitlePage: true,
                    titlePageContent: {
                      title: `INVOICE #${salesOrder.invoice_number} - Complete Package`,
                      subtitle: 'Aviation Parts Documentation',
                      companyName: salesOrder.my_companies?.my_company_name || 'TASAVIA'
                    }
                  }}
                  onMergeComplete={(result) => {
                    if (result.success) {
                      toast.success(`Successfully created package with ${result.totalPages} pages`)
                    } else {
                      toast.error('Failed to create package')
                    }
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Package History</CardTitle>
                <CardDescription>
                  Previous documentation packages created for this invoice
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-slate-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No previous packages found</p>
                  <p className="text-sm">Created packages will appear here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}