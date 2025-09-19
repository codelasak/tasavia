'use client'

import { useEffect, useState, useCallback } from 'react'
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
  sn: string | null
  condition: string | null
  location: string | null
  po_price: number | null
  remarks: string | null
  po_id_original?: string | null
  po_number_original?: string | null
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

  const fetchInventoryItem = useCallback(async () => {
    try {
      // Fetch the inventory row without implicit join to avoid relationship ambiguity
      const { data: inv, error: invError } = await supabase
        .from('inventory')
        .select(`
          inventory_id,
          pn_id,
          sn,
          location,
          po_price,
          remarks,
          po_id_original,
          po_number_original,
          created_at,
          updated_at
        `)
        .eq('inventory_id', params.id)
        .single()

      if (invError) throw invError
      if (!inv) throw new Error('Inventory item not found')

      // Fetch the part number details separately
      const { data: pnRow, error: pnError } = await supabase
        .from('pn_master_table')
        .select('pn, description')
        .eq('pn_id', inv.pn_id)
        .single()

      if (pnError) throw pnError

      // Fetch condition from purchase order items (since inventory does not store condition)
      let condition: string | null = null
      if (inv.po_id_original) {
        const { data: poItems, error: poError } = await supabase
          .from('po_items')
          .select('pn_id, sn, condition')
          .eq('po_id', inv.po_id_original)

        if (!poError && poItems && poItems.length > 0) {
          // Prefer exact serial number match
          const bySn = inv.sn ? poItems.find((p) => p.sn === inv.sn) : null
          if (bySn?.condition) {
            condition = bySn.condition
          } else {
            // Fallback to first matching by pn_id
            const byPn = poItems.find((p) => p.pn_id === inv.pn_id)
            condition = byPn?.condition || null
          }
        }
      }

      // Fallback: attempt to resolve PO by number if ID is missing
      if (!condition && !inv.po_id_original && inv.po_number_original) {
        const { data: poRow, error: poLookupErr } = await supabase
          .from('purchase_orders')
          .select('po_id')
          .eq('po_number', inv.po_number_original)
          .single()

        if (!poLookupErr && poRow?.po_id) {
          const { data: poItems2, error: poErr2 } = await supabase
            .from('po_items')
            .select('pn_id, sn, condition')
            .eq('po_id', poRow.po_id)

          if (!poErr2 && poItems2 && poItems2.length > 0) {
            const bySn2 = inv.sn ? poItems2.find((p) => p.sn === inv.sn) : null
            if (bySn2?.condition) {
              condition = bySn2.condition
            } else {
              const byPn2 = poItems2.find((p) => p.pn_id === inv.pn_id)
              condition = byPn2?.condition || null
            }
          }
        }
      }

      setItem({
        ...inv,
        // derive condition from purchase order items (or null)
        condition,
        pn_master_table: {
          pn: pnRow?.pn || '',
          description: pnRow?.description || null
        }
      } as InventoryItemDetails)
    } catch (error) {
      console.error('Error fetching inventory item:', error)
      toast.error('Failed to fetch inventory item')
    } finally {
      setLoading(false)
    }
  }, [params.id]);

  useEffect(() => {
    fetchInventoryItem()
  }, [fetchInventoryItem])

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
    const c = condition.toUpperCase()
    // Align colors with PO items form badges
    if (['NEW', 'NS', 'NE'].includes(c)) return 'bg-green-100 text-green-800'
    if (['AR', 'SV', 'SVC'].includes(c)) return 'bg-blue-100 text-blue-800'
    if (['OH', 'OHC', 'OVERHAULED'].includes(c)) return 'bg-yellow-100 text-yellow-800'
    if (['RP', 'REP', 'REPAIRED'].includes(c)) return 'bg-orange-100 text-orange-800'
    if (['RB', 'REFURBISHED'].includes(c)) return 'bg-purple-100 text-purple-800'
    if (['AS-IS', 'SCRAP', 'DAMAGED'].includes(c)) return 'bg-red-100 text-red-800'
    if (['USED'].includes(c)) return 'bg-yellow-100 text-yellow-800'
    return 'bg-gray-100 text-gray-800'
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
            {item.sn && (
              <div>
                <div className="text-slate-500 text-sm">Serial Number</div>
                <div className="font-mono">{item.sn}</div>
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
              <div className="font-bold text-lg">1</div>
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
              <div className="font-bold text-lg">${Number(item.po_price ?? 0).toFixed(2)}</div>
            </div>
            <div>
              <div className="text-slate-500 text-sm">Total Value</div>
              <div className="font-bold text-xl text-green-600">${Number(item.po_price ?? 0).toFixed(2)}</div>
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
            {item.remarks && (
              <div>
                <div className="text-slate-500 text-sm">Notes</div>
                <div className="whitespace-pre-line">{item.remarks}</div>
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
