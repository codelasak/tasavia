-- Create PO sequence tracking table for year-based sequential PO numbers
-- This enables PO-25XXXX format where 25=year(2025) and XXXX=sequential counter

CREATE TABLE IF NOT EXISTS public.po_sequence (
    year INTEGER PRIMARY KEY,
    next_sequence_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.po_sequence ENABLE ROW LEVEL SECURITY;

-- Create policies - all authenticated users can read/write po_sequence
-- Since PO numbers are global identifiers, they don't need user-specific restrictions
CREATE POLICY "Enable read access for authenticated users on po_sequence" 
    ON public.po_sequence 
    FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Enable insert for authenticated users on po_sequence" 
    ON public.po_sequence 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users on po_sequence" 
    ON public.po_sequence 
    FOR UPDATE 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- Insert initial record for current year (2025)
INSERT INTO public.po_sequence (year, next_sequence_number) 
VALUES (2025, 1) 
ON CONFLICT (year) DO NOTHING;

-- Drop existing function if it exists (to handle return type changes)
DROP FUNCTION IF EXISTS public.generate_po_number();

-- Function to generate next PO number with atomic increment
CREATE FUNCTION public.generate_po_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_year INTEGER;
    year_suffix TEXT;
    sequence_num INTEGER;
    po_number TEXT;
BEGIN
    -- Get current year
    current_year := EXTRACT(YEAR FROM NOW());
    
    -- Get last 2 digits of year for suffix (e.g., 2025 -> 25)
    year_suffix := LPAD((current_year % 100)::TEXT, 2, '0');
    
    -- Atomically increment and get next sequence number for the year
    INSERT INTO public.po_sequence (year, next_sequence_number) 
    VALUES (current_year, 2)
    ON CONFLICT (year) 
    DO UPDATE SET 
        next_sequence_number = po_sequence.next_sequence_number + 1,
        updated_at = NOW()
    RETURNING next_sequence_number - 1 INTO sequence_num;
    
    -- Format PO number as PO-{YY}{XXXX} where YY=year suffix, XXXX=sequence (zero-padded)
    po_number := 'PO-' || year_suffix || LPAD(sequence_num::TEXT, 4, '0');
    
    RETURN po_number;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.generate_po_number() TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE public.po_sequence IS 'Tracks sequential PO numbers per year for generating PO-YYXXXX format';
COMMENT ON FUNCTION public.generate_po_number() IS 'Generates next sequential PO number in format PO-YYXXXX where YY=year suffix and XXXX=4-digit sequence';