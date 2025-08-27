-- Fix broken foreign key constraints pointing to non-existent 'users' table
-- These constraints are causing 406 errors and database integrity issues

-- Drop all foreign key constraints that reference the non-existent 'users' table
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_created_by_admin_id_fkey;
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_id_fkey;
ALTER TABLE admin_actions DROP CONSTRAINT IF EXISTS admin_actions_target_user_id_fkey;
ALTER TABLE admin_actions DROP CONSTRAINT IF EXISTS admin_actions_admin_id_fkey;
ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_aviation_compliance_updated_by_fkey;
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

-- Recreate the constraints to point to 'accounts' table instead of 'users'
-- accounts.id should reference accounts.id (self-reference for auth integration)
ALTER TABLE accounts 
ADD CONSTRAINT accounts_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- created_by_admin_id should reference accounts.id 
ALTER TABLE accounts 
ADD CONSTRAINT accounts_created_by_admin_id_fkey 
FOREIGN KEY (created_by_admin_id) REFERENCES accounts(id) ON DELETE SET NULL;

-- admin_actions should reference accounts
ALTER TABLE admin_actions 
ADD CONSTRAINT admin_actions_admin_id_fkey 
FOREIGN KEY (admin_id) REFERENCES accounts(id) ON DELETE CASCADE;

ALTER TABLE admin_actions 
ADD CONSTRAINT admin_actions_target_user_id_fkey 
FOREIGN KEY (target_user_id) REFERENCES accounts(id) ON DELETE CASCADE;

-- user_roles should reference accounts  
ALTER TABLE user_roles 
ADD CONSTRAINT user_roles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES accounts(id) ON DELETE CASCADE;

-- purchase_orders aviation compliance should reference accounts
ALTER TABLE purchase_orders 
ADD CONSTRAINT purchase_orders_aviation_compliance_updated_by_fkey 
FOREIGN KEY (aviation_compliance_updated_by) REFERENCES accounts(id) ON DELETE SET NULL;