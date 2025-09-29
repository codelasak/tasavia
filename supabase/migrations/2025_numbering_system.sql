-- 2025 Special Numbering System Implementation
-- Creates special functions for 2025 that start from 25300 with no gaps

-- Function to generate PO numbers starting from P25300 for 2025
CREATE OR REPLACE FUNCTION generate_po_number_2025()
RETURNS TEXT AS $$
DECLARE
    last_number TEXT;
    next_number INTEGER;
    year_prefix TEXT := 'P25';
BEGIN
    -- Find the highest existing PO number for 2025
    SELECT po_number INTO last_number
    FROM purchase_orders
    WHERE po_number LIKE 'P25%'
    ORDER BY po_number DESC
    LIMIT 1;

    IF last_number IS NULL THEN
        -- No existing PO numbers for 2025, start from 300
        next_number := 300;
    ELSE
        -- Extract the numeric part and increment by 1
        BEGIN
            next_number := CAST(SUBSTRING(last_number FROM 2) AS INTEGER) + 1;
        EXCEPTION WHEN OTHERS THEN
            -- If conversion fails, start from 300
            next_number := 300;
        END;
    END IF;

    RETURN year_prefix || next_number::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to generate Repair Order numbers starting from R25300 for 2025
CREATE OR REPLACE FUNCTION generate_repair_order_number_2025()
RETURNS TEXT AS $$
DECLARE
    last_number TEXT;
    next_number INTEGER;
    year_prefix TEXT := 'R25';
BEGIN
    -- Find the highest existing RO number for 2025
    SELECT repair_order_number INTO last_number
    FROM repair_orders
    WHERE repair_order_number LIKE 'R25%'
    ORDER BY repair_order_number DESC
    LIMIT 1;

    IF last_number IS NULL THEN
        -- No existing RO numbers for 2025, start from 300
        next_number := 300;
    ELSE
        -- Extract the numeric part and increment by 1
        BEGIN
            next_number := CAST(SUBSTRING(last_number FROM 2) AS INTEGER) + 1;
        EXCEPTION WHEN OTHERS THEN
            -- If conversion fails, start from 300
            next_number := 300;
        END;
    END IF;

    RETURN year_prefix || next_number::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to generate Invoice numbers starting from T25300 for 2025
CREATE OR REPLACE FUNCTION generate_invoice_number_2025()
RETURNS TEXT AS $$
DECLARE
    last_number TEXT;
    next_number INTEGER;
    year_prefix TEXT := 'T25';
BEGIN
    -- Find the highest existing invoice number for 2025
    SELECT invoice_number INTO last_number
    FROM sales_orders
    WHERE invoice_number LIKE 'T25%'
    ORDER BY invoice_number DESC
    LIMIT 1;

    IF last_number IS NULL THEN
        -- No existing invoice numbers for 2025, start from 300
        next_number := 300;
    ELSE
        -- Extract the numeric part and increment by 1
        BEGIN
            next_number := CAST(SUBSTRING(last_number FROM 2) AS INTEGER) + 1;
        EXCEPTION WHEN OTHERS THEN
            -- If conversion fails, start from 300
            next_number := 300;
        END;
    END IF;

    RETURN year_prefix || next_number::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Update purchase_orders table to use the new function for 2025
ALTER TABLE purchase_orders
ALTER COLUMN po_number SET DEFAULT generate_po_number_2025();

-- Update repair_orders table to use the new function for 2025
ALTER TABLE repair_orders
ALTER COLUMN repair_order_number SET DEFAULT generate_repair_order_number_2025();

-- Update sales_orders table to use the new function for 2025
ALTER TABLE sales_orders
ALTER COLUMN invoice_number SET DEFAULT generate_invoice_number_2025();

-- Create a table to track numbering sequences for future years
CREATE TABLE IF NOT EXISTS numbering_sequences (
    id SERIAL PRIMARY KEY,
    order_type VARCHAR(10) NOT NULL, -- 'PO', 'RO', 'SO'
    year INTEGER NOT NULL,
    last_number INTEGER NOT NULL,
    prefix VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(order_type, year)
);

-- Initialize 2025 sequences in the tracking table
INSERT INTO numbering_sequences (order_type, year, last_number, prefix) VALUES
('PO', 2025, 299, 'P25'),
('RO', 2025, 299, 'R25'),
('SO', 2025, 299, 'T25')
ON CONFLICT (order_type, year) DO NOTHING;

-- Create function for future years (2026+) that will handle year transitions
CREATE OR REPLACE FUNCTION generate_po_number_future()
RETURNS TEXT AS $$
DECLARE
    current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
    year_suffix INTEGER := current_year - 2000; -- 2025 -> 25, 2026 -> 26
    prefix TEXT := 'P' || year_suffix::TEXT;
    last_seq RECORD;
    next_number INTEGER;
BEGIN
    -- Find the last sequence for this order type and year
    SELECT * INTO last_seq
    FROM numbering_sequences
    WHERE order_type = 'PO' AND year = current_year;

    IF last_seq IS NULL THEN
        -- No sequence exists for this year, create it starting from 000
        next_number := 0;
        INSERT INTO numbering_sequences (order_type, year, last_number, prefix)
        VALUES ('PO', current_year, next_number, prefix);
    ELSE
        -- Use the next number in sequence
        next_number := last_seq.last_number + 1;
        UPDATE numbering_sequences
        SET last_number = next_number, updated_at = NOW()
        WHERE order_type = 'PO' AND year = current_year;
    END IF;

    -- Format with leading zeros (3 digits)
    RETURN prefix || LPAD(next_number::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Similar function for Repair Orders (future years)
CREATE OR REPLACE FUNCTION generate_repair_order_number_future()
RETURNS TEXT AS $$
DECLARE
    current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
    year_suffix INTEGER := current_year - 2000;
    prefix TEXT := 'R' || year_suffix::TEXT;
    last_seq RECORD;
    next_number INTEGER;
BEGIN
    SELECT * INTO last_seq
    FROM numbering_sequences
    WHERE order_type = 'RO' AND year = current_year;

    IF last_seq IS NULL THEN
        next_number := 0;
        INSERT INTO numbering_sequences (order_type, year, last_number, prefix)
        VALUES ('RO', current_year, next_number, prefix);
    ELSE
        next_number := last_seq.last_number + 1;
        UPDATE numbering_sequences
        SET last_number = next_number, updated_at = NOW()
        WHERE order_type = 'RO' AND year = current_year;
    END IF;

    RETURN prefix || LPAD(next_number::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Similar function for Invoice Numbers (future years)
CREATE OR REPLACE FUNCTION generate_invoice_number_future()
RETURNS TEXT AS $$
DECLARE
    current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
    year_suffix INTEGER := current_year - 2000;
    prefix TEXT := 'T' || year_suffix::TEXT;
    last_seq RECORD;
    next_number INTEGER;
BEGIN
    SELECT * INTO last_seq
    FROM numbering_sequences
    WHERE order_type = 'SO' AND year = current_year;

    IF last_seq IS NULL THEN
        next_number := 0;
        INSERT INTO numbering_sequences (order_type, year, last_number, prefix)
        VALUES ('SO', current_year, next_number, prefix);
    ELSE
        next_number := last_seq.last_number + 1;
        UPDATE numbering_sequences
        SET last_number = next_number, updated_at = NOW()
        WHERE order_type = 'SO' AND year = current_year;
    END IF;

    RETURN prefix || LPAD(next_number::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Create function to transition from 2025 to 2026+ numbering
CREATE OR REPLACE FUNCTION transition_to_yearly_numbering()
RETURNS VOID AS $$
DECLARE
    current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
    IF current_year > 2025 THEN
        -- Update table defaults to use future functions
        ALTER TABLE purchase_orders
        ALTER COLUMN po_number SET DEFAULT generate_po_number_future();

        ALTER TABLE repair_orders
        ALTER COLUMN repair_order_number SET DEFAULT generate_repair_order_number_future();

        ALTER TABLE sales_orders
        ALTER COLUMN invoice_number SET DEFAULT generate_invoice_number_future();

        RAISE NOTICE 'Successfully transitioned to yearly numbering system';
    END IF;
END;
$$ LANGUAGE plpgsql;