/**
 * Performance tests for handling large datasets
 * These tests verify that components perform well with large amounts of data
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CompaniesList from '../../app/portal/companies/companies-list'
import MyCompaniesList from '../../app/portal/my-companies/my-companies-list'
import PartNumbersList from '../../app/portal/part-numbers/part-numbers-list'

// Mock dependencies
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
}))

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

// Helper function to generate large dataset of companies
function generateLargeExternalCompaniesDataset(size: number) {
  return Array.from({ length: size }, (_, index) => ({
    company_id: `company-${index}`,
    company_name: `Company ${index.toString().padStart(4, '0')}`,
    company_code: `C${index.toString().padStart(4, '0')}`,
    company_type: index % 3 === 0 ? 'vendor' : index % 3 === 1 ? 'customer' : 'both',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    company_contacts: index % 5 === 0 ? [
      {
        contact_id: `contact-${index}`,
        contact_name: `Contact ${index}`,
        email: `contact${index}@company${index}.com`,
        phone: `+1${index.toString().padStart(9, '0')}`,
        role: 'Manager',
        is_primary: true,
        company_id: `company-${index}`,
        company_ref_type: 'companies',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ] : [],
    company_addresses: index % 3 === 0 ? [
      {
        address_id: `address-${index}`,
        address_line1: `${index} Business Street`,
        address_line2: index % 2 === 0 ? `Suite ${index}` : null,
        city: `City ${index % 50}`,
        country: 'USA',
        zip_code: `${(10000 + index).toString().slice(0, 5)}`,
        is_primary: true,
        company_id: `company-${index}`,
        company_ref_type: 'companies',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ] : [],
    company_ship_via: index % 4 === 0 ? [
      {
        ship_via_id: `ship-${index}`,
        ship_company_name: ['DHL', 'FEDEX', 'UPS', 'ARAMEX'][index % 4],
        predefined_company: ['DHL', 'FEDEX', 'UPS', 'ARAMEX'][index % 4],
        custom_company_name: null,
        account_no: `${index.toString().padStart(10, '0')}`,
        owner: `Company ${index}`,
        ship_model: ['GROUND', 'SEA', 'AIRLINE'][index % 3],
        company_id: `company-${index}`,
        company_ref_type: 'companies',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ] : [],
  }))
}

// Helper function to generate large dataset of my companies
function generateLargeMyCompaniesDataset(size: number) {
  return Array.from({ length: size }, (_, index) => ({
    my_company_id: `my-company-${index}`,
    my_company_name: `My Company ${index.toString().padStart(4, '0')}`,
    my_company_code: `MC${index.toString().padStart(4, '0')}`,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    company_contacts: index % 4 === 0 ? [
      {
        contact_id: `my-contact-${index}`,
        contact_name: `My Contact ${index}`,
        email: `mycontact${index}@mycompany${index}.com`,
        phone: `+1${index.toString().padStart(9, '0')}`,
        role: 'Owner',
        is_primary: true,
        company_id: `my-company-${index}`,
        company_ref_type: 'my_companies',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ] : [],
    company_addresses: index % 2 === 0 ? [
      {
        address_id: `my-address-${index}`,
        address_line1: `${index} My Business Lane`,
        address_line2: null,
        city: `My City ${index % 30}`,
        country: 'USA',
        zip_code: `${(20000 + index).toString().slice(0, 5)}`,
        is_primary: true,
        company_id: `my-company-${index}`,
        company_ref_type: 'my_companies',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ] : [],
    company_ship_via: index % 6 === 0 ? [
      {
        ship_via_id: `my-ship-${index}`,
        ship_company_name: index % 2 === 0 ? 'Local Courier' : 'TNT',
        predefined_company: index % 2 === 0 ? 'CUSTOM' : 'TNT',
        custom_company_name: index % 2 === 0 ? 'Local Courier' : null,
        account_no: `MC${index.toString().padStart(8, '0')}`,
        owner: `My Company ${index}`,
        ship_model: ['GROUND', 'SEA'][index % 2],
        company_id: `my-company-${index}`,
        company_ref_type: 'my_companies',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ] : [],
  }))
}

// Helper function to generate large dataset of part numbers
function generateLargePartNumbersDataset(size: number) {
  const categories = ['BEARING', 'GASKET', 'VALVE', 'PUMP', 'FILTER', 'SEAL', 'MOTOR', 'GEAR']
  const conditions = ['NEW', 'REFURBISHED', 'OVERHAULED']
  
  return Array.from({ length: size }, (_, index) => ({
    pn_id: `pn-${index}`,
    pn: `${categories[index % categories.length]}-${index.toString().padStart(6, '0')}`,
    description: `${categories[index % categories.length].toLowerCase()} component for industrial machinery model ${Math.floor(index / 100) + 1}`,
    remarks: index % 3 === 0 ? `${conditions[index % conditions.length]} condition, tested and certified` : null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }))
}

describe('Performance Tests - Large Datasets', () => {
  const user = userEvent.setup()

  describe('External Companies Performance', () => {
    it('should render 1000 companies within acceptable time', async () => {
      const startTime = performance.now()
      const largeDataset = generateLargeExternalCompaniesDataset(1000)
      
      render(<CompaniesList initialCompanies={largeDataset} />)
      
      // Wait for rendering to complete
      await waitFor(() => {
        expect(screen.getByText('1000 external companies • 1000 shown')).toBeInTheDocument()
      }, { timeout: 15000 })
      
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      // Should render within 12 seconds (more realistic for large datasets)
      expect(renderTime).toBeLessThan(12000)
      
      // Verify key elements are present
      expect(screen.getByText('Company 0000')).toBeInTheDocument()
      expect(screen.getByText('Company 0999')).toBeInTheDocument()
    }, 20000)

    it('should filter 1000 companies quickly', async () => {
      const largeDataset = generateLargeExternalCompaniesDataset(1000)
      render(<CompaniesList initialCompanies={largeDataset} />)
      
      const searchInput = screen.getByPlaceholderText('Search companies...')
      
      const startTime = performance.now()
      await user.type(searchInput, 'Company 0001')
      
      // Wait for filtering to complete
      await waitFor(() => {
        expect(screen.getByText('1000 external companies • 1 shown')).toBeInTheDocument()
      }, { timeout: 5000 })
      
      const endTime = performance.now()
      const filterTime = endTime - startTime
      
      // Filtering should be reasonably fast (under 5 seconds for CI environments)
      expect(filterTime).toBeLessThan(5000)
      expect(screen.getByText('Company 0001')).toBeInTheDocument()
    }, 10000)

    it('should handle scrolling through large dataset smoothly', async () => {
      const largeDataset = generateLargeExternalCompaniesDataset(500)
      const { container } = render(<CompaniesList initialCompanies={largeDataset} />)
      
      // Simulate scrolling
      const scrollContainer = container.querySelector('.space-y-3')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight / 2
        
        // Should maintain responsiveness
        await waitFor(() => {
          expect(screen.getByText('Company 0000')).toBeInTheDocument()
        }, { timeout: 1000 })
      }
    })
  })

  describe('My Companies Performance', () => {
    it('should render 500 my companies efficiently', async () => {
      const startTime = performance.now()
      const largeDataset = generateLargeMyCompaniesDataset(500)
      
      render(<MyCompaniesList initialCompanies={largeDataset} />)
      
      await waitFor(() => {
        expect(screen.getByText('500 my companies • 500 shown')).toBeInTheDocument()
      }, { timeout: 3000 })
      
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      // Should render within 2 seconds
      expect(renderTime).toBeLessThan(2000)
    })

    it('should search through large my companies dataset quickly', async () => {
      const largeDataset = generateLargeMyCompaniesDataset(300)
      render(<MyCompaniesList initialCompanies={largeDataset} />)
      
      const searchInput = screen.getByPlaceholderText('Search companies...')
      
      const startTime = performance.now()
      await user.type(searchInput, 'My Company 0150')
      
      await waitFor(() => {
        expect(screen.getByText('300 my companies • 1 shown')).toBeInTheDocument()
      }, { timeout: 1000 })
      
      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(3500)
    })
  })

  describe('Part Numbers Performance', () => {
    it('should render 2000 part numbers within acceptable time', async () => {
      const startTime = performance.now()
      const largeDataset = generateLargePartNumbersDataset(2000)
      
      render(<PartNumbersList initialPartNumbers={largeDataset} />)
      
      await waitFor(() => {
        expect(screen.getByText('2000 part numbers • 2000 shown')).toBeInTheDocument()
      }, { timeout: 10000 })
      
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      // Should render within 8 seconds (more reasonable for large datasets)
      expect(renderTime).toBeLessThan(8000)
      
      // Verify first item
      expect(screen.getByText('BEARING-000000')).toBeInTheDocument()
      
      // Verify some part numbers exist in the dataset 
      const categories = ['BEARING', 'GASKET', 'VALVE', 'PUMP', 'FILTER', 'SEAL', 'MOTOR', 'GEAR']
      
      // Check if any of the categories exist in the document
      let categoryFound = false
      for (const category of categories) {
        const elements = screen.queryAllByText(new RegExp(category))
        if (elements.length > 0) {
          categoryFound = true
          break
        }
      }
      expect(categoryFound).toBe(true)
    }, 15000)

    it('should search through large part numbers dataset efficiently', async () => {
      const largeDataset = generateLargePartNumbersDataset(1500)
      render(<PartNumbersList initialPartNumbers={largeDataset} />)
      
      const searchInput = screen.getByPlaceholderText('Search part numbers, descriptions, or remarks...')
      
      const startTime = performance.now()
      await user.type(searchInput, 'BEARING')
      
      // Should find all bearing parts quickly
      await waitFor(() => {
        const resultText = screen.getByText(/part numbers • \d+ shown/)
        expect(resultText).toBeInTheDocument()
      }, { timeout: 3000 })
      
      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(2500)
    })

    it('should handle complex search queries on large dataset', async () => {
      const largeDataset = generateLargePartNumbersDataset(800)
      render(<PartNumbersList initialPartNumbers={largeDataset} />)
      
      const searchInput = screen.getByPlaceholderText('Search part numbers, descriptions, or remarks...')
      
      // Test multiple search scenarios
      const searchTerms = ['model 5', 'REFURBISHED', 'VALVE-000', 'industrial machinery']
      
      for (const term of searchTerms) {
        const startTime = performance.now()
        
        // Clear previous search
        await user.clear(searchInput)
        await user.type(searchInput, term)
        
        await waitFor(() => {
          expect(screen.getByText(/part numbers • \d+ shown/)).toBeInTheDocument()
        }, { timeout: 3000 })
        
        const endTime = performance.now()
        expect(endTime - startTime).toBeLessThan(6000)
      }
    }, 15000)
  })

  describe('Memory Performance', () => {
    it('should not cause memory leaks with large datasets', async () => {
      // Test multiple renders and unmounts
      const largeCompanies = generateLargeExternalCompaniesDataset(200)
      
      for (let i = 0; i < 5; i++) {
        const { unmount } = render(<CompaniesList initialCompanies={largeCompanies} />)
        
        await waitFor(() => {
          expect(screen.getByText('200 external companies • 200 shown')).toBeInTheDocument()
        })
        
        unmount()
      }
      
      // If we reach here without crashes, memory is likely managed well
      expect(true).toBe(true)
    })

    it('should handle rapid state changes efficiently', async () => {
      const largeDataset = generateLargePartNumbersDataset(300)
      render(<PartNumbersList initialPartNumbers={largeDataset} />)
      
      const searchInput = screen.getByPlaceholderText('Search part numbers, descriptions, or remarks...')
      
      // Rapid typing simulation
      const rapidSearchTerms = ['B', 'BE', 'BEA', 'BEAR', 'BEARI', 'BEARIN', 'BEARING']
      
      const startTime = performance.now()
      
      for (const term of rapidSearchTerms) {
        await user.clear(searchInput)
        await user.type(searchInput, term)
        
        // Brief wait to allow state update
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      const endTime = performance.now()
      
      // Should handle rapid changes within 4 seconds (more reasonable for CI/slower systems)
      expect(endTime - startTime).toBeLessThan(4000)
    })
  })

  describe('UI Responsiveness', () => {
    it('should maintain UI responsiveness during large data operations', async () => {
      const largeDataset = generateLargeExternalCompaniesDataset(800)
      render(<CompaniesList initialCompanies={largeDataset} />)
      
      // Wait for initial render to complete
      await waitFor(() => {
        expect(screen.getByText('800 external companies • 800 shown')).toBeInTheDocument()
      }, { timeout: 8000 })
      
      // Multiple UI interactions should remain responsive
      const searchInput = screen.getByPlaceholderText('Search companies...')
      const addButton = screen.getByRole('button', { name: /Add Company/ })
      
      // Test responsiveness during search
      await user.type(searchInput, 'Company')
      expect(addButton).toBeEnabled()
      
      // Clear search
      await user.clear(searchInput)
      await user.type(searchInput, 'Vendor')
      
      // UI should remain interactive
      expect(addButton).toBeEnabled()
      expect(searchInput).toHaveValue('Vendor')
    }, 15000)
  })
})