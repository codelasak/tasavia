-- Remove all potentially problematic policies and keep only basic access
DROP POLICY IF EXISTS "admins_can_insert_any_account" ON accounts;
DROP POLICY IF EXISTS "users_can_insert_own_account" ON accounts;
DROP POLICY IF EXISTS "users_can_read_own_account" ON accounts;
DROP POLICY IF EXISTS "users_can_update_own_account" ON accounts;

DROP POLICY IF EXISTS "Allow authenticated users to manage their own user_roles" ON user_roles;
DROP POLICY IF EXISTS "Allow authenticated users to read user_roles" ON user_roles;

-- Keep only the debug policies and phone validation
-- This should allow authenticated users to read everything they need