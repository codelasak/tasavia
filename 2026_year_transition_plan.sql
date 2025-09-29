-- 2026 Year Transition Plan
-- Execute this on January 1, 2026 or when ready to transition to yearly numbering

-- Step 1: Backup current sequences (optional but recommended)
CREATE TABLE IF NOT EXISTS numbering_sequences_2025_backup AS
SELECT * FROM numbering_sequences WHERE year = 2025;

-- Step 2: Initialize 2026 sequences
INSERT INTO numbering_sequences (order_type, year, last_number, prefix) VALUES
('PO', 2026, -1, 'P26'),
('RO', 2026, -1, 'R26'),
('SO', 2026, -1, 'T26')
ON CONFLICT (order_type, year) DO UPDATE
SET last_number = -1, prefix = CASE
    WHEN numbering_sequences.order_type = 'PO' THEN 'P26'
    WHEN numbering_sequences.order_type = 'RO' THEN 'R26'
    WHEN numbering_sequences.order_type = 'SO' THEN 'T26'
END;

-- Step 3: Create transition function for 2026
CREATE OR REPLACE FUNCTION generate_po_number_2026()
RETURNS TEXT AS $$
DECLARE
    last_number TEXT;
    next_number INTEGER;
    year_prefix TEXT := 'P26';
BEGIN
    -- Find the highest existing PO number for 2026
    SELECT po_number INTO last_number
    FROM purchase_orders
    WHERE po_number LIKE 'P26%'
    ORDER BY po_number DESC
    LIMIT 1;

    IF last_number IS NULL THEN
        -- No existing PO numbers for 2026, start from 000
        next_number := 0;
    ELSE
        -- Extract the numeric part and increment by 1
        BEGIN
            next_number := CAST(SUBSTRING(last_number FROM 2) AS INTEGER) + 1;
        EXCEPTION WHEN OTHERS THEN
            -- If conversion fails, start from 000
            next_number := 0;
        END;
    END IF;

    -- Update the sequence tracker
    INSERT INTO numbering_sequences (order_type, year, last_number, prefix)
    VALUES ('PO', 2026, next_number, prefix)
    ON CONFLICT (order_type, year) DO UPDATE
    SET last_number = next_number, updated_at = NOW();

    RETURN prefix || LPAD(next_number::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Create similar function for Repair Orders 2026
CREATE OR REPLACE FUNCTION generate_repair_order_number_2026()
RETURNS TEXT AS $$
DECLARE
    last_number TEXT;
    next_number INTEGER;
    prefix TEXT := 'R26';
BEGIN
    SELECT repair_order_number INTO last_number
    FROM repair_orders
    WHERE repair_order_number LIKE 'R26%'
    ORDER BY repair_order_number DESC
    LIMIT 1;

    IF last_number IS NULL THEN
        -- No existing RO numbers for 2026, start from 000
        next_number := 0;
    ELSE
        -- Extract the numeric part and increment by 1
        BEGIN
            next_number := CAST(SUBSTRING(last_number FROM 2) AS INTEGER) + 1;
        EXCEPTION WHEN OTHERS THEN
            -- If conversion fails, start from 000
            next_number := 0;
        END;
    END IF;

    INSERT INTO numbering_sequences (order_type, year, last_number, prefix)
    VALUES ('RO', 2026, next_number, prefix)
    ON CONFLICT (order_type, year) DO UPDATE
    SET last_number = next_number, updated_at = NOW();

    RETURN prefix || LPAD(next_number::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Create similar function for Invoice Numbers 2026
CREATE OR REPLACE FUNCTION generate_invoice_number_2026()
RETURNS TEXT AS $$
DECLARE
    last_number TEXT;
    next_number INTEGER;
    prefix TEXT := 'T26';
BEGIN
    SELECT invoice_number INTO last_number
    FROM sales_orders
    WHERE invoice_number LIKE 'T26%'
    ORDER BY invoice_number DESC
    LIMIT 1;

    IF last_number IS NULL THEN
        -- No existing invoice numbers for 2026, start from 000
        next_number := 0;
    ELSE
        -- Extract the numeric part and increment by 1
        BEGIN
            next_number := CAST(SUBSTRING(last_number FROM 2) AS INTEGER) + 1;
        EXCEPTION WHEN OTHERS THEN
            -- If conversion fails, start from 000
            next_number := 0;
        END;
    END IF;

    INSERT INTO numbering_sequences (order_type, year, last_number, prefix)
    VALUES ('SO', 2026, next_number, prefix)
    ON CONFLICT (order_type, year) DO UPDATE
    SET last_number = next_number, updated_at = NOW();

    RETURN prefix || LPAD(next_number::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Step 4: Update table defaults to use 2026 functions
-- Note: This should be done exactly at the transition moment

-- Function to perform the transition
CREATE OR REPLACE FUNCTION transition_to_2026_numbering()
RETURNS VOID AS $$
BEGIN
    -- Update purchase orders table default
    ALTER TABLE purchase_orders
    ALTER COLUMN po_number SET DEFAULT generate_po_number_2026();

    -- Update repair orders table default
    ALTER TABLE repair_orders
    ALTER COLUMN repair_order_number SET DEFAULT generate_repair_order_number_2026();

    -- Update sales orders table default
    ALTER TABLE sales_orders
    ALTER COLUMN invoice_number SET DEFAULT generate_invoice_number_2026();

    RAISE NOTICE 'Successfully transitioned to 2026 numbering system';
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create verification function
CREATE OR REPLACE FUNCTION verify_2026_transition()
RETURNS TABLE(
    table_name TEXT,
    column_name TEXT,
    current_default TEXT,
    expected_default TEXT,
    is_correct BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        'purchase_orders'::TEXT as table_name,
        'po_number'::TEXT as column_name,
        column_default as current_default,
        'generate_po_number_2026()'::TEXT as expected_default,
        (column_default = 'generate_po_number_2026()'::TEXT) as is_correct
    FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'po_number'

    UNION ALL

    SELECT
        'repair_orders'::TEXT as table_name,
        'repair_order_number'::TEXT as column_name,
        column_default as current_default,
        'generate_repair_order_number_2026()'::TEXT as expected_default,
        (column_default = 'generate_repair_order_number_2026()'::TEXT) as is_correct
    FROM information_schema.columns
    WHERE table_name = 'repair_orders' AND column_name = 'repair_order_number'

    UNION ALL

    SELECT
        'sales_orders'::TEXT as table_name,
        'invoice_number'::TEXT as column_name,
        column_default as current_default,
        'generate_invoice_number_2026()'::TEXT as expected_default,
        (column_default = 'generate_invoice_number_2026()'::TEXT) as is_correct
    FROM information_schema.columns
    WHERE table_name = 'sales_orders' AND column_name = 'invoice_number';
END;
$$ LANGUAGE plpgsql;

-- Test the transition (don't execute this until ready)
-- SELECT transition_to_2026_numbering();

-- Verify the transition
-- SELECT * FROM verify_2026_transition();