-- Baseline table grants and RLS policies for inventory reads and status updates

-- Table-level privileges (RLS still applies for row filtering)
GRANT SELECT ON TABLE public.inventory TO service_role, authenticated;
GRANT SELECT ON TABLE public.pn_master_table TO service_role, authenticated;
GRANT SELECT ON TABLE public.po_items TO service_role, authenticated;

-- Service role performs status updates via API
GRANT UPDATE ON TABLE public.inventory TO service_role;

-- Enable Row Level Security (safe if already enabled)
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pn_master_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.po_items ENABLE ROW LEVEL SECURITY;

-- Read policies for authenticated users
DROP POLICY IF EXISTS "inventory_read_authenticated" ON public.inventory;
CREATE POLICY "inventory_read_authenticated"
ON public.inventory
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "pn_read_authenticated" ON public.pn_master_table;
CREATE POLICY "pn_read_authenticated"
ON public.pn_master_table
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "po_items_read_authenticated" ON public.po_items;
CREATE POLICY "po_items_read_authenticated"
ON public.po_items
FOR SELECT
TO authenticated
USING (true);

-- NOTE: Do not add anon policies unless you explicitly want public read access.

