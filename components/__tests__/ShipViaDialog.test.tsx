import React from 'react';
import { render, screen } from '@testing-library/react';
import { ShipViaDialog } from '../ship-via/ShipViaDialog';

// Mock the useToast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock the supabase client
jest.mock('@/lib/supabase/client');

describe('ShipViaDialog', () => {
  it('renders the add dialog when open', () => {
    render(<ShipViaDialog open={true} onClose={() => {}} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Add Ship Via Company/i })).toBeInTheDocument();
  });

  it('renders the edit dialog when open', () => {
    const shipVia = {
      ship_via_id: '456',
      ship_company_name: 'FedEx',
      account_no: '123456789',
      owner: 'Test User',
      ship_model: 'Express',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'test-user',
      updated_by: 'test-user',
    };
    render(<ShipViaDialog open={true} onClose={() => {}} shipVia={shipVia} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Edit Ship Via Company/i })).toBeInTheDocument();
  });

  it('does not render the dialog when closed', () => {
    render(<ShipViaDialog open={false} onClose={() => {}} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
