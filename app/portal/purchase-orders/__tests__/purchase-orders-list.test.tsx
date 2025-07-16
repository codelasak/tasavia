import React from 'react'
import { render, screen, fireEvent, mockPurchaseOrders } from '../../../../__tests__/test-utils'
import PurchaseOrdersList from '../purchase-orders-list'

describe('PurchaseOrdersList', () => {
  it('renders the list of purchase orders', () => {
    render(<PurchaseOrdersList initialPurchaseOrders={mockPurchaseOrders} />, {
      initialPurchaseOrders: mockPurchaseOrders
    })

    expect(screen.getByText('PO-001')).toBeInTheDocument()
    expect(screen.getByText('PO-002')).toBeInTheDocument()
    expect(screen.getByText('Vendor A')).toBeInTheDocument()
    expect(screen.getByText('Vendor B')).toBeInTheDocument()
  })

  it('shows a message when no purchase orders are found', () => {
    render(<PurchaseOrdersList initialPurchaseOrders={[]} />, {
      initialPurchaseOrders: []
    })

    expect(screen.getByText('No purchase orders found')).toBeInTheDocument()
  })

  it('filters purchase orders by search term', () => {
    render(<PurchaseOrdersList initialPurchaseOrders={mockPurchaseOrders} />, {
      initialPurchaseOrders: mockPurchaseOrders
    })

    const searchInput = screen.getByPlaceholderText('Search PO number, companies...')
    fireEvent.change(searchInput, { target: { value: 'PO-001' } })

    expect(screen.getByText('PO-001')).toBeInTheDocument()
    expect(screen.queryByText('PO-002')).not.toBeInTheDocument()
  })

  it('filters purchase orders by status', async () => {
    render(<PurchaseOrdersList initialPurchaseOrders={mockPurchaseOrders} />, {
      initialPurchaseOrders: mockPurchaseOrders
    })

    // Click the select trigger to open the dropdown
    fireEvent.click(screen.getByRole('combobox'))

    // Click the 'Draft' option
    const draftOption = await screen.findByRole('option', { name: 'Draft' })
    fireEvent.click(draftOption)

    // Find the POs from our mock data
    const draftPO = mockPurchaseOrders.find(po => po.status === 'Draft')
    const sentPO = mockPurchaseOrders.find(po => po.status === 'Sent')

    // Assert that the draft PO is visible and the sent PO is not
    if (draftPO) {
      expect(screen.getByText(draftPO.po_number)).toBeInTheDocument()
    }
    if (sentPO) {
      expect(screen.queryByText(sentPO.po_number)).not.toBeInTheDocument()
    }
  })
})
