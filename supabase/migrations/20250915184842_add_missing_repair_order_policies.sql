-- Add missing INSERT and SELECT policies for repair_orders table
-- Note: RLS is already enabled from the previous migration

-- Create INSERT policy for repair orders
CREATE POLICY "Allow authenticated users to insert repair orders" ON repair_orders FOR INSERT TO authenticated WITH CHECK (true);

-- Create SELECT policy for repair orders
CREATE POLICY "Allow authenticated users to select repair orders" ON repair_orders FOR SELECT TO authenticated USING (true);

-- Create UPDATE policy for repair orders (for future edits)
CREATE POLICY "Allow authenticated users to update repair orders" ON repair_orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);