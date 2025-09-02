-- Allow authenticated users to read active terms and conditions
-- while keeping management restricted to admins (existing policy).

-- Ensure RLS is enabled
ALTER TABLE public.terms_and_conditions ENABLE ROW LEVEL SECURITY;

-- Read policy for authenticated users (active terms only)
DROP POLICY IF EXISTS "authenticated_can_read_active_terms" ON public.terms_and_conditions;
CREATE POLICY "authenticated_can_read_active_terms"
ON public.terms_and_conditions
FOR SELECT
TO authenticated
USING (is_active = true);

-- Grant basic SELECT privileges (RLS still applies)
GRANT SELECT ON public.terms_and_conditions TO authenticated;

