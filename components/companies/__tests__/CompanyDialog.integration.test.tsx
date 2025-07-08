'use client'

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CompanyDialog } from '../CompanyDialog'
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

describe('CompanyDialog Integration Tests', () => {
  const user = userEvent.setup()

  const mockExternalCompanyProps = {
    open: true,
    onClose: jest.fn(),
    company: null,
    type: 'external_company' as const,
  }

  const mockMyCompanyProps = {
    open: true,
    onClose: jest.fn(),
    company: null,
    type: 'my_company' as const,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock successful Supabase operations
    mockSupabase.from.mockImplementation((tableName: string) => {
      const mockChain = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ 
              data: { 
                company_id: 'test-id', 
                company_name: 'Test Company',
                company_code: 'TST123' 
              }, 
              error: null 
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }),
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }
      return mockChain as any
    })
  })

  describe('External Company Shipping Integration', () => {
    it('should create external company with shipping information', async () => {
      render(<CompanyDialog {...mockExternalCompanyProps} />)

      // Wait for dialog to be fully rendered
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Fill basic info using more specific selectors
      const companyNameInput = screen.getByRole('textbox', { name: /company name/i })
      const companyCodeInput = screen.getByRole('textbox', { name: /company code/i })
      const companyTypeSelect = screen.getByRole('combobox', { name: /company type/i })
      
      await user.type(companyNameInput, 'Acme Corp')
      await user.type(companyCodeInput, 'ACM001')
      await user.selectOptions(companyTypeSelect, 'vendor')

      // Navigate to shipping tab
      await user.click(screen.getByRole('tab', { name: 'Shipping' }))
      
      // Add shipping method
      await user.click(screen.getByRole('button', { name: /Add Shipping Method/ }))
      
      // Fill shipping details using more specific selectors
      const shippingCompanySelect = screen.getByRole('combobox', { name: /shipping company/i })
      const accountNumberInput = screen.getByRole('textbox', { name: /account number/i })
      const shipModelSelect = screen.getByRole('combobox', { name: /ship model/i })
      
      await user.selectOptions(shippingCompanySelect, 'ARAMEX')
      await user.type(accountNumberInput, '24214151')
      await user.selectOptions(shipModelSelect, 'SEA')

      // Submit form
      await user.click(screen.getByRole('button', { name: 'Create' }))

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('companies')
        expect(mockSupabase.from).toHaveBeenCalledWith('company_ship_via')
        expect(toast.success).toHaveBeenCalledWith('Company created successfully')
      })
    })

    it('should handle shipping data updates for existing external company', async () => {
      const existingCompany = {
        company_id: 'existing-id',
        company_name: 'Existing Corp',
        company_code: 'EXT001',
        company_type: 'customer',
      }

      render(<CompanyDialog {...mockExternalCompanyProps} company={existingCompany} />)

      // Wait for dialog to be rendered
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Navigate to shipping tab
      await user.click(screen.getByRole('tab', { name: 'Shipping' }))
      
      // Add new shipping method
      await user.click(screen.getByRole('button', { name: /Add Shipping Method/ }))
      
      // Fill shipping details using role-based selectors
      const shippingCompanySelect = screen.getByRole('combobox', { name: /shipping company/i })
      const accountNumberInput = screen.getByRole('textbox', { name: /account number/i })
      
      await user.selectOptions(shippingCompanySelect, 'DHL')
      await user.type(accountNumberInput, '987654321')

      // Submit form
      await user.click(screen.getByRole('button', { name: 'Update' }))

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('companies')
        expect(mockSupabase.from).toHaveBeenCalledWith('company_ship_via')
        expect(toast.success).toHaveBeenCalledWith('Company updated successfully')
      })
    })
  })

  describe('My Company Shipping Integration', () => {
    it('should create my company with shipping information', async () => {
      render(<CompanyDialog {...mockMyCompanyProps} />)

      // Wait for dialog to be fully rendered
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Fill basic info using role-based selectors
      const companyNameInput = screen.getByRole('textbox', { name: /company name/i })
      const companyCodeInput = screen.getByRole('textbox', { name: /company code/i })
      
      await user.type(companyNameInput, 'My Test Company')
      await user.type(companyCodeInput, 'MTC001')

      // Navigate to shipping tab
      await user.click(screen.getByRole('tab', { name: 'Shipping' }))
      
      // Add shipping method
      await user.click(screen.getByRole('button', { name: /Add Shipping Method/ }))
      
      // Fill shipping details with custom company using role-based selectors
      const shippingCompanySelect = screen.getByRole('combobox', { name: /shipping company/i })
      await user.selectOptions(shippingCompanySelect, 'CUSTOM')
      
      const customCompanyInput = screen.getByRole('textbox', { name: /custom company name/i })
      const accountNumberInput = screen.getByRole('textbox', { name: /account number/i })
      
      await user.type(customCompanyInput, 'Local Courier')
      await user.type(accountNumberInput, 'LC-12345')

      // Submit form
      await user.click(screen.getByRole('button', { name: 'Create' }))

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('my_companies')
        expect(mockSupabase.from).toHaveBeenCalledWith('company_ship_via')
        expect(toast.success).toHaveBeenCalledWith('My Company created successfully')
      })
    })
  })

  describe('Form Validation Integration', () => {
    it('should show validation errors for required fields', async () => {
      render(<CompanyDialog {...mockExternalCompanyProps} />)

      // Wait for dialog to be rendered
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Try to submit without filling required fields
      await user.click(screen.getByRole('button', { name: 'Create' }))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Company name is required')
      })
    })

    it('should validate shipping account number when adding shipping method', async () => {
      render(<CompanyDialog {...mockExternalCompanyProps} />)

      // Wait for dialog to be rendered
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Fill basic info using role-based selectors
      const companyNameInput = screen.getByRole('textbox', { name: /company name/i })
      await user.type(companyNameInput, 'Test Company')

      // Navigate to shipping tab
      await user.click(screen.getByRole('tab', { name: 'Shipping' }))
      
      // Add shipping method without account number
      await user.click(screen.getByRole('button', { name: /Add Shipping Method/ }))
      
      const shippingCompanySelect = screen.getByRole('combobox', { name: /shipping company/i })
      await user.selectOptions(shippingCompanySelect, 'FEDEX')

      // Try to submit
      await user.click(screen.getByRole('button', { name: 'Create' }))

      // Should prevent submission due to validation
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      mockSupabase.from.mockImplementation(() => ({
        insert: jest.fn().mockResolvedValue({ 
          error: { message: 'Database connection failed' } 
        }),
      }) as any)

      render(<CompanyDialog {...mockExternalCompanyProps} />)

      // Wait for dialog to be rendered
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const companyNameInput = screen.getByRole('textbox', { name: /company name/i })
      await user.type(companyNameInput, 'Test Company')
      await user.click(screen.getByRole('button', { name: 'Create' }))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Database connection failed')
      })
    })

    it('should handle duplicate company name errors', async () => {
      // Mock unique constraint violation
      mockSupabase.from.mockImplementation(() => ({
        insert: jest.fn().mockResolvedValue({ 
          error: { code: '23505', message: 'Duplicate key value' } 
        }),
      }) as any)

      render(<CompanyDialog {...mockExternalCompanyProps} />)

      // Wait for dialog to be rendered
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const companyNameInput = screen.getByRole('textbox', { name: /company name/i })
      await user.type(companyNameInput, 'Existing Company')
      await user.click(screen.getByRole('button', { name: 'Create' }))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled()
      })
    })
  })

  describe('Tab Navigation Integration', () => {
    it('should navigate between tabs and maintain form state', async () => {
      render(<CompanyDialog {...mockExternalCompanyProps} />)

      // Wait for dialog to be rendered
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Fill basic info using role-based selectors
      const companyNameInput = screen.getByRole('textbox', { name: /company name/i })
      await user.type(companyNameInput, 'Tab Test Company')
      
      // Navigate to contacts tab
      await user.click(screen.getByRole('tab', { name: 'Contacts' }))
      expect(screen.getByText('Contacts')).toBeInTheDocument()
      
      // Navigate to addresses tab
      await user.click(screen.getByRole('tab', { name: 'Addresses' }))
      expect(screen.getByRole('button', { name: /Add Address/ })).toBeInTheDocument()
      
      // Navigate to shipping tab
      await user.click(screen.getByRole('tab', { name: 'Shipping' }))
      expect(screen.getByRole('button', { name: /Add Shipping Method/ })).toBeInTheDocument()
      
      // Go back to basic info - data should be preserved
      await user.click(screen.getByRole('tab', { name: 'Basic Info' }))
      
      // Check that the form value is preserved
      const preservedInput = screen.getByRole('textbox', { name: /company name/i })
      expect(preservedInput).toHaveValue('Tab Test Company')
    })
  })
})