'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Edit, Trash2, MapPin, Eye } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { InventoryDialog } from '@/components/inventory/InventoryDialog'

interface InventoryItem {
  inventory_id: string
  pn_id: string
  serial_number: string | null
  condition?: string
  location: string | null
  quantity?: number
  unit_cost?: number
  total_value?: number
  notes?: string | null
  last_updated?: string
  pn_master_table: {
    pn: string
    description: string | null
  }
}

interface InventoryListProps {
  initialInventory: InventoryItem[]
}

export default function InventoryList({ initialInventory }: InventoryListProps) {
  const router = useRouter()
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory)
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>(initialInventory)
  const [searchTerm, setSearchTerm] = useState('')
  const [conditionFilter, setConditionFilter] = useState<string>('all')
  const [locationFilter, setLocationFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [locations, setLocations] = useState<string[]>([])
  const [conditions, setConditions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Extract unique locations and conditions for filters
    const locationData = inventory?.map(item => item.location).filter(Boolean) || []
    const conditionData = inventory?.map(item => item.condition).filter(Boolean) || []
    
    const uniqueLocations = Array.from(new Set(locationData)) as string[]
    const uniqueConditions = Array.from(new Set(conditionData)) as string[]
    
    setLocations(uniqueLocations)
    setConditions(uniqueConditions)
  }, [inventory])

  useEffect(() => {
    let filtered = inventory.filter(item =>
      item.pn_master_table.pn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.pn_master_table.description && item.pn_master_table.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.serial_number && item.serial_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.location && item.location.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    if (conditionFilter !== 'all') {
      filtered = filtered.filter(item => item.condition === conditionFilter)
    }

    if (locationFilter !== 'all') {
      filtered = filtered.filter(item => item.location === locationFilter)
    }

    setFilteredInventory(filtered)
  }, [inventory, searchTerm, conditionFilter, locationFilter])

  const fetchInventory = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('inventory')
        .select(`
          *,
          pn_master_table(pn, description)
        `)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Fetch inventory error:', error)
        throw new Error(error.message || 'Failed to fetch inventory')
      }
      
      setInventory(data as any || [])
    } catch (error: any) {
      console.error('Error fetching inventory:', error)
      const errorMessage = error.message || 'Failed to fetch inventory'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item)
    setDialogOpen(true)
  }

  const handleDelete = async (item: InventoryItem) => {
    if (!confirm(`Are you sure you want to delete this inventory item?`)) return

    try {
      setDeleteLoading(item.inventory_id)
      
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('inventory_id', item.inventory_id)

      if (error) {
        console.error('Delete inventory error:', error)
        throw new Error(error.message || 'Failed to delete inventory item')
      }
      
      setInventory(inventory.filter(i => i.inventory_id !== item.inventory_id))
      toast.success('Inventory item deleted successfully')
    } catch (error: any) {
      console.error('Error deleting inventory item:', error)
      toast.error(error.message || 'Failed to delete inventory item')
    } finally {
      setDeleteLoading(null)
    }
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditingItem(null)
    fetchInventory()
  }

  const getConditionBadge = (condition: string | undefined) => {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory</CardTitle>
        <CardDescription>
          {inventory.length} inventory items • {filteredInventory.length} shown
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-2 pt-4 pb-4">
          <div className="relative w-full sm:w-auto flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search part numbers, descriptions, serial numbers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <Select value={conditionFilter} onValueChange={setConditionFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All Conditions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Conditions</SelectItem>
              {conditions.map(condition => (
                <SelectItem key={condition} value={condition}>{condition}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map(location => (
                <SelectItem key={location} value={location}>{location}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          {filteredInventory.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-slate-500">No inventory items found</div>
              {(searchTerm || conditionFilter !== 'all' || locationFilter !== 'all') && (
                <Button
                  variant="link"
                  onClick={() => {
                    setSearchTerm('')
                    setConditionFilter('all')
                    setLocationFilter('all')
                  }}
                  className="mt-2"
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredInventory.map((item) => (
                <Card key={item.inventory_id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-base text-slate-900">{item.pn_master_table.pn}</span>
                          <Badge className={getConditionBadge(item.condition)}>{item.condition || 'Unknown'}</Badge>
                          {item.location && (
                            <span className="flex items-center text-xs text-slate-500"><MapPin className="h-4 w-4 mr-1" />{item.location}</span>
                          )}
                        </div>
                        {item.pn_master_table.description && (
                          <div className="text-xs text-slate-500 line-clamp-2 mb-1">{item.pn_master_table.description}</div>
                        )}
                        <div className="flex gap-4 text-xs">
                          <span>Qty: <b>{item.quantity || 1}</b></span>
                          <span>Value: <b>${(item.total_value || 0).toFixed(2)}</b></span>
                          {item.serial_number && <span>S/N: <b>{item.serial_number}</b></span>}
                        </div>
                      </div>
                      <div className="flex gap-1 ml-4">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => router.push(`/portal/inventory/${item.inventory_id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8" 
                          onClick={() => handleEdit(item)}
                          disabled={deleteLoading === item.inventory_id}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(item)}
                          disabled={deleteLoading === item.inventory_id}
                        >
                          {deleteLoading === item.inventory_id ? (
                            <div className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      <InventoryDialog open={dialogOpen} onClose={handleDialogClose} item={editingItem} />
    </Card>
  )
}