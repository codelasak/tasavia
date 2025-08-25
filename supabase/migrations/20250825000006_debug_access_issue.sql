-- Temporarily allow all authenticated users to read accounts for debugging
CREATE POLICY "debug_allow_all_reads" ON accounts
FOR SELECT 
TO authenticated
USING (true);

-- Also add a debug policy for user_roles
CREATE POLICY "debug_allow_all_user_roles_reads" ON user_roles
FOR SELECT 
TO authenticated
USING (true);