-- First, update all RLS policies to use the new is_admin() function without parameters

-- Update accounts table policies
DROP POLICY IF EXISTS "admins_can_manage_all_accounts" ON accounts;
CREATE POLICY "admins_can_manage_all_accounts" ON accounts
FOR ALL 
TO authenticated
USING (is_admin());

DROP POLICY IF EXISTS "admins_can_insert_any_account" ON accounts;
CREATE POLICY "admins_can_insert_any_account" ON accounts
FOR INSERT 
TO authenticated
WITH CHECK (is_admin());

-- Update terms_and_conditions table policy
DROP POLICY IF EXISTS "Allow admins to manage terms and conditions" ON terms_and_conditions;
CREATE POLICY "Allow admins to manage terms and conditions" ON terms_and_conditions
FOR ALL 
TO authenticated
USING (is_admin());

-- Now safely drop the old function that takes a UUID parameter
DROP FUNCTION IF EXISTS public.is_admin(uuid);