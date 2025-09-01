ALTER TABLE public.repair_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to create repair orders"
ON public.repair_orders
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view repair orders"
ON public.repair_orders
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to update repair orders"
ON public.repair_orders
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete repair orders"
ON public.repair_orders
FOR DELETE
TO authenticated
USING (true);