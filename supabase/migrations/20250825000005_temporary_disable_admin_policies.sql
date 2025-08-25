-- Temporarily disable admin policies to allow user access while debugging
DROP POLICY IF EXISTS "admins_can_manage_all_accounts" ON accounts;

-- Keep only the user-specific policies for now
-- "users_can_read_own_account" should allow users to read their own data
-- "allow_phone_validation_lookup" should allow general phone validation