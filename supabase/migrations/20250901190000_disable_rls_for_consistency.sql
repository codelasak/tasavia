-- Disable Row Level Security on repair_orders and sales_orders to match purchase_orders
-- This ensures consistent authentication behavior across all CRUD operations

-- Disable RLS on repair_orders table
ALTER TABLE public.repair_orders DISABLE ROW LEVEL SECURITY;

-- Disable RLS on sales_orders table  
ALTER TABLE public.sales_orders DISABLE ROW LEVEL SECURITY;

-- Drop existing RLS policies since they're no longer needed
DROP POLICY IF EXISTS "Allow authenticated users to create repair orders" ON public.repair_orders;
DROP POLICY IF EXISTS "Allow authenticated users to view repair orders" ON public.repair_orders;
DROP POLICY IF EXISTS "Allow authenticated users to update repair orders" ON public.repair_orders;
DROP POLICY IF EXISTS "Allow authenticated users to delete repair orders" ON public.repair_orders;

-- Note: sales_orders policies would be dropped here if they exist
-- You can add similar DROP POLICY statements for sales_orders if needed