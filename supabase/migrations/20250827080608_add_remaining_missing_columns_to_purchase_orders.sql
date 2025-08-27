-- Add all remaining missing columns to purchase_orders table
-- This fixes the ship_to_address_details error and all other missing columns

-- Add shipping company information
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS ship_to_company_name TEXT;

-- Add shipping address details
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS ship_to_address_details TEXT;

-- Add shipping contact information
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS ship_to_contact_name TEXT;

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS ship_to_contact_phone TEXT;

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS ship_to_contact_email TEXT;

-- Add financial subtotal column
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0.00;

-- Add comments for documentation
COMMENT ON COLUMN purchase_orders.ship_to_company_name IS 'Name of the company to ship to';
COMMENT ON COLUMN purchase_orders.ship_to_address_details IS 'Formatted shipping address details';
COMMENT ON COLUMN purchase_orders.ship_to_contact_name IS 'Name of the contact person at shipping destination';
COMMENT ON COLUMN purchase_orders.ship_to_contact_phone IS 'Phone number of the shipping contact';
COMMENT ON COLUMN purchase_orders.ship_to_contact_email IS 'Email address of the shipping contact';
COMMENT ON COLUMN purchase_orders.subtotal IS 'Subtotal amount before taxes and additional charges';