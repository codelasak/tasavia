import React from 'react';
import { render, screen } from '@testing-library/react';
import { PartNumberDialog } from '../part-numbers/PartNumberDialog';

// Mock the useToast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock the supabase client
jest.mock('@/lib/supabase/client');

describe('PartNumberDialog', () => {
  it('renders the add dialog when open', () => {
    render(<PartNumberDialog open={true} onClose={() => {}} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Add Part Number/i })).toBeInTheDocument();
  });

  it('renders the edit dialog when open', () => {
    const partNumber = {
      pn_id: '123',
      pn: 'TEST-PN',
      description: 'A test part number',
      remarks: 'Some remarks',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'test-user',
      updated_by: 'test-user',
    };
    render(<PartNumberDialog open={true} onClose={() => {}} partNumber={partNumber} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Edit Part Number/i })).toBeInTheDocument();
  });

  it('does not render the dialog when closed', () => {
    render(<PartNumberDialog open={false} onClose={() => {}} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
