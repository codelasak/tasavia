-- Remove the old is_admin function that takes a UUID parameter
DROP FUNCTION IF EXISTS public.is_admin(uuid);