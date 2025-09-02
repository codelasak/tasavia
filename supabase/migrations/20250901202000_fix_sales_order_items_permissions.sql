-- Align sales_order_items permissions with sales_orders and repair_order_items

-- Disable RLS for consistency (client inserts via authenticated role)
ALTER TABLE public.sales_order_items DISABLE ROW LEVEL SECURITY;

-- Grant CRUD privileges to application roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_order_items TO authenticated;
-- If you also need pre-auth reads, uncomment the next line
-- GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_order_items TO anon;

