import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import POCompletionModal from '../POCompletionModal';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

// Mock dependencies
jest.mock('@/lib/supabase/client');
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('POCompletionModal', () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    poId: 'test-po-id',
    poNumber: 'PO-001',
    currentStatus: 'Draft',
  };

  const mockPOItems = [
    {
      quantity: 5,
      unit_price: 100.50,
      condition: 'NEW',
      description: 'Test Item 1',
      pn_master_table: {
        pn: 'PN-001',
        description: 'Test Part 1',
      },
    },
    {
      quantity: 2,
      unit_price: 250.00,
      condition: 'AR',
      description: 'Test Item 2',
      pn_master_table: {
        pn: 'PN-002',
        description: 'Test Part 2',
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Supabase responses
    mockSupabase.from.mockImplementation((tableName: string) => {
      if (tableName === 'po_items') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ 
              data: mockPOItems, 
              error: null 
            }),
          }),
        };
      }
      if (tableName === 'inventory') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ 
                data: [], 
                error: null 
              }),
            }),
          }),
        };
      }
      return {} as any;
    });
  });

  it('renders the modal when open', async () => {
    render(<POCompletionModal {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Complete Purchase Order/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Marking this purchase order as completed will automatically create inventory items/)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<POCompletionModal {...mockProps} isOpen={false} />);

    expect(screen.queryByText('Complete Purchase Order PO-001?')).not.toBeInTheDocument();
  });

  it('loads and displays PO items preview', async () => {
    render(<POCompletionModal {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Items to be added to inventory:')).toBeInTheDocument();
    });

    // Check that items are displayed
    expect(screen.getByText('PN-001')).toBeInTheDocument();
    expect(screen.getByText('PN-002')).toBeInTheDocument();
    expect(screen.getByText('Test Item 1')).toBeInTheDocument();
    expect(screen.getByText('Test Item 2')).toBeInTheDocument();
    expect(screen.getByText('Qty: 5')).toBeInTheDocument();
    expect(screen.getByText('Qty: 2')).toBeInTheDocument();
    expect(screen.getByText('Unit: $100.50')).toBeInTheDocument();
    expect(screen.getByText('Unit: $250.00')).toBeInTheDocument();
  });

  it('shows loading state while fetching preview', () => {
    // Mock a delayed response
    mockSupabase.from.mockImplementation((tableName: string) => {
      if (tableName === 'po_items') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockImplementation(
              () => new Promise(resolve => setTimeout(() => resolve({ data: mockPOItems, error: null }), 1000))
            ),
          }),
        };
      }
      if (tableName === 'inventory') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ 
                data: [], 
                error: null 
              }),
            }),
          }),
        };
      }
      return {} as any;
    });

    render(<POCompletionModal {...mockProps} />);

    expect(screen.getByText('Loading items preview...')).toBeInTheDocument();
  });

  it('displays condition badges for items', async () => {
    render(<POCompletionModal {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('NEW')).toBeInTheDocument();
      expect(screen.getByText('AR')).toBeInTheDocument();
    });
  });

  it('shows warning when inventory already exists', async () => {
    // Mock existing inventory
    mockSupabase.from.mockImplementation((tableName: string) => {
      if (tableName === 'po_items') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: mockPOItems, error: null }),
          }),
        };
      }
      if (tableName === 'inventory') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ 
                data: [{ inventory_id: '1' }], // Existing inventory
                error: null 
              }),
            }),
          }),
        };
      }
      return {} as any;
    });

    render(<POCompletionModal {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Inventory items already exist for this PO')).toBeInTheDocument();
      expect(screen.getByText('This purchase order has already been processed and inventory items have been created.')).toBeInTheDocument();
    });
  });

  it('calls onConfirm when Complete button is clicked', async () => {
    render(<POCompletionModal {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Items to be added to inventory:')).toBeInTheDocument();
    });

    const completeButton = screen.getByRole('button', { name: /Complete.*Create.*Inventory/i });
    fireEvent.click(completeButton);

    expect(mockProps.onConfirm).toHaveBeenCalled();
  });

  it('calls onClose when Cancel button is clicked', async () => {
    render(<POCompletionModal {...mockProps} />);

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('handles error when fetching PO items fails', async () => {
    mockSupabase.from.mockImplementation((tableName: string) => {
      if (tableName === 'po_items') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ 
              data: null, 
              error: { message: 'Database error' } 
            }),
          }),
        };
      }
      if (tableName === 'inventory') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ 
                data: [], 
                error: null 
              }),
            }),
          }),
        };
      }
      return {} as any;
    });

    render(<POCompletionModal {...mockProps} />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to load PO items preview');
    });
  });

  it('displays line totals correctly', async () => {
    render(<POCompletionModal {...mockProps} />);

    await waitFor(() => {
      // Item 1: 5 * $100.50 = $502.50
      expect(screen.getByText('$502.50')).toBeInTheDocument();
      // Item 2: 2 * $250.00 = $500.00
      expect(screen.getByText('$500.00')).toBeInTheDocument();
    });
  });

  it('handles items with null pn_master_table', async () => {
    const itemsWithNullPN = [
      {
        quantity: 1,
        unit_price: 50.00,
        condition: 'NEW',
        description: 'Item without PN',
        pn_master_table: null,
      },
    ];

    mockSupabase.from.mockImplementation((tableName: string) => {
      if (tableName === 'po_items') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ 
              data: itemsWithNullPN, 
              error: null 
            }),
          }),
        };
      }
      return {} as any;
    });

    render(<POCompletionModal {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('N/A')).toBeInTheDocument(); // Should show N/A for missing PN
      expect(screen.getByText('Item without PN')).toBeInTheDocument();
    });
  });
});