-- Ensure service role can write to inventory_status_log (used by inventory update triggers)

-- Keep RLS disabled unless you implement explicit policies
ALTER TABLE public.inventory_status_log DISABLE ROW LEVEL SECURITY;

-- Grant required privileges to service_role (and keep authenticated as before)
GRANT INSERT, SELECT ON public.inventory_status_log TO service_role;
GRANT INSERT, SELECT ON public.inventory_status_log TO authenticated;

-- If the table uses a sequence/identity column, ensure sequence access as well
DO $$
DECLARE
  seq RECORD;
BEGIN
  FOR seq IN 
    SELECT sequence_schema, sequence_name
    FROM information_schema.sequences
    WHERE sequence_schema = 'public' 
      AND sequence_name LIKE 'inventory_status_log%'
  LOOP
    EXECUTE format('GRANT USAGE, SELECT, UPDATE ON SEQUENCE %I.%I TO service_role', seq.sequence_schema, seq.sequence_name);
    EXECUTE format('GRANT USAGE, SELECT, UPDATE ON SEQUENCE %I.%I TO authenticated', seq.sequence_schema, seq.sequence_name);
  END LOOP;
END $$;

