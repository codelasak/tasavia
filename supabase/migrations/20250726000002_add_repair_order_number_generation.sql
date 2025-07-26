-- Add Repair Order Number Auto-Generation
-- This migration creates auto-generation functionality for repair_order_number field
-- Following the same pattern as purchase orders (generate_po_number)

-- Create sequence for repair order numbers
CREATE SEQUENCE IF NOT EXISTS repair_order_number_seq START 1;

-- Create function to generate repair order numbers
-- Format: R{YY}{###} (e.g., R25001, R25002)
CREATE OR REPLACE FUNCTION generate_repair_order_number()
RETURNS text AS $$
DECLARE
    current_year text;
    next_val integer;
    ro_num text;
BEGIN
    current_year := to_char(now(), 'YY');
    next_val := nextval('repair_order_number_seq');
    ro_num := 'R' || current_year || lpad(next_val::text, 3, '0');
    
    -- Check if repair order number already exists, if so increment
    WHILE EXISTS (SELECT 1 FROM repair_orders WHERE repair_order_number = ro_num) LOOP
        next_val := nextval('repair_order_number_seq');
        ro_num := 'R' || current_year || lpad(next_val::text, 3, '0');
    END LOOP;
    
    RETURN ro_num;
END;
$$ LANGUAGE plpgsql;

-- Set the default value for repair_order_number column
ALTER TABLE repair_orders ALTER COLUMN repair_order_number SET DEFAULT generate_repair_order_number();

-- Ensure the column is properly configured as NOT NULL (should already be set)
ALTER TABLE repair_orders ALTER COLUMN repair_order_number SET NOT NULL;

-- Test the function works
DO $$
DECLARE
    test_repair_order_number text;
BEGIN
    test_repair_order_number := generate_repair_order_number();
    RAISE NOTICE 'Generated test repair order number: %', test_repair_order_number;
END $$;

-- Add comment to document the function
COMMENT ON FUNCTION generate_repair_order_number() IS 'Auto-generates unique repair order numbers in format R{YY}{###}';