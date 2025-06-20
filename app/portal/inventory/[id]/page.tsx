'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit, Trash2, Package, MapPin, DollarSign } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface InventoryItemDetails {
  inventory_id: string
  pn_id: string
  serial_number: string | null
  condition: string | null
  location: string | null  
  quantity: number
  unit_cost: number
  total_value: number
  notes: string | null
  created_at: string
  updated_at: string
  pn_master_table: {
    pn: string
    description: string | null
  }
}

interface InventoryViewPageProps {
  params: {
    id: string
  }
}

export default function InventoryViewPage({ params }: InventoryViewPageProps) {
  const router = useRouter()
  const [item, setItem] = useState<InventoryItemDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInventoryItem()
  }, [params.id])

  const fetchInventoryItem = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select(`
          *,
          pn_master_table(pn, description)
        `)
        .eq('inventory_id', params.id)
        .single()

      if (error) throw error
      setItem(data)
    } catch (error) {
      console.error('Error fetching inventory item:', error)
      toast.error('Failed to fetch inventory item')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!item) return
    
    if (!confirm(`Are you sure you want to delete this inventory item?`)) return

    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('inventory_id', item.inventory_id)

      if (error) throw error
      
      toast.success('Inventory item deleted successfully')
      router.push('/portal/inventory')
    } catch (error) {
      console.error('Error deleting inventory item:', error)
      toast.error('Failed to delete inventory item')
    }
  }

  const getConditionBadge = (condition: string | null) => {
    if (!condition) return 'bg-gray-100 text-gray-800'
    
    const colors = {
      'New': 'bg-green-100 text-green-800',
      'Used': 'bg-yellow-100 text-yellow-800', 
      'Refurbished': 'bg-blue-100 text-blue-800',
      'Damaged': 'bg-red-100 text-red-800',
      'AR': 'bg-purple-100 text-purple-800'
    }
    return colors[condition as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading inventory item...</div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Inventory item not found</div>
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
            <h1 className="text-3xl font-bold text-slate-900">Inventory Item</h1>
            <p className="text-slate-600">Part Number: {item.pn_master_table.pn}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={() => router.push(`/portal/inventory/${item.inventory_id}/edit`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDelete}
            className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Part Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Part Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-slate-500 text-sm">Part Number</div>
              <div className="font-mono font-bold text-lg">{item.pn_master_table.pn}</div>
            </div>
            <div>
              <div className="text-slate-500 text-sm">Condition</div>
              <Badge className={getConditionBadge(item.condition)}>
                {item.condition || 'Unknown'}
              </Badge>
            </div>
            {item.pn_master_table.description && (
              <div className="md:col-span-2">
                <div className="text-slate-500 text-sm">Description</div>
                <div className="text-slate-900">{item.pn_master_table.description}</div>
              </div>
            )}
            {item.serial_number && (
              <div>
                <div className="text-slate-500 text-sm">Serial Number</div>
                <div className="font-mono">{item.serial_number}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Location & Quantity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location & Quantity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-slate-500 text-sm">Location</div>
              <div className="font-medium">{item.location || 'Not specified'}</div>
            </div>
            <div>
              <div className="text-slate-500 text-sm">Quantity</div>
              <div className="font-bold text-lg">{item.quantity}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Cost Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-slate-500 text-sm">Unit Cost</div>
              <div className="font-bold text-lg">${item.unit_cost.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-slate-500 text-sm">Total Value</div>
              <div className="font-bold text-xl text-green-600">${item.total_value.toFixed(2)}</div>
            </div>
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
            {item.notes && (
              <div>
                <div className="text-slate-500 text-sm">Notes</div>
                <div className="whitespace-pre-line">{item.notes}</div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-slate-500">Created</div>
                <div>{format(new Date(item.created_at), 'PPP')}</div>
              </div>
              <div>
                <div className="text-slate-500">Last Updated</div>
                <div>{format(new Date(item.updated_at), 'PPP')}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}