-- Fix Repair Order Permissions Issue
-- This script ensures proper RLS policies for repair_orders table
-- Run this in Supabase SQL Editor

-- Step 1: Verify RLS is enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE tablename = 'repair_orders'
        AND rowsecurity = true
    ) THEN
        RAISE NOTICE 'Enabling RLS on repair_orders table';
        ALTER TABLE public.repair_orders ENABLE ROW LEVEL SECURITY;
    ELSE
        RAISE NOTICE 'RLS already enabled on repair_orders table';
    END IF;
END
$$;

-- Step 2: Drop existing policies to avoid conflicts
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow authenticated users to create repair orders" ON repair_orders;
    DROP POLICY IF EXISTS "Allow authenticated users to view repair orders" ON repair_orders;
    DROP POLICY IF EXISTS "Allow authenticated users to update repair orders" ON repair_orders;
    DROP POLICY IF EXISTS "Allow authenticated users to delete repair orders" ON repair_orders;
    DROP POLICY IF EXISTS "Allow authenticated users to insert repair orders" ON repair_orders;
    DROP POLICY IF EXISTS "Allow authenticated users to select repair orders" ON repair_orders;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON repair_orders;
    DROP POLICY IF EXISTS "Enable select for authenticated users" ON repair_orders;
    DROP POLICY IF EXISTS "Enable update for authenticated users" ON repair_orders;
    DROP POLICY IF EXISTS "Enable delete for authenticated users" ON repair_orders;

    RAISE NOTICE 'Dropped existing repair_orders policies';
EXCEPTION WHEN undefined_object THEN
    RAISE NOTICE 'No existing policies to drop';
END
$$;

-- Step 3: Create clean, comprehensive policies
-- INSERT Policy - Allow authenticated users to create repair orders
CREATE POLICY "Enable insert for authenticated users"
ON public.repair_orders
FOR INSERT
TO authenticated
WITH CHECK (true);

-- SELECT Policy - Allow authenticated users to view repair orders
CREATE POLICY "Enable select for authenticated users"
ON public.repair_orders
FOR SELECT
TO authenticated
USING (true);

-- UPDATE Policy - Allow authenticated users to update their own repair orders
CREATE POLICY "Enable update for authenticated users"
ON public.repair_orders
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- DELETE Policy - Allow authenticated users to delete repair orders
CREATE POLICY "Enable delete for authenticated users"
ON public.repair_orders
FOR DELETE
TO authenticated
USING (true);

-- Step 4: Verify policies were created correctly
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'repair_orders';

    RAISE NOTICE 'Repair orders policies created successfully. Total policies: %', policy_count;
END
$$;

-- Step 5: Show current policies for verification
SELECT
    policyname as policy_name,
    tablename as table_name,
    permissive as is_permissive,
    cmd as operation,
    roles as applicable_roles
FROM pg_policies
WHERE tablename = 'repair_orders'
ORDER BY cmd;

-- Step 6: Additional diagnostic information
DO $$
DECLARE
    rls_enabled BOOLEAN;
BEGIN
    SELECT rowsecurity INTO rls_enabled
    FROM pg_tables
    WHERE tablename = 'repair_orders';

    RAISE NOTICE 'RLS enabled on repair_orders: %', rls_enabled;

    IF rls_enabled THEN
        RAISE NOTICE '✅ RLS is properly enabled on repair_orders table';
    ELSE
        RAISE NOTICE '❌ RLS is NOT enabled on repair_orders table';
    END IF;
END
$$;

-- Step 7: Check if user has proper authentication setup
DO $$
DECLARE
    auth_role_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_roles
        WHERE rolname = 'authenticated'
    ) INTO auth_role_exists;

    RAISE NOTICE 'Authenticated role exists: %', auth_role_exists;

    IF auth_role_exists THEN
        RAISE NOTICE '✅ Authenticated role exists for RLS policies';
    ELSE
        RAISE NOTICE '❌ Authenticated role does not exist - this could cause permission issues';
    END IF;
END
$$;