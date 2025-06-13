'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Plus, Search, Edit, Trash2, Upload } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'
import { toast } from 'sonner'
import { PartNumberDialog } from '@/components/part-numbers/PartNumberDialog'
import dynamic from 'next/dynamic'

// Dynamically import ExcelImportDialog with ssr: false to prevent server-side rendering issues
const ExcelImportDialog = dynamic(
  () => import('@/components/part-numbers/ExcelImportDialog').then(mod => ({ default: mod.ExcelImportDialog })),
  { ssr: false }
)

type PartNumber = Database['public']['Tables']['pn_master_table']['Row']

export default function PartNumbersPage() {
  const [partNumbers, setPartNumbers] = useState<PartNumber[]>([])
  const [filteredPartNumbers, setFilteredPartNumbers] = useState<PartNumber[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [editingPartNumber, setEditingPartNumber] = useState<PartNumber | null>(null)

  useEffect(() => {
    fetchPartNumbers()
  }, [])

  useEffect(() => {
    const filtered = partNumbers.filter(pn =>
      pn.pn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pn.description && pn.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (pn.remarks && pn.remarks.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    setFilteredPartNumbers(filtered)
  }, [partNumbers, searchTerm])

  const fetchPartNumbers = async () => {
    try {
      const { data, error } = await supabase
        .from('pn_master_table')
        .select('*')
        .order('pn')

      if (error) throw error
      setPartNumbers(data || [])
    } catch (error) {
      console.error('Error fetching part numbers:', error)
      toast.error('Failed to fetch part numbers')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (partNumber: PartNumber) => {
    setEditingPartNumber(partNumber)
    setDialogOpen(true)
  }

  const handleDelete = async (partNumber: PartNumber) => {
    if (!confirm(`Are you sure you want to delete part number ${partNumber.pn}?`)) return

    try {
      const { error } = await supabase
        .from('pn_master_table')
        .delete()
        .eq('pn_id', partNumber.pn_id)

      if (error) throw error
      
      setPartNumbers(partNumbers.filter(pn => pn.pn_id !== partNumber.pn_id))
      toast.success('Part number deleted successfully')
    } catch (error) {
      console.error('Error deleting part number:', error)
      toast.error('Failed to delete part number')
    }
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditingPartNumber(null)
    fetchPartNumbers()
  }

  const handleImportDialogClose = () => {
    setImportDialogOpen(false)
    fetchPartNumbers()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading part numbers...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Part Numbers</h1>
          <p className="text-slate-600">Manage the master catalog of part numbers</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import Excel
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Part Number
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Part Number Catalog</CardTitle>
          <CardDescription>
            {partNumbers.length} part numbers • {filteredPartNumbers.length} shown
          </CardDescription>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search part numbers, descriptions, or remarks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
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
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div className="font-mono font-semibold text-slate-900 min-w-0">
                            {partNumber.pn}
                          </div>
                          {partNumber.description && (
                            <div className="text-slate-600 flex-1 min-w-0">
                              {partNumber.description}
                            </div>
                          )}
                        </div>
                        {partNumber.remarks && (
                          <div className="text-sm text-slate-500 mt-1">
                            {partNumber.remarks}
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-1 ml-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(partNumber)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(partNumber)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PartNumberDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        partNumber={editingPartNumber}
      />
      
      <ExcelImportDialog
        open={importDialogOpen}
        onClose={handleImportDialogClose}
      />
    </div>
  )
}