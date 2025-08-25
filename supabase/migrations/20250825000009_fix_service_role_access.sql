-- Fix service role access for admin verification
-- The service role needs to bypass RLS to verify admin status

-- Create a service role policy for user_roles table
CREATE POLICY "service_role_can_read_user_roles" ON user_roles
FOR SELECT 
TO service_role
USING (true);

-- Create a service role policy for roles table  
CREATE POLICY "service_role_can_read_roles" ON roles
FOR SELECT 
TO service_role
USING (true);

-- Also ensure service role can read accounts for admin operations
CREATE POLICY "service_role_can_manage_accounts" ON accounts
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Create a function specifically for admin verification that bypasses RLS
CREATE OR REPLACE FUNCTION check_user_admin_status(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.role_id
    WHERE ur.user_id = $1 
    AND r.role_name IN ('admin', 'super_admin')
  );
END;
$$;

-- Grant execute permission to service role and authenticated users
GRANT EXECUTE ON FUNCTION check_user_admin_status(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION check_user_admin_status(uuid) TO authenticated;