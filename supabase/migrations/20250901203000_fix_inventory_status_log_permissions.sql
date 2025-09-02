-- Allow application role to write to inventory_status_log used by triggers
-- Choose one approach. This file uses GRANTs with RLS disabled for consistency.

ALTER TABLE public.inventory_status_log DISABLE ROW LEVEL SECURITY;

GRANT INSERT ON public.inventory_status_log TO authenticated;
GRANT SELECT ON public.inventory_status_log TO authenticated;

-- If you prefer RLS instead, comment the lines above and use the below:
-- ALTER TABLE public.inventory_status_log ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "authenticated_can_insert_inventory_status_log" ON public.inventory_status_log;
-- CREATE POLICY "authenticated_can_insert_inventory_status_log"
-- ON public.inventory_status_log
-- FOR INSERT
-- TO authenticated
-- WITH CHECK (true);
-- GRANT INSERT ON public.inventory_status_log TO authenticated;

