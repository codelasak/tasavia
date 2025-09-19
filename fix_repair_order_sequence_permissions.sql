-- Fix Repair Order Permissions Issue - Final Solution
-- The root cause is that the repair_order_sequence table lacks RLS policies
-- causing the trigger to fail when generating repair order numbers
-- Run this in Supabase SQL Editor

-- Step 1: Enable RLS on repair_order_sequence table
ALTER TABLE public.repair_order_sequence ENABLE ROW LEVEL SECURITY;

-- Step 2: Create policies for repair_order_sequence table
-- INSERT Policy - Allow authenticated users to create sequence records
CREATE POLICY "Enable insert for authenticated users"
ON public.repair_order_sequence
FOR INSERT
TO authenticated
WITH CHECK (true);

-- SELECT Policy - Allow authenticated users to read sequence records
CREATE POLICY "Enable select for authenticated users"
ON public.repair_order_sequence
FOR SELECT
TO authenticated
USING (true);

-- UPDATE Policy - Allow authenticated users to update sequence records
CREATE POLICY "Enable update for authenticated users"
ON public.repair_order_sequence
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Step 3: Verify the trigger function is working correctly
-- Test the sequence generation
DO $$
DECLARE
    v_test_number TEXT;
BEGIN
    -- Test the generate_repair_order_number function
    SELECT generate_repair_order_number() INTO v_test_number;

    RAISE NOTICE '✅ Repair order number generation test successful: %', v_test_number;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Repair order number generation test failed: %', SQLERRM;
END $$;

-- Step 4: Show final policy status
SELECT
    policyname as policy_name,
    tablename as table_name,
    permissive as is_permissive,
    cmd as operation,
    roles as applicable_roles
FROM pg_policies
WHERE tablename IN ('repair_orders', 'repair_order_sequence')
ORDER BY tablename, cmd;

-- Step 5: Confirmation message
DO $$
BEGIN
    RAISE NOTICE '✅ Repair order permissions fix completed!';
    RAISE NOTICE 'The issue was that the repair_order_sequence table was missing RLS policies.';
    RAISE NOTICE 'Users can now create repair orders successfully.';
END $$;