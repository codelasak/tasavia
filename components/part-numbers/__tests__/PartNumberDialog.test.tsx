'use client'

import React from 'react'
import { render, screen } from '@testing-library/react'
import { PartNumberDialog } from '../PartNumberDialog'

// Mock dependencies
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: null }),
      update: jest.fn().mockReturnValue({
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

describe('PartNumberDialog', () => {
  const mockProps = {
    open: true,
    onClose: jest.fn(),
    partNumber: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the dialog when open', () => {
    render(<PartNumberDialog {...mockProps} />)
    expect(screen.getByText('Add Part Number')).toBeInTheDocument()
  })

  it('renders form fields', () => {
    render(<PartNumberDialog {...mockProps} />)
    expect(screen.getByLabelText('Part Number *')).toBeInTheDocument()
    expect(screen.getByLabelText('Description *')).toBeInTheDocument()
    expect(screen.getByLabelText('Remarks')).toBeInTheDocument()
  })

  it('renders Create button for new part number', () => {
    render(<PartNumberDialog {...mockProps} />)
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
  })

  it('renders Update button for existing part number', () => {
    const existingPartNumber = {
      pn_id: '1',
      pn: 'TEST-001',
      description: 'Test Part',
      remarks: 'Test remarks',
    }
    render(<PartNumberDialog {...mockProps} partNumber={existingPartNumber} />)
    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<PartNumberDialog {...mockProps} open={false} />)
    expect(screen.queryByText('Add Part Number')).not.toBeInTheDocument()
  })
})
