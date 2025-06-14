'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, Edit, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/server'
import { toast } from 'sonner'
import { CompanyDialog } from '@/components/companies/CompanyDialog'

type ExternalCompany = Database['public']['Tables']['companies']['Row']

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<ExternalCompany[]>([])
  const [filteredCompanies, setFilteredCompanies] = useState<ExternalCompany[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<ExternalCompany | null>(null)

  useEffect(() => {
    fetchCompanies()
  }, [])

  useEffect(() => {
    let filtered = companies.filter(company =>
      company.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.company_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (company.city && company.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (company.country && company.country.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    if (typeFilter !== 'all' && typeFilter) {
      filtered = filtered.filter(company => company.company_type === typeFilter)
    }

    setFilteredCompanies(filtered)
  }, [companies, searchTerm, typeFilter])

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('company_name')

      if (error) throw error
      setCompanies(data || [])
    } catch (error) {
      console.error('Error fetching companies:', error)
      toast.error('Failed to fetch companies')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (company: ExternalCompany) => {
    setEditingCompany(company)
    setDialogOpen(true)
  }

  const handleDelete = async (company: ExternalCompany) => {
    if (!confirm(`Are you sure you want to delete ${company.company_name}?`)) return

    try {
      // First check if this company is referenced in any purchase orders
      const { data: poReferences, error: poCheckError } = await supabase
        .from('purchase_orders')
        .select('po_id')
        .eq('vendor_company_id', company.company_id)
        .limit(1)

      if (poCheckError) {
        console.error('Error checking PO references:', poCheckError)
        throw new Error('Failed to check company references')
      }

      if (poReferences && poReferences.length > 0) {
        toast.error('Cannot delete company: It is referenced in existing purchase orders')
        return
      }

      // If no references found, proceed with deletion
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('company_id', company.company_id)

      if (error) {
        console.error('Delete error:', error)
        throw error
      }
      
      setCompanies(companies.filter(c => c.company_id !== company.company_id))
      toast.success('Company deleted successfully')
    } catch (error: any) {
      console.error('Error deleting company:', error)
      
      // Handle specific error cases
      if (error.code === '23503') {
        toast.error('Cannot delete company: It is referenced by other records')
      } else if (error.message?.includes('foreign key')) {
        toast.error('Cannot delete company: It is referenced in purchase orders or other records')
      } else {
        toast.error(error.message || 'Failed to delete company')
      }
    }
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditingCompany(null)
    fetchCompanies()
  }

  const getCompanyTypeBadge = (type: string | undefined) => {
    if (!type) return 'bg-gray-100 text-gray-800'
    
    const colors = {
      vendor: 'bg-blue-100 text-blue-800',
      customer: 'bg-green-100 text-green-800',
      both: 'bg-purple-100 text-purple-800'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading companies...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4 px-2 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-900">External Companies</h1>
        <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />Add
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Company List</CardTitle>
          <div className="relative flex gap-2 mt-2">
            <div className="flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input placeholder="Search companies..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="vendor">Vendor</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCompanies.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No companies found</div>
          ) : (
            <div className="space-y-2">
              {filteredCompanies.map((company) => (
                <Card key={company.company_id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{company.company_name}</CardTitle>
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(company)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(company)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-xs">Code: {company.company_code}</CardDescription>
                      <Badge className={getCompanyTypeBadge(company.company_type)}>{company.company_type || 'vendor'}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 text-xs text-slate-600">
                    {(company.city || company.country) && (
                      <div>{company.city}{company.city && company.country && ', '}{company.country}</div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <CompanyDialog open={dialogOpen} onClose={handleDialogClose} company={editingCompany} type="external_company" />
    </div>
  )
}