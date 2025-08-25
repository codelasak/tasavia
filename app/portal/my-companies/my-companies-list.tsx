'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, Edit, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { CompanyDialog } from '@/components/companies/CompanyDialog'
import { UnifiedCompany, getInternalCompanies, deleteCompany, checkCompanyReferences } from '@/lib/services/company-service'

interface MyCompaniesListProps {
  initialCompanies: UnifiedCompany[]
}

export default function MyCompaniesList({ initialCompanies }: MyCompaniesListProps) {
  const [companies, setCompanies] = useState<UnifiedCompany[]>(initialCompanies)
  const [filteredCompanies, setFilteredCompanies] = useState<UnifiedCompany[]>(initialCompanies)
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<UnifiedCompany | null>(null)

  useEffect(() => {
    const lowercasedTerm = searchTerm.toLowerCase()
    const filtered = companies.filter(company =>
      (company.name && company.name.toLowerCase().includes(lowercasedTerm)) ||
      (company.code && company.code.toLowerCase().includes(lowercasedTerm)) ||
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
      const companiesData = await getInternalCompanies()
      setCompanies(companiesData)
    } catch (error) {
      console.error('Error fetching companies:', error)
      toast.error('Failed to fetch companies')
    }
  }

  const handleEdit = (company: UnifiedCompany) => {
    setEditingCompany(company)
    setDialogOpen(true)
  }

  const handleDelete = async (company: UnifiedCompany) => {
    if (!confirm(`Are you sure you want to delete ${company.name}?`)) return

    try {
      // Check if company is referenced
      const hasReferences = await checkCompanyReferences(company.id, company.is_self)
      
      if (hasReferences) {
        toast.error('Cannot delete company: It is referenced in existing purchase orders')
        return
      }

      // Proceed with deletion using service
      await deleteCompany(company.id, company.is_self)
      
      setCompanies(companies.filter(c => c.id !== company.id))
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Company List</CardTitle>
            <CardDescription>
              {companies.length} my companies • {filteredCompanies.length} shown
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
        {filteredCompanies.length === 0 ? (
          <div className="text-center py-8 text-slate-500">No companies found</div>
        ) : (
          <div className="space-y-2">
            {filteredCompanies.map((company) => (
              <Card key={company.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{company.name}</CardTitle>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(company)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(company)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <CardDescription className="text-xs">Code: {company.code}</CardDescription>
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
      <CompanyDialog open={dialogOpen} onClose={handleDialogClose} company={editingCompany as any} type="my_company" />
    </Card>
  )
}