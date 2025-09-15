-- Enable RLS on repair_orders table
ALTER TABLE repair_orders ENABLE ROW LEVEL SECURITY;

-- Create DELETE policy for repair_orders
CREATE POLICY "Allow authenticated users to delete repair orders" ON repair_orders FOR DELETE TO authenticated USING (true);

-- Add ON DELETE CASCADE to the part_number_history foreign key constraint
-- First, drop the existing constraint
ALTER TABLE part_number_history DROP CONSTRAINT part_number_history_repair_order_id_fkey;

-- Then add the constraint with ON DELETE CASCADE
ALTER TABLE part_number_history
ADD CONSTRAINT part_number_history_repair_order_id_fkey
FOREIGN KEY (repair_order_id) REFERENCES repair_orders(repair_order_id) ON DELETE CASCADE;