-- Align repair_order_items permissions with repair_orders and purchase_orders behavior
-- This addresses 403 Forbidden errors when inserting/listing repair order items

-- Disable RLS if enabled (consistency with repair_orders per prior migration)
ALTER TABLE public.repair_order_items DISABLE ROW LEVEL SECURITY;

-- Grant typical CRUD privileges to application roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repair_order_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repair_order_items TO anon;

