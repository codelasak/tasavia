-- Fix for "column quantity does not exist" error in sales order creation
-- This fixes the buggy reserve_inventory_for_sales_order trigger function

-- Step 1: Drop the existing trigger (if it exists)
DROP TRIGGER IF EXISTS reserve_inventory_on_sales_order_item_insert ON sales_order_items;

-- Step 2: Drop the existing function (if it exists)
DROP FUNCTION IF EXISTS reserve_inventory_for_sales_order();

-- Step 3: Create the corrected function without the buggy quantity column reference
CREATE OR REPLACE FUNCTION public.reserve_inventory_for_sales_order()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    inventory_record RECORD;
BEGIN
    -- Get the inventory item details (FIXED: removed quantity column)
    SELECT inventory_id, status INTO inventory_record
    FROM inventory
    WHERE inventory_id = NEW.inventory_id;

    -- Check if inventory exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Inventory item not found: %', NEW.inventory_id;
    END IF;

    -- Check if inventory is available
    IF inventory_record.status != 'Available' THEN
        RAISE EXCEPTION 'Inventory item % is not available (current status: %)',
                       NEW.inventory_id, inventory_record.status;
    END IF;

    -- Reserve the inventory item
    UPDATE inventory
    SET status = 'Reserved',
        updated_at = now()
    WHERE inventory_id = NEW.inventory_id;

    RETURN NEW;
END;
$function$;

-- Step 4: Recreate the trigger with the fixed function
CREATE TRIGGER reserve_inventory_on_sales_order_item_insert
AFTER INSERT ON sales_order_items
FOR EACH ROW
EXECUTE FUNCTION reserve_inventory_for_sales_order();

-- Step 5: Verify the trigger is working correctly
-- You can test this by creating a sales order and checking:
-- 1. No "column quantity does not exist" error should occur
-- 2. The inventory item status should change to 'Reserved' after successful sales order creation
-- 3. The sales order should be created with all line items intact

-- Optional: Check current inventory items to verify their status
-- SELECT inventory_id, pn_id, status, business_status FROM inventory WHERE status = 'Available';

-- Optional: Check if trigger exists and is enabled
-- SELECT trigger_name, event_manipulation, event_object_table, action_timing
-- FROM information_schema.triggers
-- WHERE event_object_table = 'sales_order_items' AND trigger_name = 'reserve_inventory_on_sales_order_item_insert';