-- Test script for complete PO → Inventory → Sales Order lifecycle workflow
-- Purpose: Verify all automation triggers and deletion cascades work correctly
-- Date: 2025-07-26

-- Test Case 1: PO Completion → Inventory Creation
DO $$
DECLARE
    test_po_id UUID;
    test_pn_id UUID;
    created_inventory_count INTEGER;
    inventory_record RECORD;
BEGIN
    RAISE NOTICE 'Starting Test Case 1: PO Completion → Inventory Creation';
    
    -- Get a test PO that exists but hasn't been completed
    SELECT po_id INTO test_po_id 
    FROM purchase_orders 
    WHERE status != 'Completed' 
    LIMIT 1;
    
    IF test_po_id IS NULL THEN
        RAISE NOTICE 'SKIP: No available PO for testing';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Testing with PO ID: %', test_po_id;
    
    -- Count inventory items before completion
    SELECT COUNT(*) INTO created_inventory_count
    FROM inventory 
    WHERE po_id_original = test_po_id;
    
    RAISE NOTICE 'Inventory items before completion: %', created_inventory_count;
    
    -- Call the completion function
    SELECT created_count INTO created_inventory_count
    FROM create_inventory_from_po_completion(test_po_id)
    WHERE success = true
    LIMIT 1;
    
    IF created_inventory_count IS NULL THEN
        RAISE NOTICE 'FAIL: PO completion failed or returned no results';
        RETURN;
    END IF;
    
    RAISE NOTICE 'SUCCESS: Created % inventory items', created_inventory_count;
    
    -- Verify inventory items were created with correct status
    FOR inventory_record IN 
        SELECT inventory_id, status 
        FROM inventory 
        WHERE po_id_original = test_po_id
    LOOP
        IF inventory_record.status != 'Available' THEN
            RAISE NOTICE 'FAIL: Inventory item % has wrong status: %', 
                        inventory_record.inventory_id, inventory_record.status;
        ELSE
            RAISE NOTICE 'SUCCESS: Inventory item % has correct status: Available', 
                        inventory_record.inventory_id;
        END IF;
    END LOOP;
    
END $$;

-- Test Case 2: Sales Order Creation → Inventory Reservation
DO $$
DECLARE
    test_inventory_id UUID;
    test_so_id UUID;
    initial_status TEXT;
    final_status TEXT;
BEGIN
    RAISE NOTICE 'Starting Test Case 2: Sales Order Creation → Inventory Reservation';
    
    -- Get an available inventory item
    SELECT inventory_id INTO test_inventory_id
    FROM inventory 
    WHERE status = 'Available'
    LIMIT 1;
    
    IF test_inventory_id IS NULL THEN
        RAISE NOTICE 'SKIP: No available inventory items for testing';
        RETURN;
    END IF;
    
    SELECT status INTO initial_status
    FROM inventory 
    WHERE inventory_id = test_inventory_id;
    
    RAISE NOTICE 'Testing with inventory ID: % (initial status: %)', 
                test_inventory_id, initial_status;
    
    -- Create a test sales order first (assuming we have required data)
    SELECT sales_order_id INTO test_so_id
    FROM sales_orders
    WHERE status = 'Draft'
    LIMIT 1;
    
    IF test_so_id IS NULL THEN
        RAISE NOTICE 'SKIP: No draft sales order available for testing';
        RETURN;
    END IF;
    
    -- Insert a sales order item (this should trigger inventory reservation)
    INSERT INTO sales_order_items (
        sales_order_id,
        line_number,
        inventory_id,
        unit_price
    ) VALUES (
        test_so_id,
        1,
        test_inventory_id,
        100.00
    );
    
    -- Check if inventory status changed to Reserved
    SELECT status INTO final_status
    FROM inventory 
    WHERE inventory_id = test_inventory_id;
    
    IF final_status = 'Reserved' THEN
        RAISE NOTICE 'SUCCESS: Inventory status changed from % to %', 
                    initial_status, final_status;
    ELSE
        RAISE NOTICE 'FAIL: Inventory status should be Reserved but is %', final_status;
    END IF;
    
    -- Clean up: Remove the test sales order item
    DELETE FROM sales_order_items 
    WHERE sales_order_id = test_so_id AND inventory_id = test_inventory_id;
    
END $$;

-- Test Case 3: Sales Order Deletion → Inventory Restoration
DO $$
DECLARE
    test_inventory_id UUID;
    test_so_id UUID;
    test_so_item_id UUID;
    status_before_deletion TEXT;
    status_after_deletion TEXT;
BEGIN
    RAISE NOTICE 'Starting Test Case 3: Sales Order Deletion → Inventory Restoration';
    
    -- Get a reserved inventory item
    SELECT inventory_id INTO test_inventory_id
    FROM inventory 
    WHERE status = 'Reserved'
    LIMIT 1;
    
    IF test_inventory_id IS NULL THEN
        RAISE NOTICE 'SKIP: No reserved inventory items for testing';
        RETURN;
    END IF;
    
    -- Get the sales order that's using this inventory
    SELECT soi.sales_order_id INTO test_so_id
    FROM sales_order_items soi
    WHERE soi.inventory_id = test_inventory_id
    LIMIT 1;
    
    IF test_so_id IS NULL THEN
        RAISE NOTICE 'SKIP: No sales order found for reserved inventory';
        RETURN;
    END IF;
    
    SELECT status INTO status_before_deletion
    FROM inventory 
    WHERE inventory_id = test_inventory_id;
    
    RAISE NOTICE 'Testing inventory restoration with SO ID: % and inventory ID: % (status: %)', 
                test_so_id, test_inventory_id, status_before_deletion;
    
    -- Delete the sales order (this should trigger inventory restoration)
    DELETE FROM sales_orders WHERE sales_order_id = test_so_id;
    
    -- Check if inventory status was restored
    SELECT status INTO status_after_deletion
    FROM inventory 
    WHERE inventory_id = test_inventory_id;
    
    IF status_after_deletion = 'Available' THEN
        RAISE NOTICE 'SUCCESS: Inventory restored from % to %', 
                    status_before_deletion, status_after_deletion;
    ELSE
        RAISE NOTICE 'FAIL: Inventory should be Available but is %', status_after_deletion;
    END IF;
    
END $$;

-- Test Case 4: PO Deletion with Available Inventory
DO $$
DECLARE
    test_po_id UUID;
    test_po_number TEXT;
    inventory_count_before INTEGER;
    inventory_count_after INTEGER;
    sold_items_count INTEGER;
BEGIN
    RAISE NOTICE 'Starting Test Case 4: PO Deletion with Available Inventory';
    
    -- Find a PO with only available inventory items
    SELECT DISTINCT po_id_original INTO test_po_id
    FROM inventory i1
    WHERE status = 'Available'
    AND NOT EXISTS (
        SELECT 1 FROM inventory i2 
        WHERE i2.po_id_original = i1.po_id_original 
        AND i2.status = 'Sold'
    )
    LIMIT 1;
    
    IF test_po_id IS NULL THEN
        RAISE NOTICE 'SKIP: No PO with only available inventory found';
        RETURN;
    END IF;
    
    SELECT po_number INTO test_po_number
    FROM purchase_orders
    WHERE po_id = test_po_id;
    
    -- Count inventory items before deletion
    SELECT COUNT(*) INTO inventory_count_before
    FROM inventory 
    WHERE po_id_original = test_po_id;
    
    RAISE NOTICE 'Testing PO deletion: % (has % inventory items)', 
                test_po_number, inventory_count_before;
    
    -- Check for sold items (should be none)
    SELECT COUNT(*) INTO sold_items_count
    FROM inventory 
    WHERE po_id_original = test_po_id AND status = 'Sold';
    
    IF sold_items_count > 0 THEN
        RAISE NOTICE 'SKIP: PO has sold items, cannot test deletion';
        RETURN;
    END IF;
    
    -- Delete the purchase order (this should cascade to inventory)
    DELETE FROM purchase_orders WHERE po_id = test_po_id;
    
    -- Check if inventory items were deleted
    SELECT COUNT(*) INTO inventory_count_after
    FROM inventory 
    WHERE po_id_original = test_po_id;
    
    IF inventory_count_after = 0 THEN
        RAISE NOTICE 'SUCCESS: PO deletion cascaded to inventory (% → %)', 
                    inventory_count_before, inventory_count_after;
    ELSE
        RAISE NOTICE 'FAIL: Inventory items still exist after PO deletion (%)', 
                    inventory_count_after;
    END IF;
    
END $$;

-- Test Case 5: PO Deletion Prevention with Sold Items
DO $$
DECLARE
    test_po_id UUID;
    test_po_number TEXT;
    sold_items_count INTEGER;
    deletion_prevented BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE 'Starting Test Case 5: PO Deletion Prevention with Sold Items';
    
    -- Find a PO with sold inventory items
    SELECT DISTINCT po_id_original INTO test_po_id
    FROM inventory 
    WHERE status = 'Sold'
    LIMIT 1;
    
    IF test_po_id IS NULL THEN
        RAISE NOTICE 'SKIP: No PO with sold inventory found';
        RETURN;
    END IF;
    
    SELECT po_number INTO test_po_number
    FROM purchase_orders
    WHERE po_id = test_po_id;
    
    SELECT COUNT(*) INTO sold_items_count
    FROM inventory 
    WHERE po_id_original = test_po_id AND status = 'Sold';
    
    RAISE NOTICE 'Testing PO deletion prevention: % (has % sold items)', 
                test_po_number, sold_items_count;
    
    -- Try to delete the purchase order (this should be prevented)
    BEGIN
        DELETE FROM purchase_orders WHERE po_id = test_po_id;
        RAISE NOTICE 'FAIL: PO deletion should have been prevented but succeeded';
    EXCEPTION
        WHEN OTHERS THEN
            deletion_prevented := TRUE;
            RAISE NOTICE 'SUCCESS: PO deletion was correctly prevented (% sold items)', 
                        sold_items_count;
    END;
    
END $$;

-- Test Case 6: Inventory Status Log Audit Trail
DO $$
DECLARE
    test_inventory_id UUID;
    log_count_before INTEGER;
    log_count_after INTEGER;
    latest_log RECORD;
BEGIN
    RAISE NOTICE 'Starting Test Case 6: Inventory Status Log Audit Trail';
    
    -- Get an available inventory item
    SELECT inventory_id INTO test_inventory_id
    FROM inventory 
    WHERE status = 'Available'
    LIMIT 1;
    
    IF test_inventory_id IS NULL THEN
        RAISE NOTICE 'SKIP: No inventory items available for testing';
        RETURN;
    END IF;
    
    -- Count existing logs
    SELECT COUNT(*) INTO log_count_before
    FROM inventory_status_log 
    WHERE inventory_id = test_inventory_id;
    
    RAISE NOTICE 'Testing audit trail for inventory ID: % (existing logs: %)', 
                test_inventory_id, log_count_before;
    
    -- Update inventory status
    UPDATE inventory 
    SET status = 'Under Repair'
    WHERE inventory_id = test_inventory_id;
    
    -- Check if log was created
    SELECT COUNT(*) INTO log_count_after
    FROM inventory_status_log 
    WHERE inventory_id = test_inventory_id;
    
    IF log_count_after > log_count_before THEN
        RAISE NOTICE 'SUCCESS: Audit log created (% → %)', 
                    log_count_before, log_count_after;
        
        -- Get the latest log entry
        SELECT old_status, new_status, changed_at INTO latest_log
        FROM inventory_status_log 
        WHERE inventory_id = test_inventory_id
        ORDER BY changed_at DESC
        LIMIT 1;
        
        RAISE NOTICE 'Latest log: % → % at %', 
                    latest_log.old_status, latest_log.new_status, latest_log.changed_at;
    ELSE
        RAISE NOTICE 'FAIL: No audit log created for status change';
    END IF;
    
    -- Restore original status
    UPDATE inventory 
    SET status = 'Available'
    WHERE inventory_id = test_inventory_id;
    
END $$;

-- Summary Report
DO $$
BEGIN
    RAISE NOTICE '=== INVENTORY LIFECYCLE WORKFLOW TEST SUMMARY ===';
    RAISE NOTICE 'Total inventory items: %', (SELECT COUNT(*) FROM inventory);
    RAISE NOTICE 'Available items: %', (SELECT COUNT(*) FROM inventory WHERE status = 'Available');
    RAISE NOTICE 'Reserved items: %', (SELECT COUNT(*) FROM inventory WHERE status = 'Reserved');
    RAISE NOTICE 'Sold items: %', (SELECT COUNT(*) FROM inventory WHERE status = 'Sold');
    RAISE NOTICE 'Total audit log entries: %', (SELECT COUNT(*) FROM inventory_status_log);
    RAISE NOTICE 'Test completed at: %', NOW();
END $$;