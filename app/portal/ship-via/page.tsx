'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Plus, Search, Edit, Trash2, Truck, User, Hash } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/server'
import { toast } from 'sonner'
import { ShipViaDialog } from '@/components/ship-via/ShipViaDialog'

type ShipVia = Database['public']['Tables']['my_ship_via']['Row']

export default function ShipViaPage() {
  const [shipViaList, setShipViaList] = useState<ShipVia[]>([])
  const [filteredShipVia, setFilteredShipVia] = useState<ShipVia[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingShipVia, setEditingShipVia] = useState<ShipVia | null>(null)

  useEffect(() => {
    fetchShipVia()
  }, [])

  useEffect(() => {
    const filtered = shipViaList.filter(shipVia =>
      shipVia.ship_company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipVia.account_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (shipVia.owner && shipVia.owner.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (shipVia.ship_model && shipVia.ship_model.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    setFilteredShipVia(filtered)
  }, [shipViaList, searchTerm])

  const fetchShipVia = async () => {
    try {
      const { data, error } = await supabase
        .from('my_ship_via')
        .select('*')
        .order('ship_company_name')

      if (error) throw error
      setShipViaList(data || [])
    } catch (error) {
      console.error('Error fetching ship via:', error)
      toast.error('Failed to fetch ship via companies')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (shipVia: ShipVia) => {
    setEditingShipVia(shipVia)
    setDialogOpen(true)
  }

  const handleDelete = async (shipVia: ShipVia) => {
    if (!confirm(`Are you sure you want to delete ${shipVia.ship_company_name}?`)) return

    try {
      const { error } = await supabase
        .from('my_ship_via')
        .delete()
        .eq('ship_via_id', shipVia.ship_via_id)

      if (error) throw error
      
      setShipViaList(shipViaList.filter(sv => sv.ship_via_id !== shipVia.ship_via_id))
      toast.success('Ship via company deleted successfully')
    } catch (error) {
      console.error('Error deleting ship via:', error)
      toast.error('Failed to delete ship via company')
    }
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditingShipVia(null)
    fetchShipVia()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading ship via companies...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-4 pb-4">
        <h1 className="text-2xl font-bold text-slate-900">Ship Via</h1>
        <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />Add
        </Button>
      </div>

      <Card>
        <CardHeader className="pt-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search companies, account numbers, owners..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredShipVia.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-slate-500">No ship via companies found</div>
              {searchTerm && (
                <Button
                  variant="link"
                  onClick={() => setSearchTerm('')}
                  className="mt-2"
                >
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredShipVia.map((shipVia) => (
                <Card key={shipVia.ship_via_id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Truck className="h-5 w-5 text-blue-600" />
                        <span className="font-bold text-base text-slate-900">{shipVia.ship_company_name}</span>
                        <span className="font-mono text-xs text-slate-500">{shipVia.account_no}</span>
                      </div>
                      {shipVia.owner && (
                        <div className="flex items-center text-xs text-slate-500">
                          <User className="h-4 w-4 mr-1" />{shipVia.owner}
                        </div>
                      )}
                      {shipVia.ship_model && (
                        <div className="text-xs text-slate-400">{shipVia.ship_model}</div>
                      )}
                      <div className="flex gap-2 mt-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(shipVia)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(shipVia)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ShipViaDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        shipVia={editingShipVia}
      />
    </div>
  )
}