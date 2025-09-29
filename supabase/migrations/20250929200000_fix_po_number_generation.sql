-- Fix PO number generation functions to correctly extract numeric parts
-- This fixes the issue where P25300 was being parsed as 25300 instead of 300

-- Fix PO number generation function
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
        -- Extract the numeric part and increment by 1 (fixed: FROM 4 instead of FROM 2)
        BEGIN
            next_number := CAST(SUBSTRING(last_number FROM 4) AS INTEGER) + 1;
        EXCEPTION WHEN OTHERS THEN
            -- If conversion fails, start from 300
            next_number := 300;
        END;
    END IF;

    RETURN year_prefix || next_number::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Fix Repair Order number generation function
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
        -- Extract the numeric part and increment by 1 (fixed: FROM 4 instead of FROM 2)
        BEGIN
            next_number := CAST(SUBSTRING(last_number FROM 4) AS INTEGER) + 1;
        EXCEPTION WHEN OTHERS THEN
            -- If conversion fails, start from 300
            next_number := 300;
        END;
    END IF;

    RETURN year_prefix || next_number::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Fix Invoice number generation function
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
        -- Extract the numeric part and increment by 1 (fixed: FROM 4 instead of FROM 2)
        BEGIN
            next_number := CAST(SUBSTRING(last_number FROM 4) AS INTEGER) + 1;
        EXCEPTION WHEN OTHERS THEN
            -- If conversion fails, start from 300
            next_number := 300;
        END;
    END IF;

    RETURN year_prefix || next_number::TEXT;
END;
$$ LANGUAGE plpgsql;