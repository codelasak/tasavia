-- Fix PO Number Generation Root Cause
-- This migration ensures the po_number field is properly auto-generated

-- First, ensure the sequence exists
CREATE SEQUENCE IF NOT EXISTS po_number_seq START 1;

-- Create or replace the PO number generation function
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS text AS $$
DECLARE
    current_year text;
    next_val integer;
    po_num text;
BEGIN
    current_year := to_char(now(), 'YY');
    next_val := nextval('po_number_seq');
    po_num := 'P' || current_year || lpad(next_val::text, 3, '0');
    
    -- Check if PO number already exists, if so increment
    WHILE EXISTS (SELECT 1 FROM purchase_orders WHERE po_number = po_num) LOOP
        next_val := nextval('po_number_seq');
        po_num := 'P' || current_year || lpad(next_val::text, 3, '0');
    END LOOP;
    
    RETURN po_num;
END;
$$ LANGUAGE plpgsql;

-- Remove the existing default constraint and add the correct one
ALTER TABLE purchase_orders ALTER COLUMN po_number DROP DEFAULT;
ALTER TABLE purchase_orders ALTER COLUMN po_number SET DEFAULT generate_po_number();

-- Ensure the column is properly configured
ALTER TABLE purchase_orders ALTER COLUMN po_number SET NOT NULL;

-- Test the function works
DO $$
DECLARE
    test_po_number text;
BEGIN
    test_po_number := generate_po_number();
    RAISE NOTICE 'Generated test PO number: %', test_po_number;
END $$;