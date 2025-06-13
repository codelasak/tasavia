'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Plus, Search, Edit, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/server'
import { toast } from 'sonner'
import { CompanyDialog } from '@/components/companies/CompanyDialog'

type MyCompany = Database['public']['Tables']['my_companies']['Row']

export default function MyCompaniesPage() {
  const [companies, setCompanies] = useState<MyCompany[]>([])
  const [filteredCompanies, setFilteredCompanies] = useState<MyCompany[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<MyCompany | null>(null)

  useEffect(() => {
    fetchCompanies()
  }, [])

  useEffect(() => {
    const filtered = companies.filter(company =>
      company.my_company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.my_company_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (company.city && company.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (company.country && company.country.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    setFilteredCompanies(filtered)
  }, [companies, searchTerm])

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('my_companies')
        .select('*')
        .order('my_company_name')

      if (error) throw error
      setCompanies(data || [])
    } catch (error) {
      console.error('Error fetching companies:', error)
      toast.error('Failed to fetch companies')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (company: MyCompany) => {
    setEditingCompany(company)
    setDialogOpen(true)
  }

  const handleDelete = async (company: MyCompany) => {
    if (!confirm(`Are you sure you want to delete ${company.my_company_name}?`)) return

    try {
      // First check if this company is referenced in any purchase orders
      const { data: poReferences, error: poCheckError } = await supabase
        .from('purchase_orders')
        .select('po_id')
        .eq('my_company_id', company.my_company_id)
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
        .from('my_companies')
        .delete()
        .eq('my_company_id', company.my_company_id)

      if (error) {
        console.error('Delete error:', error)
        throw error
      }
      
      setCompanies(companies.filter(c => c.my_company_id !== company.my_company_id))
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading companies...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Companies</h1>
          <p className="text-slate-600">Manage your internal company profiles</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Company
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company List</CardTitle>
          <CardDescription>
            {companies.length} companies • {filteredCompanies.length} shown
          </CardDescription>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredCompanies.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-slate-500">No companies found</div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCompanies.map((company) => (
                <Card key={company.my_company_id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{company.my_company_name}</CardTitle>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(company)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(company)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>Code: {company.my_company_code}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-sm text-slate-600 space-y-1">
                      {company.my_company_address && (
                        <div>{company.my_company_address}</div>
                      )}
                      {(company.city || company.country) && (
                        <div>
                          {company.city}{company.city && company.country && ', '}{company.country}
                        </div>
                      )}
                      {company.phone && (
                        <div>📞 {company.phone}</div>
                      )}
                      {company.email && (
                        <div>✉️ {company.email}</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CompanyDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        company={editingCompany}
        type="my_company"
      />
    </div>
  )
}