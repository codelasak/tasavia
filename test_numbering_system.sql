-- Test script for 2025 numbering system
-- Run this to verify the numbering system works correctly

-- Test 1: Check if functions exist
SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_name IN (
    'generate_po_number_2025',
    'generate_repair_order_number_2025',
    'generate_invoice_number_2025'
)
AND routine_schema = 'public'
ORDER BY routine_name;

-- Test 2: Test PO number generation
SELECT generate_po_number_2025() as po_number;

-- Test 3: Test Repair Order number generation
SELECT generate_repair_order_number_2025() as repair_order_number;

-- Test 4: Test Invoice number generation
SELECT generate_invoice_number_2025() as invoice_number;

-- Test 5: Check numbering_sequences table
SELECT * FROM numbering_sequences WHERE year = 2025 ORDER BY order_type;

-- Test 6: Check table defaults
SELECT
    table_name,
    column_name,
    column_default
FROM information_schema.columns
WHERE table_name IN ('purchase_orders', 'repair_orders', 'sales_orders')
AND column_name IN ('po_number', 'repair_order_number', 'invoice_number')
AND column_default IS NOT NULL
ORDER BY table_name, column_name;

-- Test 7: Verify no-gap logic (this is a simulation)
-- The actual no-gap logic is implemented in the functions
-- This just shows how they would work
DO $$
DECLARE
    test_po TEXT;
    test_ro TEXT;
    test_inv TEXT;
BEGIN
    -- Generate test numbers
    SELECT generate_po_number_2025() INTO test_po;
    SELECT generate_repair_order_number_2025() INTO test_ro;
    SELECT generate_invoice_number_2025() INTO test_inv;

    RAISE NOTICE '=== 2025 Numbering System Test Results ===';
    RAISE NOTICE 'PO Number: %', test_po;
    RAISE NOTICE 'RO Number: %', test_ro;
    RAISE NOTICE 'Invoice Number: %', test_inv;

    -- Verify they start with P25300 format (P25 + 300)
    IF test_po LIKE 'P253%' THEN
        RAISE NOTICE '✅ PO numbering starts correctly from P25300';
    ELSE
        RAISE NOTICE '❌ PO numbering issue: %', test_po;
    END IF;

    IF test_ro LIKE 'R253%' THEN
        RAISE NOTICE '✅ RO numbering starts correctly from R25300';
    ELSE
        RAISE NOTICE '❌ RO numbering issue: %', test_ro;
    END IF;

    IF test_inv LIKE 'T253%' THEN
        RAISE NOTICE '✅ Invoice numbering starts correctly from T25300';
    ELSE
        RAISE NOTICE '❌ Invoice numbering issue: %', test_inv;
    END IF;

    RAISE NOTICE '=== Test Complete ===';
END $$;