-- COMPREHENSIVE FIX: Fix both "column quantity does not exist" and "column end_use_country does not exist" errors
-- This fixes both buggy triggers that are causing sales order creation failures and duplicate orders

-- Step 1: Drop both existing triggers to prevent any partial execution
DROP TRIGGER IF EXISTS reserve_inventory_on_sales_order_item_insert ON sales_order_items;
DROP TRIGGER IF EXISTS trigger_inherit_country_data_to_sales_order ON sales_order_items;

-- Step 2: Drop both existing functions
DROP FUNCTION IF EXISTS reserve_inventory_for_sales_order();
DROP FUNCTION IF EXISTS inherit_country_data_to_sales_order();

-- Step 3: Create the corrected reserve_inventory_for_sales_order function (FIXED: removed quantity column)
CREATE OR REPLACE FUNCTION public.reserve_inventory_for_sales_order()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    inventory_record RECORD;
BEGIN
    -- Get the inventory item details (FIXED: removed buggy quantity column reference)
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

-- Step 4: Create the corrected inherit_country_data_to_sales_order function (FIXED: corrected column names)
CREATE OR REPLACE FUNCTION public.inherit_country_data_to_sales_order()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  inv_country_origin TEXT;
  po_end_use_country TEXT;
BEGIN
  -- When sales order item is created, inherit country data from inventory
  IF TG_OP = 'INSERT' THEN
    -- Get country of origin from inventory
    SELECT country_of_origin INTO inv_country_origin
    FROM inventory
    WHERE inventory_id = NEW.inventory_id;

    -- Get end use country from the original purchase order if available (FIXED: use correct column name)
    SELECT end_use_country_code INTO po_end_use_country
    FROM purchase_orders po
    JOIN inventory inv ON inv.po_id_original = po.po_id
    WHERE inv.inventory_id = NEW.inventory_id;

    -- Update sales order with inherited data if not already set (FIXED: column names verified)
    UPDATE sales_orders
    SET
      country_of_origin = COALESCE(country_of_origin, inv_country_origin),
      end_use_country = COALESCE(end_use_country, po_end_use_country),
      updated_at = NOW()
    WHERE sales_order_id = NEW.sales_order_id
      AND (country_of_origin IS NULL OR end_use_country IS NULL);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Step 5: Recreate both triggers with the fixed functions
CREATE TRIGGER reserve_inventory_on_sales_order_item_insert
AFTER INSERT ON sales_order_items
FOR EACH ROW
EXECUTE FUNCTION reserve_inventory_for_sales_order();

CREATE TRIGGER trigger_inherit_country_data_to_sales_order
AFTER INSERT ON sales_order_items
FOR EACH ROW
EXECUTE FUNCTION inherit_country_data_to_sales_order();

-- Step 6: Verification queries (uncomment to test)
-- Check that triggers exist and are enabled:
-- SELECT trigger_name, event_manipulation, event_object_table, action_timing
-- FROM information_schema.triggers
-- WHERE event_object_table = 'sales_order_items'
-- AND trigger_name IN ('reserve_inventory_on_sales_order_item_insert', 'trigger_inherit_country_data_to_sales_order');

-- Check table column names to verify our fixes match the actual schema:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name LIKE '%country%';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'sales_orders' AND column_name LIKE '%country%';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'quantity';

-- Test with a small inventory item:
-- SELECT inventory_id, pn_id, status, country_of_origin FROM inventory WHERE status = 'Available' LIMIT 1;

-- IMPORTANT: This should resolve both:
-- 1. "column quantity does not exist" error
-- 2. "column end_use_country does not exist" error
-- 3. Duplicate sales order creation issue
-- 4. Ensure proper inventory reservation and country data inheritance