import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { InventoryDialog } from '../inventory/InventoryDialog';
import { supabase } from '@/lib/supabase/client';

// Mock the useToast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock the supabase client
jest.mock('@/lib/supabase/client');

const mockedSupabase = supabase as jest.Mocked<typeof supabase>;

describe('InventoryDialog', () => {
  beforeEach(() => {
    // Provide a default mock implementation for the part number fetch
    mockedSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: [{ pn_id: '1', pn: 'PN-001', description: 'Test Part' }], error: null })
      })
    } as any);
  });

    it('renders the add dialog when open', async () => {
    render(<InventoryDialog open={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: /Add Inventory Item/i })).toBeInTheDocument();
  });

    it('renders the edit dialog when open', async () => {
    const item = {
      inventory_id: 'inv-1',
      pn_id: '1',
      serial_number: 'SN123',
      condition: 'AR',
      location: 'A1',
      quantity: 10,
      unit_cost: 100,
      notes: 'Test note',
    };
    render(<InventoryDialog open={true} onClose={() => {}} item={item} />);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: /Edit Inventory Item/i })).toBeInTheDocument();
  });

  it('does not render the dialog when closed', () => {
    render(<InventoryDialog open={false} onClose={() => {}} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
