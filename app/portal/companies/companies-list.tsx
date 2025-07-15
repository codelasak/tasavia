'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, Edit, Trash2, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/database.types'
import { toast } from 'sonner'
import { CompanyDialog } from '@/components/companies/CompanyDialog'

type ExternalCompany = Database['public']['Tables']['companies']['Row'] & {
  company_contacts: Database['public']['Tables']['company_contacts']['Row'][]
  company_addresses: Database['public']['Tables']['company_addresses']['Row'][]
  company_ship_via: Database['public']['Tables']['company_ship_via']['Row'][]
}

interface CompaniesListProps {
  initialCompanies: ExternalCompany[]
}

export default function CompaniesList({ initialCompanies }: CompaniesListProps) {
  const [companies, setCompanies] = useState<ExternalCompany[]>(initialCompanies)
  const [filteredCompanies, setFilteredCompanies] = useState<ExternalCompany[]>(initialCompanies)
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<ExternalCompany | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
    try {
      setLoading(true)
      setError(null)
      
      // Fetch companies first
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('company_name')

      if (companiesError) {
        console.error('Fetch companies error:', companiesError)
        throw new Error(companiesError.message || 'Failed to fetch companies')
      }

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

      // Fetch shipping data separately
      const { data: shipViaData } = await supabase
        .from('company_ship_via')
        .select('*')
        .eq('company_ref_type', 'companies')

      // Combine the data
      const companiesWithRelations = companiesData?.map(company => ({
        ...company,
        company_addresses: addressData?.filter(addr => addr.company_id === company.company_id) || [],
        company_contacts: contactData?.filter(contact => contact.company_id === company.company_id) || [],
        company_ship_via: shipViaData?.filter(ship => ship.company_id === company.company_id) || []
      })) || []

      setCompanies(companiesWithRelations)
    } catch (error: any) {
      console.error('Error fetching companies:', error)
      const errorMessage = error.message || 'Failed to fetch companies'
      setError(errorMessage)
      toast.error(errorMessage)
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
      setDeleteLoading(company.company_id)
      
      // Check for references in purchase_orders as vendor
      const { data: vendorPOs, error: vendorPOError } = await supabase
        .from('purchase_orders')
        .select('po_id')
        .eq('vendor_company_id', company.company_id)
        .limit(1)

      if (vendorPOError) {
        console.error('Vendor PO check error:', vendorPOError)
        throw new Error(vendorPOError.message || 'Failed to check vendor PO references')
      }
      
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

      if (shipViaPOError) {
        console.error('Ship via PO check error:', shipViaPOError)
        throw new Error(shipViaPOError.message || 'Failed to check ship via PO references')
      }
      
      if (shipViaPOs && shipViaPOs.length > 0) {
        toast.error('Cannot delete company: It is referenced as a shipping company in existing purchase orders.')
        return
      }

      // If no references found, proceed with deletion
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('company_id', company.company_id)

      if (error) {
        console.error('Delete company error:', error)
        throw new Error(error.message || 'Failed to delete company')
      }
      
      setCompanies(companies.filter(c => c.company_id !== company.company_id))
      toast.success('Company deleted successfully')
    } catch (error: any) {
      console.error('Error deleting company:', error)
      toast.error(error.message || 'Failed to delete company')
    } finally {
      setDeleteLoading(null)
    }
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditingCompany(null)
    fetchCompanies()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Company List</CardTitle>
            <CardDescription>
              {companies.length} external companies • {filteredCompanies.length} shown
            </CardDescription>
          </div>
          <Button 
            onClick={() => {
              setEditingCompany(null)
              setDialogOpen(true)
            }}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Company
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input placeholder="Search companies..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block h-8 w-8 animate-spin border-4 border-current border-t-transparent rounded-full" />
            <div className="mt-2 text-slate-500">Loading companies...</div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-red-600 mb-2">Error loading companies</div>
            <div className="text-sm text-slate-500 mb-4">{error}</div>
            <Button variant="outline" onClick={fetchCompanies}>
              Try Again
            </Button>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="text-center py-8 text-slate-500">No companies found</div>
        ) : (
          <div className="space-y-3">
            {filteredCompanies.map((company) => (
              <Card key={company.company_id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{company.company_name}</CardTitle>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(company)} disabled={deleteLoading === company.company_id}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(company)} disabled={deleteLoading === company.company_id}>
                        {deleteLoading === company.company_id ? (
                          <div className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="text-xs">Code: {company.company_code} | Type: {company.company_type}</CardDescription>
                </CardHeader>
                <CardContent className="pt-2 text-xs text-slate-600 grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <div>
                    <h4 className="font-semibold mb-1">Shipping Methods</h4>
                    {company.company_ship_via.length > 0 ? (
                      <ul className="space-y-1">
                        {company.company_ship_via.map(ship => (
                          <li key={ship.ship_via_id} className="flex items-center gap-1">
                            <span className="text-blue-600 font-medium">{ship.ship_company_name}</span>
                            <span className="text-slate-500">({ship.account_no})</span>
                            {ship.ship_model && <span className="text-xs bg-slate-100 px-1 rounded">{ship.ship_model}</span>}
                          </li>
                        ))}
                      </ul>
                    ) : <p>No shipping methods</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
      <CompanyDialog open={dialogOpen} onClose={handleDialogClose} company={editingCompany as any} type="external_company" />
    </Card>
  )
}