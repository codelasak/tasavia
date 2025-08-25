-- Fix is_admin() function to use auth.uid() internally instead of expecting a parameter
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.role_id
    WHERE ur.user_id = auth.uid() AND r.role_name IN ('admin', 'super_admin')
  );
END;
$$;