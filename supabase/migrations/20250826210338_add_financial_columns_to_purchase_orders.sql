-- Add missing financial columns to purchase_orders table
-- These columns exist in sales_orders but are missing in purchase_orders

-- Add freight_charge column
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS freight_charge NUMERIC DEFAULT 0.00;

-- Add misc_charge column  
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS misc_charge NUMERIC DEFAULT 0.00;

-- Add vat_percentage column
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS vat_percentage NUMERIC DEFAULT 0.00;

-- Add comments for documentation
COMMENT ON COLUMN purchase_orders.freight_charge IS 'Freight and forwarding charges for the purchase order';
COMMENT ON COLUMN purchase_orders.misc_charge IS 'Miscellaneous charges for the purchase order';
COMMENT ON COLUMN purchase_orders.vat_percentage IS 'VAT percentage (0-100) applied to the purchase order';