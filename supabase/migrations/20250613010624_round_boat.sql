/*
  # Fix Row Level Security Policies

  1. Drop existing policies that might be too restrictive
  2. Create new policies that allow all operations for authenticated users
  3. Ensure all tables have proper RLS policies
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage my_companies" ON my_companies;
DROP POLICY IF EXISTS "Users can manage companies" ON companies;
DROP POLICY IF EXISTS "Users can manage pn_master_table" ON pn_master_table;
DROP POLICY IF EXISTS "Users can manage my_ship_via" ON my_ship_via;
DROP POLICY IF EXISTS "Users can manage purchase_orders" ON purchase_orders;
DROP POLICY IF EXISTS "Users can manage po_items" ON po_items;
DROP POLICY IF EXISTS "Users can manage inventory" ON inventory;

-- Create comprehensive policies for all operations
-- My Companies
CREATE POLICY "Enable all operations for authenticated users on my_companies"
  ON my_companies
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- External Companies
CREATE POLICY "Enable all operations for authenticated users on companies"
  ON companies
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Part Numbers
CREATE POLICY "Enable all operations for authenticated users on pn_master_table"
  ON pn_master_table
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Ship Via
CREATE POLICY "Enable all operations for authenticated users on my_ship_via"
  ON my_ship_via
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Purchase Orders
CREATE POLICY "Enable all operations for authenticated users on purchase_orders"
  ON purchase_orders
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- PO Items
CREATE POLICY "Enable all operations for authenticated users on po_items"
  ON po_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Inventory
CREATE POLICY "Enable all operations for authenticated users on inventory"
  ON inventory
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Also create policies for anonymous users (in case you need them for testing)
-- You can remove these if you only want authenticated access

CREATE POLICY "Enable all operations for anonymous users on my_companies"
  ON my_companies
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all operations for anonymous users on companies"
  ON companies
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all operations for anonymous users on pn_master_table"
  ON pn_master_table
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all operations for anonymous users on my_ship_via"
  ON my_ship_via
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all operations for anonymous users on purchase_orders"
  ON purchase_orders
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all operations for anonymous users on po_items"
  ON po_items
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all operations for anonymous users on inventory"
  ON inventory
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);