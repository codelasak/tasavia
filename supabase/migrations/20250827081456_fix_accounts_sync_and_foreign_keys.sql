-- Fix accounts table sync and foreign key constraint issues
-- The issue: auth.users exists but accounts table is empty, causing foreign key violations

-- First, drop the problematic foreign key constraints that were just created
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_created_by_admin_id_fkey;
ALTER TABLE admin_actions DROP CONSTRAINT IF EXISTS admin_actions_admin_id_fkey;
ALTER TABLE admin_actions DROP CONSTRAINT IF EXISTS admin_actions_target_user_id_fkey;
ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_aviation_compliance_updated_by_fkey;

-- Sync accounts table with existing auth.users data
-- This creates account records for existing authenticated users
INSERT INTO accounts (id, name, phone_number, created_at)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as name,
    au.phone as phone_number,
    au.created_at
FROM auth.users au
WHERE au.id NOT IN (SELECT id FROM accounts WHERE id IS NOT NULL)
ON CONFLICT (id) DO NOTHING;

-- Now recreate the foreign key constraints with proper data in place
-- user_roles should reference accounts (now populated)
ALTER TABLE user_roles 
ADD CONSTRAINT user_roles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES accounts(id) ON DELETE CASCADE;

-- admin_actions should reference accounts
ALTER TABLE admin_actions 
ADD CONSTRAINT admin_actions_admin_id_fkey 
FOREIGN KEY (admin_id) REFERENCES accounts(id) ON DELETE CASCADE;

ALTER TABLE admin_actions 
ADD CONSTRAINT admin_actions_target_user_id_fkey 
FOREIGN KEY (target_user_id) REFERENCES accounts(id) ON DELETE CASCADE;

-- created_by_admin_id should reference accounts.id 
ALTER TABLE accounts 
ADD CONSTRAINT accounts_created_by_admin_id_fkey 
FOREIGN KEY (created_by_admin_id) REFERENCES accounts(id) ON DELETE SET NULL;

-- purchase_orders aviation compliance should reference accounts
ALTER TABLE purchase_orders 
ADD CONSTRAINT purchase_orders_aviation_compliance_updated_by_fkey 
FOREIGN KEY (aviation_compliance_updated_by) REFERENCES accounts(id) ON DELETE SET NULL;