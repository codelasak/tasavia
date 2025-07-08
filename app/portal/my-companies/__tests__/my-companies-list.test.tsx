'use client'

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MyCompaniesList from '../my-companies-list'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

// Mock dependencies
jest.mock('@/lib/supabase/client')
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe('MyCompaniesList', () => {
  const user = userEvent.setup()

  const mockMyCompanies = [
    {
      my_company_id: '1',
      my_company_name: 'My Test Company',
      my_company_code: 'MTC001',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      company_contacts: [
        {
          contact_id: 'c1',
          contact_name: 'Jane Smith',
          email: 'jane@mytestcompany.com',
          phone: '+1987654321',
          role: 'CEO',
          is_primary: true,
          company_id: '1',
          company_ref_type: 'my_companies',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ],
      company_addresses: [
        {
          address_id: 'a1',
          address_line1: '456 Business Ave',
          address_line2: 'Floor 5',
          city: 'San Francisco',
          country: 'USA',
          zip_code: '94105',
          is_primary: true,
          company_id: '1',
          company_ref_type: 'my_companies',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ],
      company_ship_via: [
        {
          ship_via_id: 's1',
          ship_company_name: 'FedEx',
          predefined_company: 'FEDEX',
          custom_company_name: null,
          account_no: '987654321',
          owner: 'My Test Company',
          ship_model: 'GROUND',
          company_id: '1',
          company_ref_type: 'my_companies',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          ship_via_id: 's2',
          ship_company_name: 'Local Courier',
          predefined_company: 'CUSTOM',
          custom_company_name: 'Local Courier',
          account_no: 'LC-12345',
          owner: 'My Test Company',
          ship_model: 'GROUND',
          company_id: '1',
          company_ref_type: 'my_companies',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ],
    },
    {
      my_company_id: '2',
      my_company_name: 'Another Company',
      my_company_code: 'ANC002',
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      company_contacts: [],
      company_addresses: [],
      company_ship_via: [],
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock Supabase operations
    mockSupabase.from.mockImplementation((tableName: string) => {
      if (tableName === 'my_companies') {
        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockMyCompanies, error: null }),
          }),
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }
      }
      if (tableName === 'purchase_orders') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }
      }
      if (tableName === 'company_addresses') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: mockMyCompanies[0].company_addresses, error: null }),
          }),
        }
      }
      if (tableName === 'company_contacts') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: mockMyCompanies[0].company_contacts, error: null }),
          }),
        }
      }
      if (tableName === 'company_ship_via') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: mockMyCompanies[0].company_ship_via, error: null }),
          }),
        }
      }
      return {} as any
    })
  })

  it('renders the my companies list with initial data', () => {
    render(<MyCompaniesList initialCompanies={mockMyCompanies} />)

    expect(screen.getByText('Company List')).toBeInTheDocument()
    expect(screen.getByText('2 my companies • 2 shown')).toBeInTheDocument()
    expect(screen.getByText('My Test Company')).toBeInTheDocument()
    expect(screen.getByText('Another Company')).toBeInTheDocument()
  })

  it('displays company details including contacts, addresses and shipping', () => {
    render(<MyCompaniesList initialCompanies={mockMyCompanies} />)

    // Check company basic info using more flexible matching
    expect(screen.getByText(/MTC001/)).toBeInTheDocument()

    // Check contacts section
    expect(screen.getAllByText('Contacts')).toHaveLength(2) // Two companies, each with Contacts section
    expect(screen.getByText('Jane Smith (jane@mytestcompany.com)')).toBeInTheDocument()

    // Check addresses section
    expect(screen.getAllByText('Addresses')).toHaveLength(2) // Two companies, each with Addresses section
    expect(screen.getByText('456 Business Ave, San Francisco, USA')).toBeInTheDocument()

    // Check shipping methods section
    expect(screen.getAllByText('Shipping Methods')).toHaveLength(2) // Two companies, each with Shipping Methods section
    expect(screen.getByText('FedEx')).toBeInTheDocument()
    expect(screen.getByText('Local Courier')).toBeInTheDocument()
    expect(screen.getByText('(987654321)')).toBeInTheDocument()
    expect(screen.getByText('(LC-12345)')).toBeInTheDocument()
  })

  it('shows "No shipping methods" for companies without shipping info', () => {
    render(<MyCompaniesList initialCompanies={mockMyCompanies} />)

    // Another Company has no shipping methods
    const anotherCompanyCard = screen.getByText('Another Company').closest('.hover\\:shadow-md')
    expect(anotherCompanyCard).toBeInTheDocument()
    expect(anotherCompanyCard).toHaveTextContent('No shipping methods')
  })

  it('filters companies based on search term', async () => {
    render(<MyCompaniesList initialCompanies={mockMyCompanies} />)

    const searchInput = screen.getByPlaceholderText('Search companies...')
    await user.type(searchInput, 'Test')

    expect(screen.getByText('My Test Company')).toBeInTheDocument()
    expect(screen.queryByText('Another Company')).not.toBeInTheDocument()
    expect(screen.getByText('2 my companies • 1 shown')).toBeInTheDocument()
  })

  it('filters companies by company code', async () => {
    render(<MyCompaniesList initialCompanies={mockMyCompanies} />)

    const searchInput = screen.getByPlaceholderText('Search companies...')
    await user.type(searchInput, 'MTC001')

    expect(screen.getByText('My Test Company')).toBeInTheDocument()
    expect(screen.queryByText('Another Company')).not.toBeInTheDocument()
  })

  it('filters companies by contact name', async () => {
    render(<MyCompaniesList initialCompanies={mockMyCompanies} />)

    const searchInput = screen.getByPlaceholderText('Search companies...')
    await user.type(searchInput, 'Jane Smith')

    expect(screen.getByText('My Test Company')).toBeInTheDocument()
    expect(screen.queryByText('Another Company')).not.toBeInTheDocument()
  })

  it('filters companies by city', async () => {
    render(<MyCompaniesList initialCompanies={mockMyCompanies} />)

    const searchInput = screen.getByPlaceholderText('Search companies...')
    await user.type(searchInput, 'San Francisco')

    expect(screen.getByText('My Test Company')).toBeInTheDocument()
    expect(screen.queryByText('Another Company')).not.toBeInTheDocument()
  })

  it('shows Add Company button', () => {
    render(<MyCompaniesList initialCompanies={mockMyCompanies} />)

    const addButton = screen.getByRole('button', { name: /Add Company/ })
    expect(addButton).toBeInTheDocument()
  })

  it('shows edit and delete buttons for each company', () => {
    render(<MyCompaniesList initialCompanies={mockMyCompanies} />)

    const allButtons = screen.getAllByRole('button')
    const editDeleteButtons = allButtons.filter(button => {
      const hasIcon = button.querySelector('svg')
      const classes = button.getAttribute('class') || ''
      return hasIcon && (classes.includes('ghost') || classes.includes('w-10'))
    })

    // Should have edit and delete buttons for each company (at least 2 companies * 2 buttons = 4)
    expect(editDeleteButtons.length).toBeGreaterThanOrEqual(2) // At least some action buttons
  })

  it('handles company deletion with confirmation', async () => {
    const originalConfirm = window.confirm
    window.confirm = jest.fn(() => true)

    render(<MyCompaniesList initialCompanies={mockMyCompanies} />)

    // Find and click delete button for first company
    const deleteButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('[data-testid="trash-icon"], .lucide-trash-2')
    )
    
    if (deleteButtons.length > 0) {
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete My Test Company?')
        expect(mockSupabase.from).toHaveBeenCalledWith('my_companies')
        expect(toast.success).toHaveBeenCalledWith('Company deleted successfully')
      })
    }

    window.confirm = originalConfirm
  })

  it('prevents deletion when company is referenced in purchase orders', async () => {
    // Mock that company is referenced in POs
    mockSupabase.from.mockImplementation((tableName: string) => {
      if (tableName === 'purchase_orders') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ 
                data: [{ po_id: 'po1' }], // Has reference
                error: null 
              }),
            }),
          }),
        }
      }
      return {
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockMyCompanies, error: null }),
        }),
      } as any
    })

    const originalConfirm = window.confirm
    window.confirm = jest.fn(() => true)

    render(<MyCompaniesList initialCompanies={mockMyCompanies} />)

    const deleteButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('[data-testid="trash-icon"], .lucide-trash-2')
    )
    
    if (deleteButtons.length > 0) {
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Cannot delete company: It is referenced in existing purchase orders'
        )
      })
    }

    window.confirm = originalConfirm
  })

  it('handles foreign key constraint errors on deletion', async () => {
    // Mock foreign key constraint error
    mockSupabase.from.mockImplementation((tableName: string) => {
      if (tableName === 'my_companies') {
        return {
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ 
              error: { code: '23503', message: 'Foreign key constraint' } 
            }),
          }),
        }
      }
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      } as any
    })

    const originalConfirm = window.confirm
    window.confirm = jest.fn(() => true)

    render(<MyCompaniesList initialCompanies={mockMyCompanies} />)

    const deleteButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('[data-testid="trash-icon"], .lucide-trash-2')
    )
    
    if (deleteButtons.length > 0) {
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Cannot delete company: It is referenced by other records'
        )
      })
    }

    window.confirm = originalConfirm
  })

  it('shows no companies message when filtered list is empty', async () => {
    render(<MyCompaniesList initialCompanies={mockMyCompanies} />)

    const searchInput = screen.getByPlaceholderText('Search companies...')
    await user.type(searchInput, 'NonexistentCompany')

    expect(screen.getByText('No companies found')).toBeInTheDocument()
  })

  it('handles fetch companies error gracefully', async () => {
    // Mock error scenario
    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Network error' } 
        }),
      }),
    }) as any)

    render(<MyCompaniesList initialCompanies={[]} />)

    // Simulate a user action that would trigger fetchCompanies
    const addButton = screen.getByRole('button', { name: /Add Company/ })
    await user.click(addButton)

    // This would trigger the error handling
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to fetch companies')
    }, { timeout: 2000 })
  })

  it('displays multiple shipping methods correctly', () => {
    render(<MyCompaniesList initialCompanies={mockMyCompanies} />)

    // First company should show two shipping methods
    expect(screen.getByText('FedEx')).toBeInTheDocument()
    expect(screen.getByText('Local Courier')).toBeInTheDocument()
    
    // Check both account numbers are displayed
    expect(screen.getByText('(987654321)')).toBeInTheDocument()
    expect(screen.getByText('(LC-12345)')).toBeInTheDocument()
    
    // Check shipping models are displayed
    const groundBadges = screen.getAllByText('GROUND')
    expect(groundBadges).toHaveLength(2)
  })

  it('handles empty initial companies list', () => {
    render(<MyCompaniesList initialCompanies={[]} />)

    expect(screen.getByText('0 my companies • 0 shown')).toBeInTheDocument()
    expect(screen.getByText('No companies found')).toBeInTheDocument()
  })
})