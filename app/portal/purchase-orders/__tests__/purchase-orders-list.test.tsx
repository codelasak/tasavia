import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PurchaseOrdersList from '../purchase-orders-list';

// Mock next/link
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
  MockLink.displayName = 'MockLink';
  return MockLink;
});

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ...jest.requireActual('lucide-react'),
  Search: () => <svg data-testid="search-icon" />,
  Eye: () => <svg data-testid="eye-icon" />,
  Edit: () => <svg data-testid="edit-icon" />,
  FileText: () => <svg data-testid="file-text-icon" />,
}));

const mockPurchaseOrders = [
  {
    po_id: '1',
    po_number: 'PO-001',
    po_date: new Date().toISOString(),
    status: 'Draft',
    total_amount: 1000,
    my_companies: { my_company_name: 'My Company', my_company_code: 'MC-01' },
    companies: { company_name: 'Vendor A', company_code: 'V-A' },
    created_at: new Date().toISOString(),
  },
  {
    po_id: '2',
    po_number: 'PO-002',
    po_date: new Date().toISOString(),
    status: 'Sent',
    total_amount: 2500,
    my_companies: { my_company_name: 'My Company', my_company_code: 'MC-01' },
    companies: { company_name: 'Vendor B', company_code: 'V-B' },
    created_at: new Date().toISOString(),
  },
];

describe('PurchaseOrdersList', () => {
  it('renders the list of purchase orders', () => {
    render(<PurchaseOrdersList initialPurchaseOrders={mockPurchaseOrders} />);

    expect(screen.getByText('PO-001')).toBeInTheDocument();
    expect(screen.getByText('PO-002')).toBeInTheDocument();
    expect(screen.getByText('Vendor A')).toBeInTheDocument();
    expect(screen.getByText('Vendor B')).toBeInTheDocument();
  });

  it('shows a message when no purchase orders are found', () => {
    render(<PurchaseOrdersList initialPurchaseOrders={[]} />);

    expect(screen.getByText('No purchase orders found')).toBeInTheDocument();
  });

  it('filters purchase orders by search term', () => {
    render(<PurchaseOrdersList initialPurchaseOrders={mockPurchaseOrders} />);

    const searchInput = screen.getByPlaceholderText('Search PO number, companies...');
    fireEvent.change(searchInput, { target: { value: 'PO-001' } });

    expect(screen.getByText('PO-001')).toBeInTheDocument();
    expect(screen.queryByText('PO-002')).not.toBeInTheDocument();
  });

  it('filters purchase orders by status', async () => {
    render(<PurchaseOrdersList initialPurchaseOrders={mockPurchaseOrders} />);

    // Click the select trigger to open the dropdown
    fireEvent.click(screen.getByRole('combobox'));

    // Click the 'Draft' option
    const draftOption = await screen.findByRole('option', { name: 'Draft' });
    fireEvent.click(draftOption);

    // Find the POs from our mock data
    const draftPO = mockPurchaseOrders.find(po => po.status === 'Draft');
    const sentPO = mockPurchaseOrders.find(po => po.status === 'Sent');

    // Assert that the draft PO is visible and the sent PO is not
    if (draftPO) {
      expect(screen.getByText(draftPO.po_number)).toBeInTheDocument();
    }
    if (sentPO) {
      expect(screen.queryByText(sentPO.po_number)).not.toBeInTheDocument();
    }
  });
});
