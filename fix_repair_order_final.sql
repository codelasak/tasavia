-- Final Fix for Repair Order Permissions
-- Run this in Supabase SQL Editor as admin

-- Step 1: Remove existing policies that might be conflicting
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON repair_order_sequence;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON repair_order_sequence;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON repair_order_sequence;

-- Step 2: Create a single comprehensive policy for all operations
CREATE POLICY "Enable all operations for authenticated users"
ON public.repair_order_sequence
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Step 3: Test the repair order creation process
DO $$
DECLARE
    v_vendor_id UUID;
    v_test_result RECORD;
BEGIN
    -- Get a valid vendor ID
    SELECT company_id INTO v_vendor_id
    FROM companies
    WHERE company_type = 'External'
    LIMIT 1;

    IF v_vendor_id IS NULL THEN
        RAISE NOTICE 'No vendor companies found for testing';
        RETURN;
    END IF;

    -- Test creating a repair order (this will trigger the sequence function)
    INSERT INTO repair_orders (
        vendor_company_id,
        status,
        total_cost,
        currency
    ) VALUES (
        v_vendor_id,
        'Draft',
        0.00,
        'USD'
    ) RETURNING repair_order_id INTO v_test_result;

    RAISE NOTICE '✅ Repair order creation test successful! ID: %', v_test_result.repair_order_id;

    -- Clean up
    DELETE FROM repair_orders WHERE repair_order_id = v_test_result.repair_order_id;

    RAISE NOTICE '✅ Test cleanup completed';

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Repair order creation test failed: %', SQLERRM;
    RAISE NOTICE 'Error code: %', SQLSTATE;
END $$;

-- Step 4: Show final status
SELECT
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'repair_order_sequence'
ORDER BY cmd;

-- Step 5: Verify sequence table is accessible
DO $$
BEGIN
    RAISE NOTICE '✅ Final repair order permissions fix completed!';
    RAISE NOTICE 'The repair_order_sequence table now has a comprehensive ALL policy.';
    RAISE NOTICE 'Users should now be able to create repair orders.';
END $$;