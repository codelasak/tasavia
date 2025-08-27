-- Add freight_charge column to purchase_orders table
ALTER TABLE purchase_orders 
ADD COLUMN freight_charge NUMERIC DEFAULT 0.00;

-- Add comment for documentation
COMMENT ON COLUMN purchase_orders.freight_charge IS 'Freight and forwarding charges for the purchase order';