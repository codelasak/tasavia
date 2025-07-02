import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NewPurchaseOrderPage from '../page';
import { supabase } from '@/lib/supabase/client';

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

const mockedSupabase = supabase as jest.Mocked<typeof supabase>;

const mockMyCompanies = [{ my_company_id: '1', my_company_name: 'My Test Company' }];
const mockExternalCompanies = [{ company_id: '2', company_name: 'Test Vendor' }];
const mockPartNumbers = [{ pn_id: '3', pn: 'PN-001', description: 'Test Part' }];
const mockShipVia = [{ ship_via_id: '4', company_id: '2', ship_company_name: 'Test Shipper', account_no: '123', owner: null, ship_model: null }];

describe('NewPurchaseOrderPage', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock Supabase data fetching
    mockedSupabase.from.mockImplementation((tableName: string) => {
      const createChainableSelectMock = (data: any) => ({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data, error: null }),
        }),
      });

      if (tableName === 'my_companies') {
        return createChainableSelectMock(mockMyCompanies) as any;
      }
      if (tableName === 'companies') {
        return createChainableSelectMock(mockExternalCompanies) as any;
      }
      if (tableName === 'pn_master_table') {
        return createChainableSelectMock(mockPartNumbers) as any;
      }
      if (tableName === 'company_ship_via') {
        return createChainableSelectMock(mockShipVia) as any;
      }

      // Default mock for other tables (e.g., insert)
      return {
        insert: jest.fn().mockResolvedValue({ data: [{}], error: null }),
        ...createChainableSelectMock([]),
      } as any;
    });
  });

  it('renders the form with initial data loaded', async () => {
    render(<NewPurchaseOrderPage />);

    // Wait for the loading state to resolve
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Create Purchase Order/i })).toBeInTheDocument();
    });

    // Check that key elements are present
    expect(screen.getByRole('combobox', { name: /My Company/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Vendor/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Item/i })).toBeInTheDocument();
  });

  it('allows adding and removing purchase order items', async () => {
    render(<NewPurchaseOrderPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Create Purchase Order/i })).toBeInTheDocument());

    // Initially, there is one item, but the remove button should not be visible as per logic (fields.length > 1)
    expect(screen.queryByRole('button', { name: /Remove Item/i })).not.toBeInTheDocument();

    // Add a second item
    fireEvent.click(screen.getByRole('button', { name: /Add Item/i }));

    // Now with two items, both should have a remove button.
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Remove Item/i })).toHaveLength(2);
    });

    // Remove one item
    fireEvent.click(screen.getAllByRole('button', { name: /Remove Item/i })[0]);

    // Now with one item left, the remove button should disappear again.
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Remove Item/i })).not.toBeInTheDocument();
    });
  });
});
