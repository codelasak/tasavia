'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, Edit, Trash2, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/database.types'
import { toast } from 'sonner'
import { PartNumberDialog } from '@/components/part-numbers/PartNumberDialog'

type PartNumber = Database['public']['Tables']['pn_master_table']['Row']

interface PartNumbersListProps {
  initialPartNumbers: PartNumber[]
}

export default function PartNumbersList({ initialPartNumbers }: PartNumbersListProps) {
  const [partNumbers, setPartNumbers] = useState<PartNumber[]>(initialPartNumbers)
  const [filteredPartNumbers, setFilteredPartNumbers] = useState<PartNumber[]>(initialPartNumbers)
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPartNumber, setEditingPartNumber] = useState<PartNumber | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

  useEffect(() => {
    const filtered = partNumbers.filter(pn =>
      pn.pn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pn.description && pn.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (pn.remarks && pn.remarks.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    setFilteredPartNumbers(filtered)
  }, [partNumbers, searchTerm])

  const handleEdit = (partNumber: PartNumber) => {
    setEditingPartNumber(partNumber)
    setDialogOpen(true)
  }

  const handleDelete = async (partNumber: PartNumber) => {
    if (!confirm(`Are you sure you want to delete part number ${partNumber.pn}?`)) return

    try {
      setDeleteLoading(partNumber.pn_id)
      
      const { error } = await supabase
        .from('pn_master_table')
        .delete()
        .eq('pn_id', partNumber.pn_id)

      if (error) {
        console.error('Delete error:', error)
        throw new Error(error.message || 'Failed to delete part number')
      }
      
      setPartNumbers(partNumbers.filter(pn => pn.pn_id !== partNumber.pn_id))
      toast.success('Part number deleted successfully')
    } catch (error: any) {
      console.error('Error deleting part number:', error)
      toast.error(error.message || 'Failed to delete part number')
    } finally {
      setDeleteLoading(null)
    }
  }

  const fetchPartNumbers = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('pn_master_table')
        .select('*')
        .order('pn')

      if (error) {
        console.error('Fetch error:', error)
        throw new Error(error.message || 'Failed to fetch part numbers')
      }
      
      setPartNumbers(data || [])
    } catch (error: any) {
      console.error('Error fetching part numbers:', error)
      toast.error(error.message || 'Failed to fetch part numbers')
    } finally {
      setLoading(false)
    }
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditingPartNumber(null)
    fetchPartNumbers()
  }

  return (
    <Card>
      <CardHeader className="pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Part Numbers</CardTitle>
            <CardDescription>
              {partNumbers.length} part numbers • {filteredPartNumbers.length} shown
            </CardDescription>
          </div>
          <Button 
            onClick={() => {
              setEditingPartNumber(null)
              setDialogOpen(true)
            }}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Part Number
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input
            placeholder="Search part numbers, descriptions, or remarks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
      </CardHeader>
      <CardContent>
        {filteredPartNumbers.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-slate-500">No part numbers found</div>
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
            {filteredPartNumbers.map((partNumber) => (
              <Card key={partNumber.pn_id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-base text-slate-900">{partNumber.pn}</span>
                      {partNumber.description && (
                        <span className="text-xs text-slate-500 line-clamp-2">{partNumber.description}</span>
                      )}
                    </div>
                    {partNumber.remarks && (
                      <div className="text-xs text-slate-400 line-clamp-2">{partNumber.remarks}</div>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleEdit(partNumber)}
                        disabled={deleteLoading === partNumber.pn_id}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(partNumber)}
                        disabled={deleteLoading === partNumber.pn_id}
                      >
                        {deleteLoading === partNumber.pn_id ? (
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
      </CardContent>

      <PartNumberDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        partNumber={editingPartNumber}
      />
    </Card>
  )
}