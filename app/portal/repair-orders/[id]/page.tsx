'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit, FileText, Package, Calendar, Clock, Settings } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format } from 'date-fns'
import PartNumberModificationModal from '@/components/repair-orders/PartNumberModificationModal'

interface RepairOrderDetails {
  repair_order_id: string
  repair_order_number: string
  vendor_company_id: string
  status: string
  expected_return_date: string | null
  actual_return_date: string | null
  total_cost: number
  currency: string
  remarks: string | null
  created_at: string
  updated_at: string
  companies: {
    company_name: string
    company_code: string
  }
  repair_order_items: Array<{
    repair_order_item_id: string
    line_number: number
    workscope: string
    estimated_cost: number | null
    actual_cost: number | null
    status: string | null
    inventory: {
      inventory_id: string
      pn_id: string
      serial_number: string | null
      condition: string | null
      quantity: number
      traceability_source: string | null
      traceable_to: string | null
      last_certified_agency: string | null
      part_status_certification: string | null
      pn_master_table: {
        pn: string
        description: string | null
      }
    }
  }>
}

interface RepairOrderViewPageProps {
  params: {
    id: string
  }
}

export default function RepairOrderViewPage({ params }: RepairOrderViewPageProps) {
  const router = useRouter()
  const [repairOrder, setRepairOrder] = useState<RepairOrderDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRepairOrder()
  }, [params.id])

  const fetchRepairOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('repair_orders')
        .select(`
          *,
          companies(*),
          repair_order_items(
            *,
            inventory(
              *,
              pn_master_table(pn, description)
            )
          )
        `)
        .eq('repair_order_id', params.id)
        .single()

      if (error) throw error
      setRepairOrder(data as any)
    } catch (error) {
      console.error('Error fetching repair order:', error)
      toast.error('Failed to fetch repair order')
      router.push('/portal/repair-orders')
    } finally {
      setLoading(false)
    }
  }

  const handlePartNumberModification = () => {
    // Refresh the repair order data when a part number is modified
    fetchRepairOrder()
  }

  const updateStatus = async (newStatus: string) => {
    if (!repairOrder) return

    try {
      const updates: any = { status: newStatus }
      
      // If marking as received, set actual return date
      if (newStatus === 'Received') {
        updates.actual_return_date = format(new Date(), 'yyyy-MM-dd')
      }

      const { error } = await supabase
        .from('repair_orders')
        .update(updates)
        .eq('repair_order_id', repairOrder.repair_order_id)

      if (error) throw error

      // Update inventory status based on repair order status
      if (newStatus === 'Received') {
        // Update inventory items back to 'Available' status
        for (const item of repairOrder.repair_order_items) {
          await supabase
            .from('inventory')
            .update({ status: 'Available' })
            .eq('inventory_id', item.inventory.inventory_id)
        }
      }

      setRepairOrder({ 
        ...repairOrder, 
        status: newStatus,
        actual_return_date: newStatus === 'Received' ? format(new Date(), 'yyyy-MM-dd') : repairOrder.actual_return_date
      })
      toast.success(`Repair order status updated to ${newStatus}`)
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      'Draft': 'bg-gray-100 text-gray-800',
      'Sent': 'bg-blue-100 text-blue-800',
      'In Progress': 'bg-yellow-100 text-yellow-800',
      'Completed': 'bg-green-100 text-green-800',
      'Received': 'bg-purple-100 text-purple-800',
      'Cancelled': 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getStatusActions = (currentStatus: string) => {
    const actions = []
    
    if (currentStatus === 'Draft') {
      actions.push({ label: 'Send to Vendor', status: 'Sent', variant: 'default' })
    }
    if (currentStatus === 'Sent') {
      actions.push({ label: 'Mark In Progress', status: 'In Progress', variant: 'default' })
    }
    if (currentStatus === 'In Progress') {
      actions.push({ label: 'Mark Completed', status: 'Completed', variant: 'default' })
    }
    if (currentStatus === 'Completed') {
      actions.push({ label: 'Mark as Received', status: 'Received', variant: 'default' })
    }
    if (!['Received', 'Cancelled'].includes(currentStatus)) {
      actions.push({ label: 'Cancel Order', status: 'Cancelled', variant: 'destructive' })
    }
    
    return actions
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading repair order...</div>
      </div>
    )
  }

  if (!repairOrder) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Repair order not found</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Repair Order</h1>
            <p className="text-slate-600">RO: {repairOrder.repair_order_number}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={() => router.push(`/portal/repair-orders/${repairOrder.repair_order_id}/edit`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button 
            variant="outline"
            onClick={() => router.push(`/portal/repair-orders/${repairOrder.repair_order_id}/pdf`)}
          >
            <FileText className="h-4 w-4 mr-2" />
            Generate PDF
          </Button>
        </div>
      </div>

      {/* Status and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>Status</CardTitle>
              <Badge className={getStatusBadge(repairOrder.status)}>
                {repairOrder.status}
              </Badge>
            </div>
            <div className="flex gap-2">
              {getStatusActions(repairOrder.status).map((action) => (
                <Button
                  key={action.status}
                  variant={action.variant as any}
                  size="sm"
                  onClick={() => updateStatus(action.status)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Order Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Repair Order Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-slate-500 text-sm">Repair Order Number</div>
              <div className="font-mono font-bold text-lg">{repairOrder.repair_order_number}</div>
            </div>
            <div>
              <div className="text-slate-500 text-sm">Vendor</div>
              <div className="font-medium">{repairOrder.companies.company_name}</div>
              <div className="text-sm text-slate-600">{repairOrder.companies.company_code}</div>
            </div>
            <div>
              <div className="text-slate-500 text-sm">Currency</div>
              <div className="font-medium">{repairOrder.currency}</div>
            </div>
            <div>
              <div className="text-slate-500 text-sm">Total Cost</div>
              <div className="font-medium">${repairOrder.total_cost.toFixed(2)}</div>
            </div>
            {repairOrder.expected_return_date && (
              <div>
                <div className="text-slate-500 text-sm">Expected Return Date</div>
                <div className="font-medium flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  {format(new Date(repairOrder.expected_return_date), 'MMMM dd, yyyy')}
                </div>
              </div>
            )}
            {repairOrder.actual_return_date && (
              <div>
                <div className="text-slate-500 text-sm">Actual Return Date</div>
                <div className="font-medium flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  {format(new Date(repairOrder.actual_return_date), 'MMMM dd, yyyy')}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Items for Repair</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {repairOrder.repair_order_items
              .sort((a, b) => a.line_number - b.line_number)
              .map((item) => (
              <Card key={item.repair_order_item_id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono font-bold">{item.inventory.pn_master_table.pn}</span>
                      {item.inventory.condition && (
                        <Badge variant="outline">{item.inventory.condition}</Badge>
                      )}
                    </div>
                    {item.inventory.pn_master_table.description && (
                      <div className="text-sm text-slate-600 mb-2">
                        {item.inventory.pn_master_table.description}
                      </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-slate-500">S/N:</span> {item.inventory.serial_number || 'N/A'}
                      </div>
                      <div>
                        <span className="text-slate-500">Qty:</span> {item.inventory.quantity}
                      </div>
                      <div>
                        <span className="text-slate-500">Workscope:</span> <b>{item.workscope}</b>
                      </div>
                      <div>
                        <span className="text-slate-500">Est. Cost:</span> 
                        {item.estimated_cost ? ` $${item.estimated_cost.toFixed(2)}` : ' N/A'}
                      </div>
                    </div>
                    
                    {/* Traceability Information */}
                    {item.inventory.traceability_source && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <div className="text-sm font-medium text-yellow-800 mb-1">ATA 106 Traceability</div>
                        <div className="text-xs space-y-1">
                          <div><span className="font-medium">Source:</span> {item.inventory.traceability_source}</div>
                          {item.inventory.traceable_to && (
                            <div><span className="font-medium">Traceable to:</span> {item.inventory.traceable_to}</div>
                          )}
                          {item.inventory.last_certified_agency && (
                            <div><span className="font-medium">Last Certified:</span> {item.inventory.last_certified_agency}</div>
                          )}
                          {item.inventory.part_status_certification && (
                            <div><span className="font-medium">Status:</span> {item.inventory.part_status_certification}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Part Number Modification Button */}
                  <div className="ml-4">
                    <PartNumberModificationModal
                      inventoryItem={{
                        inventory_id: item.inventory.inventory_id,
                        serial_number: item.inventory.serial_number,
                        condition: item.inventory.condition,
                        quantity: item.inventory.quantity,
                        pn_master_table: {
                          pn_id: item.inventory.pn_id || '',
                          pn: item.inventory.pn_master_table.pn,
                          description: item.inventory.pn_master_table.description
                        }
                      }}
                      repairOrderId={repairOrder.repair_order_id}
                      onModificationComplete={handlePartNumberModification}
                      trigger={
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1"
                          title="Modify Part Number"
                        >
                          <Settings className="h-4 w-4" />
                          Modify PN
                        </Button>
                      }
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {repairOrder.remarks && (
              <div>
                <div className="text-slate-500 text-sm">Remarks</div>
                <div className="whitespace-pre-line">{repairOrder.remarks}</div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-slate-500">Created</div>
                <div>{format(new Date(repairOrder.created_at), 'PPP')}</div>
              </div>
              <div>
                <div className="text-slate-500">Last Updated</div>
                <div>{format(new Date(repairOrder.updated_at), 'PPP')}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}