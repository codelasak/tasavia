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

type ExternalCompany = Database['public']['Tables']['companies']['Row'] & {
  company_contacts: Database['public']['Tables']['company_contacts']['Row'][]
  company_addresses: Database['public']['Tables']['company_addresses']['Row'][]
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<ExternalCompany[]>([])
  const [filteredCompanies, setFilteredCompanies] = useState<ExternalCompany[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<ExternalCompany | null>(null)

  useEffect(() => {
    fetchCompanies()
  }, [])

  useEffect(() => {
    const lowercasedTerm = searchTerm.toLowerCase()
    const filtered = companies.filter(company =>
      company.company_name.toLowerCase().includes(lowercasedTerm) ||
      (company.company_code && company.company_code.toLowerCase().includes(lowercasedTerm)) ||
      company.company_addresses.some(a => 
        (a.city && a.city.toLowerCase().includes(lowercasedTerm)) ||
        (a.country && a.country.toLowerCase().includes(lowercasedTerm))
      ) ||
      company.company_contacts.some(c => c.contact_name && c.contact_name.toLowerCase().includes(lowercasedTerm))
    )
    setFilteredCompanies(filtered)
  }, [companies, searchTerm])

  const fetchCompanies = async () => {
    setLoading(true)
    try {
      // Fetch companies first
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('company_name')

      if (companiesError) throw companiesError

      // Fetch addresses separately
      const { data: addressData } = await supabase
        .from('company_addresses')
        .select('*')
        .eq('company_ref_type', 'companies')

      // Fetch contacts separately 
      const { data: contactData } = await supabase
        .from('company_contacts') 
        .select('*')
        .eq('company_ref_type', 'companies')

      // Combine the data
      const companiesWithRelations = companiesData?.map(company => ({
        ...company,
        company_addresses: addressData?.filter(addr => addr.company_id === company.company_id) || [],
        company_contacts: contactData?.filter(contact => contact.company_id === company.company_id) || []
      })) || []

      setCompanies(companiesWithRelations)
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
      // Check for references in purchase_orders as vendor
      const { data: vendorPOs, error: vendorPOError } = await supabase
        .from('purchase_orders')
        .select('po_id')
        .eq('vendor_company_id', company.company_id)
        .limit(1)

      if (vendorPOError) throw new Error('Failed to check vendor PO references')
      if (vendorPOs && vendorPOs.length > 0) {
        toast.error('Cannot delete company: It is referenced as a vendor in existing purchase orders.')
        return
      }

      // Check for references in purchase_orders as ship_via
      const { data: shipViaPOs, error: shipViaPOError } = await supabase
        .from('purchase_orders')
        .select('po_id')
        .eq('ship_via_id', company.company_id)
        .limit(1)

      if (shipViaPOError) throw new Error('Failed to check ship via PO references')
      if (shipViaPOs && shipViaPOs.length > 0) {
        toast.error('Cannot delete company: It is referenced as a shipping company in existing purchase orders.')
        return
      }

      // If no references found, proceed with deletion
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('company_id', company.company_id)

      if (error) throw error
      
      setCompanies(companies.filter(c => c.company_id !== company.company_id))
      toast.success('Company deleted successfully')
    } catch (error: any) {
      console.error('Error deleting company:', error)
      toast.error(error.message || 'Failed to delete company')
    }
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditingCompany(null)
    fetchCompanies()
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-slate-500">Loading companies...</div></div>
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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input placeholder="Search companies..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
        </CardHeader>
        <CardContent>
          {filteredCompanies.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No companies found</div>
          ) : (
            <div className="space-y-3">
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
                    <CardDescription className="text-xs">Code: {company.company_code} | Type: {company.company_type}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2 text-xs text-slate-600 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-1">Addresses</h4>
                      {company.company_addresses.length > 0 ? (
                        <ul className="space-y-1">
                          {company.company_addresses.map(addr => (
                            <li key={addr.address_id}>{addr.address_line1}, {addr.city}, {addr.country}</li>
                          ))}
                        </ul>
                      ) : <p>No addresses</p>}
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Contacts</h4>
                      {company.company_contacts.length > 0 ? (
                        <ul className="space-y-1">
                          {company.company_contacts.map(contact => (
                            <li key={contact.contact_id}>{contact.contact_name} ({contact.email})</li>
                          ))}
                        </ul>
                      ) : <p>No contacts</p>}
                    </div>
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