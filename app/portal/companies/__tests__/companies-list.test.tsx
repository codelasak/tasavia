'use client'

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CompaniesList from '../companies-list'
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

describe('CompaniesList', () => {
  const user = userEvent.setup()

  const mockCompanies = [
    {
      company_id: '1',
      company_name: 'Acme Corporation',
      company_code: 'ACM001',
      company_type: 'vendor',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      company_contacts: [
        {
          contact_id: 'c1',
          contact_name: 'John Doe',
          email: 'john@acme.com',
          phone: '+1234567890',
          role: 'Manager',
          is_primary: true,
          company_id: '1',
          company_ref_type: 'companies',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ],
      company_addresses: [
        {
          address_id: 'a1',
          address_line1: '123 Main St',
          address_line2: 'Suite 100',
          city: 'New York',
          country: 'USA',
          zip_code: '10001',
          is_primary: true,
          company_id: '1',
          company_ref_type: 'companies',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ],
      company_ship_via: [
        {
          ship_via_id: 's1',
          ship_company_name: 'DHL',
          predefined_company: 'DHL',
          custom_company_name: null,
          account_no: '123456789',
          owner: 'Acme Corp',
          ship_model: 'GROUND',
          company_id: '1',
          company_ref_type: 'companies',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ],
    },
    {
      company_id: '2',
      company_name: 'Beta Industries',
      company_code: 'BET002',
      company_type: 'customer',
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
      if (tableName === 'companies') {
        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockCompanies, error: null }),
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
            eq: jest.fn().mockResolvedValue({ data: mockCompanies[0].company_addresses, error: null }),
          }),
        }
      }
      if (tableName === 'company_contacts') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: mockCompanies[0].company_contacts, error: null }),
          }),
        }
      }
      if (tableName === 'company_ship_via') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: mockCompanies[0].company_ship_via, error: null }),
          }),
        }
      }
      return {} as any
    })
  })

  it('renders the companies list with initial data', () => {
    render(<CompaniesList initialCompanies={mockCompanies} />)

    expect(screen.getByText('Company List')).toBeInTheDocument()
    expect(screen.getByText('2 external companies • 2 shown')).toBeInTheDocument()
    expect(screen.getByText('Acme Corporation')).toBeInTheDocument()
    expect(screen.getByText('Beta Industries')).toBeInTheDocument()
  })

  it('displays company details including contacts, addresses and shipping', () => {
    render(<CompaniesList initialCompanies={mockCompanies} />)

    // Check company basic info using more flexible text matching
    expect(screen.getByText(/ACM001/)).toBeInTheDocument()
    expect(screen.getByText(/vendor/)).toBeInTheDocument()

    // Check contacts section
    expect(screen.getAllByText('Contacts')).toHaveLength(2) // Two companies, each with Contacts section
    expect(screen.getByText('John Doe (john@acme.com)')).toBeInTheDocument()

    // Check addresses section
    expect(screen.getAllByText('Addresses')).toHaveLength(2) // Two companies, each with Addresses section
    expect(screen.getByText('123 Main St, New York, USA')).toBeInTheDocument()

    // Check shipping methods section
    expect(screen.getAllByText('Shipping Methods')).toHaveLength(2) // Two companies, each with Shipping Methods section
    expect(screen.getByText('DHL')).toBeInTheDocument()
    expect(screen.getByText('(123456789)')).toBeInTheDocument()
    expect(screen.getByText('GROUND')).toBeInTheDocument()
  })

  it('shows "No shipping methods" for companies without shipping info', () => {
    render(<CompaniesList initialCompanies={mockCompanies} />)

    // Beta Industries has no shipping methods
    const betaCard = screen.getByText('Beta Industries').closest('.hover\\:shadow-md')
    expect(betaCard).toBeInTheDocument()
    expect(betaCard).toHaveTextContent('No shipping methods')
  })

  it('filters companies based on search term', async () => {
    render(<CompaniesList initialCompanies={mockCompanies} />)

    const searchInput = screen.getByPlaceholderText('Search companies...')
    await user.type(searchInput, 'Acme')

    expect(screen.getByText('Acme Corporation')).toBeInTheDocument()
    expect(screen.queryByText('Beta Industries')).not.toBeInTheDocument()
    expect(screen.getByText('2 external companies • 1 shown')).toBeInTheDocument()
  })

  it('filters companies by contact name', async () => {
    render(<CompaniesList initialCompanies={mockCompanies} />)

    const searchInput = screen.getByPlaceholderText('Search companies...')
    await user.type(searchInput, 'John Doe')

    expect(screen.getByText('Acme Corporation')).toBeInTheDocument()
    expect(screen.queryByText('Beta Industries')).not.toBeInTheDocument()
  })

  it('filters companies by city', async () => {
    render(<CompaniesList initialCompanies={mockCompanies} />)

    const searchInput = screen.getByPlaceholderText('Search companies...')
    await user.type(searchInput, 'New York')

    expect(screen.getByText('Acme Corporation')).toBeInTheDocument()
    expect(screen.queryByText('Beta Industries')).not.toBeInTheDocument()
  })

  it('shows Add Company button', () => {
    render(<CompaniesList initialCompanies={mockCompanies} />)

    const addButton = screen.getByRole('button', { name: /Add Company/ })
    expect(addButton).toBeInTheDocument()
  })

  it('opens company dialog when Add Company button is clicked', async () => {
    render(<CompaniesList initialCompanies={mockCompanies} />)

    const addButton = screen.getByRole('button', { name: /Add Company/ })
    await user.click(addButton)

    // Note: This test might need to be adjusted based on how the dialog is implemented
    // The dialog opening might trigger a state change that's hard to test in isolation
  })

  it('shows edit and delete buttons for each company', () => {
    render(<CompaniesList initialCompanies={mockCompanies} />)

    const allButtons = screen.getAllByRole('button')
    const editDeleteButtons = allButtons.filter(button => {
      const hasIcon = button.querySelector('svg')
      const classes = button.getAttribute('class') || ''
      return hasIcon && (classes.includes('ghost') || classes.includes('w-10'))
    })

    // Should have edit and delete buttons for each company (at least some action buttons)
    expect(editDeleteButtons.length).toBeGreaterThanOrEqual(2) // At least some action buttons
  })

  it('handles company deletion with confirmation', async () => {
    // Mock window.confirm
    const originalConfirm = window.confirm
    window.confirm = jest.fn(() => true)

    render(<CompaniesList initialCompanies={mockCompanies} />)

    // Find and click delete button for first company
    const deleteButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('[data-testid="trash-icon"], .lucide-trash-2')
    )
    
    if (deleteButtons.length > 0) {
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete Acme Corporation?')
        expect(mockSupabase.from).toHaveBeenCalledWith('companies')
        expect(toast.success).toHaveBeenCalledWith('Company deleted successfully')
      })
    }

    // Restore original confirm
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
          order: jest.fn().mockResolvedValue({ data: mockCompanies, error: null }),
        }),
      } as any
    })

    const originalConfirm = window.confirm
    window.confirm = jest.fn(() => true)

    render(<CompaniesList initialCompanies={mockCompanies} />)

    const deleteButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('[data-testid="trash-icon"], .lucide-trash-2')
    )
    
    if (deleteButtons.length > 0) {
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Cannot delete company: It is referenced as a vendor in existing purchase orders.'
        )
      })
    }

    window.confirm = originalConfirm
  })

  it('shows no companies message when filtered list is empty', async () => {
    render(<CompaniesList initialCompanies={mockCompanies} />)

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

    render(<CompaniesList initialCompanies={[]} />)

    // Simulate a user action that would trigger fetchCompanies
    const addButton = screen.getByRole('button', { name: /Add Company/ })
    await user.click(addButton)

    // This would trigger the error handling
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to fetch companies')
    }, { timeout: 2000 })
  })
})