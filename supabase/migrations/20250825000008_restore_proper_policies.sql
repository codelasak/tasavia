-- Clean up debug policies and restore proper RLS policies
DROP POLICY IF EXISTS "debug_allow_all_reads" ON accounts;
DROP POLICY IF EXISTS "debug_allow_all_user_roles_reads" ON user_roles;

-- Restore proper account policies
CREATE POLICY "users_can_read_own_account" ON accounts
FOR SELECT 
TO authenticated
USING (id = auth.uid());

CREATE POLICY "users_can_update_own_account" ON accounts
FOR UPDATE 
TO authenticated
USING (id = auth.uid());

CREATE POLICY "users_can_insert_own_account" ON accounts
FOR INSERT 
TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "admins_can_manage_all_accounts" ON accounts
FOR ALL 
TO authenticated
USING (is_admin());

CREATE POLICY "admins_can_insert_any_account" ON accounts
FOR INSERT 
TO authenticated
WITH CHECK (is_admin());

-- Restore proper user_roles policies
CREATE POLICY "users_can_read_own_user_roles" ON user_roles
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "admins_can_read_all_user_roles" ON user_roles
FOR SELECT 
TO authenticated
USING (is_admin());

CREATE POLICY "admins_can_manage_user_roles" ON user_roles
FOR ALL 
TO authenticated
USING (is_admin());