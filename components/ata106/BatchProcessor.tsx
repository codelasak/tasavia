'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Loader2, FileText, Download, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface BatchProcessorProps {
  salesOrders: Array<{
    sales_order_id: string
    invoice_number: string
    ata106_completion_status?: string
    companies?: { company_name: string }
  }>
}

interface BatchResult {
  success: boolean
  action: string
  processed_count: number
  total_requested: number
  result: any
}

export function BatchProcessor({ salesOrders }: BatchProcessorProps) {
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [batchAction, setBatchAction] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastResult, setLastResult] = useState<BatchResult | null>(null)
  const [exportFormat, setExportFormat] = useState<string>('json')
  const [includeSignatures, setIncludeSignatures] = useState(false)
  const [newStatus, setNewStatus] = useState<string>('')

  const handleSelectAll = () => {
    if (selectedOrders.length === salesOrders.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(salesOrders.map(order => order.sales_order_id))
    }
  }

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    )
  }

  const handleBatchProcess = async () => {
    if (selectedOrders.length === 0) {
      toast.error('Please select at least one order')
      return
    }

    if (!batchAction) {
      toast.error('Please select an action')
      return
    }

    if (batchAction === 'update_status' && !newStatus) {
      toast.error('Please select a status for update')
      return
    }

    setIsProcessing(true)
    setLastResult(null)

    try {
      const response = await fetch('/api/ata106/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: batchAction,
          sales_order_ids: selectedOrders,
          options: {
            format: exportFormat,
            include_signatures: includeSignatures,
            status: newStatus
          }
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Batch processing failed')
      }

      setLastResult(result)
      toast.success(`Batch ${batchAction} completed successfully`)

      // Handle download for export actions
      if (batchAction === 'export_data' && result.result?.export_url) {
        const link = document.createElement('a')
        link.href = result.result.export_url
        link.download = `ata106_export_${Date.now()}.${exportFormat}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }

    } catch (error) {
      console.error('Batch processing error:', error)
      toast.error(error instanceof Error ? error.message : 'Batch processing failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>
      case 'partial':
        return <Badge variant="outline" className="border-orange-200 text-orange-800">Partial</Badge>
      default:
        return <Badge variant="secondary">Draft</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Action Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Processing</CardTitle>
          <CardDescription>
            Process multiple ATA 106 forms at once. Select orders and choose an action.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Action</label>
              <Select value={batchAction} onValueChange={setBatchAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="generate_pdfs">Generate PDFs</SelectItem>
                  <SelectItem value="export_data">Export Data</SelectItem>
                  <SelectItem value="update_status">Update Status</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {batchAction === 'export_data' && (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">Export Format</label>
                  <Select value={exportFormat} onValueChange={setExportFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Checkbox 
                    id="include-signatures"
                    checked={includeSignatures}
                    onCheckedChange={(checked) => setIncludeSignatures(checked === true)}
                  />
                  <label htmlFor="include-signatures" className="text-sm">
                    Include signatures
                  </label>
                </div>
              </>
            )}

            {batchAction === 'update_status' && (
              <div>
                <label className="text-sm font-medium mb-2 block">New Status</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {selectedOrders.length} of {salesOrders.length} orders selected
            </div>
            <Button
              onClick={handleBatchProcess}
              disabled={isProcessing || selectedOrders.length === 0 || !batchAction}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Process Selected
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Processing Result */}
      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Batch Processing Result</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Action:</span>
                <Badge>{lastResult.action}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Processed:</span>
                <span className="font-medium">
                  {lastResult.processed_count} / {lastResult.total_requested}
                </span>
              </div>
              <Progress 
                value={Math.min(100, Math.max(0, lastResult.total_requested > 0 ? (lastResult.processed_count / lastResult.total_requested) * 100 : 0))} 
                className="w-full"
              />
              {lastResult.result?.message && (
                <div className="text-sm text-muted-foreground">
                  {lastResult.result.message}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Select Orders</span>
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              {selectedOrders.length === salesOrders.length ? 'Deselect All' : 'Select All'}
            </Button>
          </CardTitle>
          <CardDescription>
            Choose which ATA 106 forms to process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {salesOrders.map((order) => (
              <div
                key={order.sales_order_id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50"
              >
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={selectedOrders.includes(order.sales_order_id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleSelectOrder(order.sales_order_id)
                      } else {
                        handleSelectOrder(order.sales_order_id)
                      }
                    }}
                  />
                  <div>
                    <div className="font-medium font-mono">{order.invoice_number}</div>
                    <div className="text-sm text-muted-foreground">
                      {order.companies?.company_name || 'Unknown Company'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(order.ata106_completion_status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}