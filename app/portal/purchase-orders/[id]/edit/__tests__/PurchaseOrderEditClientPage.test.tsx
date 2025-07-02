import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PurchaseOrderEditClientPage from '../PurchaseOrderEditClientPage';
import { supabase as supabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
  }),
}));
jest.mock('@/lib/supabase/client');

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock Data
const mockPoId = '12345';
const mockMyCompanies = [{ my_company_id: '1', my_company_name: 'My Test Company', my_company_code: 'MTC' }];
const mockExternalCompanies = [{ company_id: '2', company_name: 'Test Vendor', company_code: 'TV' }];
const mockPartNumbers = [{ pn_id: '3', pn: 'PN-001', description: 'Test Part' }];
const mockShipVia = [{ ship_via_id: '4', company_id: '2', ship_company_name: 'Test Shipper', account_no: '123', owner: null, ship_model: null }];
const mockPoItems = [
  {
    po_item_id: 'item-1',
    po_id: mockPoId,
    pn_id: '3',
    description: 'Test Part',
    quantity: 10,
    unit_price: 100,
    condition: 'New',
    sn: '',
  },
];
const mockPurchaseOrder = {
  po_id: mockPoId,
  my_company_id: '1',
  vendor_company_id: '2',
  po_date: '2023-10-27',
  prepared_by_name: 'Test User',
  currency: 'USD',
  status: 'Draft',
};

// Persistent Mocks for Supabase final actions
const mockUpdateEq = jest.fn();
const mockDeleteEq = jest.fn();

describe('PurchaseOrderEditClientPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateEq.mockResolvedValue({ error: null });
    mockDeleteEq.mockResolvedValue({ error: null });

    (supabaseClient.from as jest.Mock).mockImplementation((tableName: string) => {
      switch (tableName) {
        case 'purchase_orders':
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockPurchaseOrder, error: null }),
              }),
            }),
            update: jest.fn().mockReturnValue({ eq: mockUpdateEq }),
          };
        case 'po_items':
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: mockPoItems, error: null }),
              }),
            }),
            delete: jest.fn().mockReturnValue({ eq: mockDeleteEq }),
            insert: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        case 'my_companies':
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: mockMyCompanies, error: null }),
            }),
          };
        case 'companies':
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: mockExternalCompanies, error: null }),
            }),
          };
        case 'pn_master_table':
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: mockPartNumbers, error: null }),
            }),
          };
        case 'company_ship_via':
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: mockShipVia, error: null }),
            }),
          };
        case 'company_addresses':
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        case 'company_contacts':
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        default:
          throw new Error(`Unexpected table name in mock: ${tableName}`);
      }
    });
  });

  it('renders the form and loads initial data', async () => {
    render(<PurchaseOrderEditClientPage poId={mockPoId} />);

    // Wait for all initial data to be loaded and rendered
    expect(await screen.findByDisplayValue(/Test User/i)).toBeInTheDocument();
    const lineItem = await screen.findByTestId('line-item-0');
    expect(await within(lineItem).findByLabelText(/Quantity/i)).toHaveValue(10);
    expect(await within(lineItem).findByLabelText(/Unit Price/i)).toHaveValue(100);

    const myCompanySelect = screen.getByRole('combobox', { name: /My Company/i });
    expect(await within(myCompanySelect).findByText(/MTC - My Test Company/i)).toBeInTheDocument();

    const vendorSelect = screen.getByRole('combobox', { name: /Vendor/i });
    expect(await within(vendorSelect).findByText(/TV - Test Vendor/i)).toBeInTheDocument();
  });

  it('has an update button that is clickable', async () => {
    render(<PurchaseOrderEditClientPage poId={mockPoId} />);

    // Wait for the form to be fully loaded
    await waitFor(() => {
      expect(screen.getByDisplayValue(/Test User/i)).toBeInTheDocument();
    });

    // Find the update button and verify it exists and is enabled
    const updateButton = screen.getByRole('button', { name: /Update Purchase Order/i });
    expect(updateButton).toBeInTheDocument();
    expect(updateButton).toBeEnabled();
  });
});
