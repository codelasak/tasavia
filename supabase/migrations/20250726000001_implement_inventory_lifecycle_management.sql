-- Implement complete inventory lifecycle management
-- Purpose: Handle PO completion → Inventory creation → Sales Order usage → Proper deletion cascades
-- Author: Claude Code Analysis
-- Date: 2025-07-26

BEGIN;

-- 1. Ensure inventory table has proper status management
DO $$
BEGIN
  -- Add status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory' AND column_name = 'status'
  ) THEN
    ALTER TABLE inventory ADD COLUMN status text DEFAULT 'Available' 
    CHECK (status IN ('Available', 'Reserved', 'Sold', 'Damaged', 'Under Repair'));
  END IF;

  -- Ensure status has proper constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name LIKE '%status%' AND table_name = 'inventory'
  ) THEN
    ALTER TABLE inventory ADD CONSTRAINT inventory_status_check 
    CHECK (status IN ('Available', 'Reserved', 'Sold', 'Damaged', 'Under Repair'));
  END IF;
END $$;

-- 2. Update existing inventory records to have 'Available' status
UPDATE inventory 
SET status = 'Available' 
WHERE status IS NULL;

-- 3. Add proper foreign key constraint for PO deletion cascade
DO $$
BEGIN
  -- Check if constraint exists first
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.referential_constraints
    WHERE constraint_name = 'inventory_po_id_original_cascade_fkey'
  ) THEN
    -- Add the cascade constraint for po_id_original
    ALTER TABLE inventory 
    ADD CONSTRAINT inventory_po_id_original_cascade_fkey 
    FOREIGN KEY (po_id_original) REFERENCES purchase_orders(po_id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- 4. Create function to handle Sales Order item creation (reserve inventory)
CREATE OR REPLACE FUNCTION reserve_inventory_for_sales_order()
RETURNS TRIGGER AS $$
DECLARE
    inventory_record RECORD;
BEGIN
    -- Get the inventory item details
    SELECT inventory_id, status, quantity INTO inventory_record
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
$$ LANGUAGE plpgsql;

-- 5. Create function to handle Sales Order completion (mark inventory as sold)
CREATE OR REPLACE FUNCTION mark_inventory_as_sold()
RETURNS TRIGGER AS $$
BEGIN
    -- If sales order is being marked as completed/delivered
    IF NEW.status IN ('Completed', 'Delivered', 'Invoiced') 
       AND OLD.status NOT IN ('Completed', 'Delivered', 'Invoiced') THEN
        
        -- Mark all inventory items as sold
        UPDATE inventory 
        SET status = 'Sold',
            updated_at = now()
        WHERE inventory_id IN (
            SELECT inventory_id 
            FROM sales_order_items 
            WHERE sales_order_id = NEW.sales_order_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create function to handle Sales Order deletion (restore inventory)
CREATE OR REPLACE FUNCTION restore_inventory_on_sales_order_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Restore inventory items back to Available status
    UPDATE inventory 
    SET status = 'Available',
        updated_at = now()
    WHERE inventory_id IN (
        SELECT inventory_id 
        FROM sales_order_items 
        WHERE sales_order_id = OLD.sales_order_id
    ) AND status IN ('Reserved', 'Sold');
    
    -- Log the restoration for audit purposes
    INSERT INTO inventory_status_log (
        inventory_id,
        old_status,
        new_status,
        reason,
        changed_by,
        changed_at
    )
    SELECT 
        soi.inventory_id,
        i.status,
        'Available',
        'Sales Order Deleted: ' || OLD.sales_order_id,
        current_user,
        now()
    FROM sales_order_items soi
    JOIN inventory i ON i.inventory_id = soi.inventory_id
    WHERE soi.sales_order_id = OLD.sales_order_id
    AND i.status IN ('Reserved', 'Sold');
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 7. Create inventory status log table for audit trail
CREATE TABLE IF NOT EXISTS inventory_status_log (
    log_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    inventory_id uuid NOT NULL REFERENCES inventory(inventory_id) ON DELETE CASCADE,
    old_status text,
    new_status text NOT NULL,
    reason text,
    changed_by text DEFAULT current_user,
    changed_at timestamptz DEFAULT now()
);

-- 8. Create function to log all inventory status changes
CREATE OR REPLACE FUNCTION log_inventory_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO inventory_status_log (
            inventory_id,
            old_status,
            new_status,
            reason,
            changed_by,
            changed_at
        ) VALUES (
            NEW.inventory_id,
            OLD.status,
            NEW.status,
            COALESCE(TG_ARGV[0], 'Manual Update'),
            current_user,
            now()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create all necessary triggers
DO $$
BEGIN
  -- Trigger for Sales Order item creation (reserve inventory)
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'reserve_inventory_on_sales_order_item_insert') THEN
    CREATE TRIGGER reserve_inventory_on_sales_order_item_insert
      AFTER INSERT ON sales_order_items
      FOR EACH ROW
      EXECUTE FUNCTION reserve_inventory_for_sales_order();
  END IF;

  -- Trigger for Sales Order completion (mark inventory as sold)
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'mark_inventory_sold_on_sales_order_completion') THEN
    CREATE TRIGGER mark_inventory_sold_on_sales_order_completion
      AFTER UPDATE ON sales_orders
      FOR EACH ROW
      EXECUTE FUNCTION mark_inventory_as_sold();
  END IF;

  -- Trigger for Sales Order deletion (restore inventory)
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'restore_inventory_on_sales_order_delete') THEN
    CREATE TRIGGER restore_inventory_on_sales_order_delete
      BEFORE DELETE ON sales_orders
      FOR EACH ROW
      EXECUTE FUNCTION restore_inventory_on_sales_order_deletion();
  END IF;

  -- Trigger for inventory status change logging
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'log_inventory_status_changes') THEN
    CREATE TRIGGER log_inventory_status_changes
      AFTER UPDATE ON inventory
      FOR EACH ROW
      EXECUTE FUNCTION log_inventory_status_change();
  END IF;
END $$;

-- 10. Create enhanced function to prevent deletion of completed POs with sold inventory
CREATE OR REPLACE FUNCTION check_po_deletion_constraints()
RETURNS TRIGGER AS $$
DECLARE
    sold_inventory_count integer;
    po_status text;
BEGIN
    -- Get PO status
    SELECT status INTO po_status FROM purchase_orders WHERE po_id = OLD.po_id;
    
    -- Count inventory items that have been sold
    SELECT COUNT(*) INTO sold_inventory_count
    FROM inventory 
    WHERE po_id_original = OLD.po_id 
    AND status = 'Sold';
    
    -- Prevent deletion if there are sold inventory items
    IF sold_inventory_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete Purchase Order %. % inventory items from this PO have been sold and cannot be removed.', 
                       OLD.po_number, sold_inventory_count;
    END IF;
    
    -- Allow deletion but warn about available/reserved inventory
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 11. Add PO deletion constraint trigger
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'check_po_deletion_constraints_trigger') THEN
    CREATE TRIGGER check_po_deletion_constraints_trigger
      BEFORE DELETE ON purchase_orders
      FOR EACH ROW
      EXECUTE FUNCTION check_po_deletion_constraints();
  END IF;
END $$;

-- 12. Update the create_inventory_from_po_completion function to set proper status
CREATE OR REPLACE FUNCTION create_inventory_from_po_completion(po_id_param UUID)
RETURNS TABLE(
    success BOOLEAN,
    created_count INTEGER,
    inventory_ids UUID[],
    error_message TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
    po_record RECORD;
    po_item_record RECORD;
    new_inventory_id UUID;
    created_inventory_count INTEGER := 0;
    inventory_id_array UUID[] := ARRAY[]::UUID[];
    existing_inventory_count INTEGER := 0;
BEGIN
    -- Get PO information
    SELECT po_id, po_number, po_date, status INTO po_record
    FROM purchase_orders 
    WHERE po_id = po_id_param;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0, ARRAY[]::UUID[], 'Purchase order not found: ' || po_id_param::text;
        RETURN;
    END IF;
    
    -- Check if inventory already exists for this PO
    SELECT COUNT(*) INTO existing_inventory_count
    FROM inventory 
    WHERE po_id_original = po_id_param;
    
    IF existing_inventory_count > 0 THEN
        RETURN QUERY SELECT FALSE, 0, ARRAY[]::UUID[], 
                           'Inventory already exists for this PO (' || existing_inventory_count::text || ' items)';
        RETURN;
    END IF;
    
    -- Process each PO item
    FOR po_item_record IN 
        SELECT 
            pi.pn_id,
            pi.quantity,
            pi.unit_price,
            pi.condition,
            pi.sn,
            pi.traceability_source,
            pi.traceable_to,
            pi.last_certified_agency,
            pi.description
        FROM po_items pi
        WHERE pi.po_id = po_id_param
    LOOP
        -- Generate new inventory ID
        new_inventory_id := gen_random_uuid();
        
        -- Insert inventory record with 'Available' status
        INSERT INTO inventory (
            inventory_id,
            pn_id,
            quantity,
            unit_cost,
            condition,
            serial_number,
            po_id_original,
            po_number_original,
            status,
            traceability_source,
            traceable_to,
            last_certified_agency,
            description,
            created_at,
            updated_at
        ) VALUES (
            new_inventory_id,
            po_item_record.pn_id,
            po_item_record.quantity,
            po_item_record.unit_price,
            po_item_record.condition,
            po_item_record.sn,
            po_id_param,
            po_record.po_number,
            'Available',  -- Set initial status as Available
            po_item_record.traceability_source,
            po_item_record.traceable_to,
            po_item_record.last_certified_agency,
            po_item_record.description,
            NOW(),
            NOW()
        );
        
        -- Add to inventory ID array
        inventory_id_array := array_append(inventory_id_array, new_inventory_id);
        created_inventory_count := created_inventory_count + 1;
    END LOOP;
    
    -- Update PO status to Completed
    UPDATE purchase_orders 
    SET status = 'Completed', updated_at = NOW()
    WHERE po_id = po_id_param;
    
    -- Return success
    RETURN QUERY SELECT TRUE, created_inventory_count, inventory_id_array, NULL::TEXT;
    RETURN;
END;
$$;

-- 13. Enable RLS on new table
ALTER TABLE inventory_status_log ENABLE ROW LEVEL SECURITY;

-- 14. Create RLS policies
CREATE POLICY "Users can view inventory status log" 
ON inventory_status_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert inventory status log" 
ON inventory_status_log FOR INSERT TO authenticated WITH CHECK (true);

-- 15. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(status);
CREATE INDEX IF NOT EXISTS idx_inventory_po_id_original ON inventory(po_id_original);
CREATE INDEX IF NOT EXISTS idx_inventory_status_log_inventory_id ON inventory_status_log(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_status_log_changed_at ON inventory_status_log(changed_at);

-- 16. Grant necessary permissions
GRANT EXECUTE ON FUNCTION reserve_inventory_for_sales_order() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION mark_inventory_as_sold() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION restore_inventory_on_sales_order_deletion() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION log_inventory_status_change() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION check_po_deletion_constraints() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION create_inventory_from_po_completion(UUID) TO authenticated, service_role;

COMMIT;

-- Success message
SELECT 
    'Inventory Lifecycle Management migration completed successfully!' as message,
    'Features implemented:' as details,
    '1. Inventory status management (Available → Reserved → Sold)' as feature_1,
    '2. Automatic inventory reservation on Sales Order creation' as feature_2,
    '3. Inventory restoration on Sales Order deletion' as feature_3,
    '4. PO deletion cascade to inventory with sold item protection' as feature_4,
    '5. Complete audit trail with inventory_status_log table' as feature_5;