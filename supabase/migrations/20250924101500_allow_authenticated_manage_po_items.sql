-- Allow authenticated users to manage po_items (SELECT/INSERT/UPDATE/DELETE)
-- Idempotent: checks for existing policy before creating

BEGIN;

-- Ensure RLS is enabled (safe to run multiple times)
ALTER TABLE IF EXISTS public.po_items ENABLE ROW LEVEL SECURITY;

-- Create a permissive ALL policy for role "authenticated"
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'po_items'
      AND policyname = 'Allow authenticated users to manage po items'
  ) THEN
    CREATE POLICY "Allow authenticated users to manage po items"
      ON public.po_items
      AS PERMISSIVE
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

COMMIT;

