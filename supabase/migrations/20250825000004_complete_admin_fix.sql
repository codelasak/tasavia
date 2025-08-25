-- Step 1: Drop all policies that depend on the old is_admin function
DROP POLICY IF EXISTS "admins_can_manage_all_accounts" ON accounts;
DROP POLICY IF EXISTS "admins_can_insert_any_account" ON accounts;
DROP POLICY IF EXISTS "Allow admins to manage terms and conditions" ON terms_and_conditions;

-- Step 2: Drop the old function that takes a UUID parameter
DROP FUNCTION IF EXISTS public.is_admin(uuid);

-- Step 3: Recreate policies using the new is_admin() function (no parameters)
CREATE POLICY "admins_can_manage_all_accounts" ON accounts
FOR ALL 
TO authenticated
USING (is_admin());

CREATE POLICY "admins_can_insert_any_account" ON accounts
FOR INSERT 
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "Allow admins to manage terms and conditions" ON terms_and_conditions
FOR ALL 
TO authenticated
USING (is_admin());