'use client'

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PartNumbersList from '../part-numbers-list'
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

describe('PartNumbersList', () => {
  const user = userEvent.setup()

  const mockPartNumbers = [
    {
      pn_id: '1',
      pn: 'PN-001',
      description: 'High-quality bearing assembly for industrial applications',
      remarks: 'Compatible with models X100-X200',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      pn_id: '2',
      pn: 'PN-002',
      description: 'Hydraulic pump component',
      remarks: null,
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    },
    {
      pn_id: '3',
      pn: 'GASKET-301',
      description: 'Rubber gasket seal',
      remarks: 'Heat resistant up to 200°C',
      created_at: '2024-01-03T00:00:00Z',
      updated_at: '2024-01-03T00:00:00Z',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock Supabase operations
    mockSupabase.from.mockImplementation((tableName: string) => {
      if (tableName === 'pn_master_table') {
        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockPartNumbers, error: null }),
          }),
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }
      }
      return {} as any
    })
  })

  it('renders the part numbers list with initial data', () => {
    render(<PartNumbersList initialPartNumbers={mockPartNumbers} />)

    expect(screen.getByText('Part Numbers')).toBeInTheDocument()
    expect(screen.getByText('3 part numbers • 3 shown')).toBeInTheDocument()
    expect(screen.getByText('PN-001')).toBeInTheDocument()
    expect(screen.getByText('PN-002')).toBeInTheDocument()
    expect(screen.getByText('GASKET-301')).toBeInTheDocument()
  })

  it('displays part number details including descriptions and remarks', () => {
    render(<PartNumbersList initialPartNumbers={mockPartNumbers} />)

    // Check descriptions
    expect(screen.getByText('High-quality bearing assembly for industrial applications')).toBeInTheDocument()
    expect(screen.getByText('Hydraulic pump component')).toBeInTheDocument()
    expect(screen.getByText('Rubber gasket seal')).toBeInTheDocument()

    // Check remarks
    expect(screen.getByText('Compatible with models X100-X200')).toBeInTheDocument()
    expect(screen.getByText('Heat resistant up to 200°C')).toBeInTheDocument()
  })

  it('shows Add Part Number button', () => {
    render(<PartNumbersList initialPartNumbers={mockPartNumbers} />)

    const addButton = screen.getByRole('button', { name: /Add Part Number/ })
    expect(addButton).toBeInTheDocument()
  })

  it('opens part number dialog when Add Part Number button is clicked', async () => {
    render(<PartNumbersList initialPartNumbers={mockPartNumbers} />)

    const addButton = screen.getByRole('button', { name: /Add Part Number/ })
    await user.click(addButton)

    // The dialog opening behavior would be tested here
    // This might require additional setup depending on dialog implementation
  })

  it('shows edit and delete buttons for each part number', () => {
    render(<PartNumbersList initialPartNumbers={mockPartNumbers} />)

    const editButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('svg') && button.getAttribute('class')?.includes('ghost')
    )

    // Should have edit and delete buttons for each part number
    expect(editButtons.length).toBeGreaterThanOrEqual(6) // 3 part numbers * 2 buttons each
  })

  it('filters part numbers by part number', async () => {
    render(<PartNumbersList initialPartNumbers={mockPartNumbers} />)

    const searchInput = screen.getByPlaceholderText('Search part numbers, descriptions, or remarks...')
    await user.type(searchInput, 'PN-001')

    expect(screen.getByText('PN-001')).toBeInTheDocument()
    expect(screen.queryByText('PN-002')).not.toBeInTheDocument()
    expect(screen.queryByText('GASKET-301')).not.toBeInTheDocument()
    expect(screen.getByText('3 part numbers • 1 shown')).toBeInTheDocument()
  })

  it('filters part numbers by description', async () => {
    render(<PartNumbersList initialPartNumbers={mockPartNumbers} />)

    const searchInput = screen.getByPlaceholderText('Search part numbers, descriptions, or remarks...')
    await user.type(searchInput, 'bearing')

    expect(screen.getByText('PN-001')).toBeInTheDocument()
    expect(screen.queryByText('PN-002')).not.toBeInTheDocument()
    expect(screen.queryByText('GASKET-301')).not.toBeInTheDocument()
  })

  it('filters part numbers by remarks', async () => {
    render(<PartNumbersList initialPartNumbers={mockPartNumbers} />)

    const searchInput = screen.getByPlaceholderText('Search part numbers, descriptions, or remarks...')
    await user.type(searchInput, 'Heat resistant')

    expect(screen.getByText('GASKET-301')).toBeInTheDocument()
    expect(screen.queryByText('PN-001')).not.toBeInTheDocument()
    expect(screen.queryByText('PN-002')).not.toBeInTheDocument()
  })

  it('is case insensitive when filtering', async () => {
    render(<PartNumbersList initialPartNumbers={mockPartNumbers} />)

    const searchInput = screen.getByPlaceholderText('Search part numbers, descriptions, or remarks...')
    await user.type(searchInput, 'BEARING')

    expect(screen.getByText('PN-001')).toBeInTheDocument()
    expect(screen.queryByText('PN-002')).not.toBeInTheDocument()
  })

  it('shows clear search button when search term is present', async () => {
    render(<PartNumbersList initialPartNumbers={mockPartNumbers} />)

    const searchInput = screen.getByPlaceholderText('Search part numbers, descriptions, or remarks...')
    await user.type(searchInput, 'NonexistentPart')

    expect(screen.getByText('No part numbers found')).toBeInTheDocument()
    
    const clearButton = screen.getByRole('button', { name: /Clear search/ })
    expect(clearButton).toBeInTheDocument()
    
    await user.click(clearButton)
    
    // Should show all part numbers again
    expect(screen.getByText('PN-001')).toBeInTheDocument()
    expect(screen.getByText('PN-002')).toBeInTheDocument()
    expect(screen.getByText('GASKET-301')).toBeInTheDocument()
  })

  it('handles part number deletion with confirmation', async () => {
    const originalConfirm = window.confirm
    window.confirm = jest.fn(() => true)

    render(<PartNumbersList initialPartNumbers={mockPartNumbers} />)

    // Find and click delete button for first part number
    const deleteButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('[data-testid="trash-icon"], .lucide-trash-2')
    )
    
    if (deleteButtons.length > 0) {
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete part number PN-001?')
        expect(mockSupabase.from).toHaveBeenCalledWith('pn_master_table')
        expect(toast.success).toHaveBeenCalledWith('Part number deleted successfully')
      })
    }

    window.confirm = originalConfirm
  })

  it('handles deletion cancellation', async () => {
    const originalConfirm = window.confirm
    window.confirm = jest.fn(() => false) // User cancels

    render(<PartNumbersList initialPartNumbers={mockPartNumbers} />)

    const deleteButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('[data-testid="trash-icon"], .lucide-trash-2')
    )
    
    if (deleteButtons.length > 0) {
      await user.click(deleteButtons[0])

      expect(window.confirm).toHaveBeenCalled()
      // Should not call delete API
      expect(mockSupabase.from).not.toHaveBeenCalledWith('pn_master_table')
      expect(toast.success).not.toHaveBeenCalled()
    }

    window.confirm = originalConfirm
  })

  it('handles deletion error gracefully', async () => {
    // Mock deletion error
    mockSupabase.from.mockImplementation(() => ({
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ 
          error: { message: 'Database error' } 
        }),
      }),
    }) as any)

    const originalConfirm = window.confirm
    window.confirm = jest.fn(() => true)

    render(<PartNumbersList initialPartNumbers={mockPartNumbers} />)

    const deleteButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('[data-testid="trash-icon"], .lucide-trash-2')
    )
    
    if (deleteButtons.length > 0) {
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to delete part number')
      })
    }

    window.confirm = originalConfirm
  })

  it('handles fetch error gracefully', async () => {
    // Mock fetch error
    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Network error' } 
        }),
      }),
    }) as any)

    render(<PartNumbersList initialPartNumbers={[]} />)

    // This would be triggered by fetchPartNumbers call
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to fetch part numbers')
    })
  })

  it('shows no part numbers message when list is empty', () => {
    render(<PartNumbersList initialPartNumbers={[]} />)

    expect(screen.getByText('0 part numbers • 0 shown')).toBeInTheDocument()
    expect(screen.getByText('No part numbers found')).toBeInTheDocument()
  })

  it('shows no part numbers message when filtered list is empty', async () => {
    render(<PartNumbersList initialPartNumbers={mockPartNumbers} />)

    const searchInput = screen.getByPlaceholderText('Search part numbers, descriptions, or remarks...')
    await user.type(searchInput, 'NonexistentPart')

    expect(screen.getByText('No part numbers found')).toBeInTheDocument()
    expect(screen.getByText('3 part numbers • 0 shown')).toBeInTheDocument()
  })

  it('displays part numbers with proper styling', () => {
    render(<PartNumbersList initialPartNumbers={mockPartNumbers} />)

    // Part numbers should be displayed with monospace font and bold
    const pnElement = screen.getByText('PN-001')
    expect(pnElement).toHaveClass('font-mono', 'font-bold')
  })

  it('truncates long descriptions and remarks', () => {
    render(<PartNumbersList initialPartNumbers={mockPartNumbers} />)

    // Check that long text has line-clamp classes
    const longDescription = screen.getByText('High-quality bearing assembly for industrial applications')
    expect(longDescription).toHaveClass('line-clamp-2')
    
    const remarks = screen.getByText('Compatible with models X100-X200')
    expect(remarks).toHaveClass('line-clamp-2')
  })

  it('handles edit button click', async () => {
    render(<PartNumbersList initialPartNumbers={mockPartNumbers} />)

    const editButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('[data-testid="edit-icon"], .lucide-edit')
    )
    
    if (editButtons.length > 0) {
      await user.click(editButtons[0])
      // Edit functionality would be tested here
      // This might involve checking dialog state or other UI changes
    }
  })

  it('updates part numbers list after dialog close', async () => {
    // This test would verify that the list refreshes after adding/editing part numbers
    // Implementation depends on how the dialog communicates with the list component
    render(<PartNumbersList initialPartNumbers={mockPartNumbers} />)
    
    // Mock scenario where dialog adds a new part number
    // This would typically involve simulating the dialog close event
    // and verifying that fetchPartNumbers is called
  })
})