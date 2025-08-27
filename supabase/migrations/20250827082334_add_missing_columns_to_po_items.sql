-- Add missing columns to po_items table
-- The application expects 'description' and 'line_number' columns that don't exist

-- Add description column (the application expects this instead of description_override)
ALTER TABLE po_items 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add line_number column (used for ordering items in the purchase order)
ALTER TABLE po_items 
ADD COLUMN IF NOT EXISTS line_number INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN po_items.description IS 'Description of the purchase order item';
COMMENT ON COLUMN po_items.line_number IS 'Line number for ordering items in the purchase order';