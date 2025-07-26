-- Fix sales_order_items line_total auto-calculation
-- Purpose: Ensure line_total is calculated automatically to prevent constraint errors

BEGIN;

-- 1. First, let's check if sales_order_items table exists and create/update it properly
DO $$
BEGIN
  -- Ensure sales_order_items table has proper structure
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'sales_order_items'
  ) THEN
    -- Create the table if it doesn't exist
    CREATE TABLE sales_order_items (
      sales_order_item_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      sales_order_id uuid NOT NULL,
      line_number integer NOT NULL,
      inventory_id uuid NOT NULL,
      unit_price decimal(10,2) NOT NULL DEFAULT 0.00,
      line_total decimal(12,2),
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  END IF;

  -- Add line_total column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales_order_items' AND column_name = 'line_total'
  ) THEN
    ALTER TABLE sales_order_items ADD COLUMN line_total decimal(12,2);
  END IF;

  -- Ensure line_total allows NULL (for auto-calculation)
  ALTER TABLE sales_order_items ALTER COLUMN line_total DROP NOT NULL;

END $$;

-- 2. Create function to calculate line_total for sales_order_items
CREATE OR REPLACE FUNCTION calculate_sales_order_line_total()
RETURNS TRIGGER AS $$
DECLARE
    item_quantity integer;
BEGIN
    -- Get quantity from inventory
    SELECT COALESCE(quantity, 1) INTO item_quantity
    FROM inventory 
    WHERE inventory_id = NEW.inventory_id;
    
    -- Calculate line_total = quantity * unit_price
    NEW.line_total := item_quantity * NEW.unit_price;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger to auto-calculate line_total on INSERT and UPDATE
DO $$
BEGIN
  -- Drop existing trigger if it exists
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'calculate_sales_order_line_total_trigger') THEN
    DROP TRIGGER calculate_sales_order_line_total_trigger ON sales_order_items;
  END IF;

  -- Create new trigger
  CREATE TRIGGER calculate_sales_order_line_total_trigger
    BEFORE INSERT OR UPDATE ON sales_order_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_sales_order_line_total();
END $$;

-- 4. Create function to update sales_order totals when items change
CREATE OR REPLACE FUNCTION update_sales_order_totals()
RETURNS TRIGGER AS $$
DECLARE
    so_subtotal decimal(12,2);
    so_vat_amount decimal(12,2);
    so_total decimal(12,2);
    so_vat_pct decimal(5,2);
    so_freight decimal(10,2);
    so_misc decimal(10,2);
BEGIN
    -- Get current sales order details
    SELECT 
        COALESCE(vat_percentage, 0), 
        COALESCE(freight_charge, 0), 
        COALESCE(misc_charge, 0)
    INTO so_vat_pct, so_freight, so_misc
    FROM sales_orders 
    WHERE sales_order_id = COALESCE(NEW.sales_order_id, OLD.sales_order_id);
    
    -- Calculate subtotal from line items
    SELECT COALESCE(SUM(line_total), 0)
    INTO so_subtotal
    FROM sales_order_items 
    WHERE sales_order_id = COALESCE(NEW.sales_order_id, OLD.sales_order_id);
    
    -- Calculate VAT and total
    so_vat_amount := so_subtotal * (so_vat_pct / 100);
    so_total := so_subtotal + so_freight + so_misc + so_vat_amount;
    
    -- Update the sales order
    UPDATE sales_orders 
    SET 
        sub_total = so_subtotal,
        vat_amount = so_vat_amount,
        total_net = so_total,
        updated_at = now()
    WHERE sales_order_id = COALESCE(NEW.sales_order_id, OLD.sales_order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger for automatic sales order total calculation
DO $$
BEGIN
  -- Drop existing trigger if it exists
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_sales_order_totals_on_item_change') THEN
    DROP TRIGGER update_sales_order_totals_on_item_change ON sales_order_items;
  END IF;

  -- Create new trigger
  CREATE TRIGGER update_sales_order_totals_on_item_change
    AFTER INSERT OR UPDATE OR DELETE ON sales_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_order_totals();
END $$;

-- 6. Add foreign key constraints if they don't exist
DO $$
BEGIN
  -- Sales order foreign key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'sales_order_items_sales_order_id_fkey'
  ) THEN
    ALTER TABLE sales_order_items 
    ADD CONSTRAINT sales_order_items_sales_order_id_fkey 
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(sales_order_id) ON DELETE CASCADE;
  END IF;

  -- Inventory foreign key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'sales_order_items_inventory_id_fkey'
  ) THEN
    ALTER TABLE sales_order_items 
    ADD CONSTRAINT sales_order_items_inventory_id_fkey 
    FOREIGN KEY (inventory_id) REFERENCES inventory(inventory_id);
  END IF;
END $$;

-- 7. Create updated_at trigger for sales_order_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_sales_order_items_updated_at') THEN
    CREATE TRIGGER update_sales_order_items_updated_at 
    BEFORE UPDATE ON sales_order_items 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 8. Enable RLS on sales_order_items
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policy for sales_order_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sales_order_items' AND policyname = 'Users can manage sales_order_items') THEN
    CREATE POLICY "Users can manage sales_order_items" ON sales_order_items FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- 10. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_sales_order_items_sales_order_id ON sales_order_items(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_inventory_id ON sales_order_items(inventory_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_line_number ON sales_order_items(sales_order_id, line_number);

-- 11. Update existing records to have proper line_total values
UPDATE sales_order_items 
SET line_total = (
  SELECT (inventory.quantity * sales_order_items.unit_price)
  FROM inventory 
  WHERE inventory.inventory_id = sales_order_items.inventory_id
)
WHERE line_total IS NULL;

COMMIT;

-- Success message
SELECT 
  'Sales Order Items migration completed successfully!' as message,
  'line_total will now be calculated automatically' as details;