-- Grant proper permissions on repair_orders table to match purchase_orders
-- This fixes the 403 Forbidden errors by ensuring authenticated users can access the table

-- Grant all permissions to authenticated role (same as purchase_orders)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repair_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repair_orders TO anon;

-- Also fix sales_orders if it has the same issue
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_orders TO anon;