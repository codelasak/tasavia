-- Database Schema Update for TASAVIA Dashboard
-- Run these commands in your Supabase SQL Editor

-- 1. Update my_companies table
DO $$
BEGIN
  -- Add id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'my_companies' AND column_name = 'id'
  ) THEN
    ALTER TABLE my_companies ADD COLUMN id uuid DEFAULT gen_random_uuid();
    UPDATE my_companies SET id = my_company_id WHERE id IS NULL;
    ALTER TABLE my_companies ALTER COLUMN id SET NOT NULL;
  END IF;
END $$;

-- 2. Update companies table
DO $$
BEGIN
  -- Add id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'id'
  ) THEN
    ALTER TABLE companies ADD COLUMN id uuid DEFAULT gen_random_uuid();
    UPDATE companies SET id = company_id WHERE id IS NULL;
    ALTER TABLE companies ALTER COLUMN id SET NOT NULL;
  END IF;
  
  -- Add company_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'company_type'
  ) THEN
    ALTER TABLE companies ADD COLUMN company_type text DEFAULT 'vendor' CHECK (company_type IN ('vendor', 'customer', 'both'));
  END IF;
END $$;

-- 3. Update pn_master_table
DO $$
BEGIN
  -- Add id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pn_master_table' AND column_name = 'id'
  ) THEN
    ALTER TABLE pn_master_table ADD COLUMN id uuid DEFAULT gen_random_uuid();
    UPDATE pn_master_table SET id = pn_id WHERE id IS NULL;
    ALTER TABLE pn_master_table ALTER COLUMN id SET NOT NULL;
  END IF;
END $$;

-- 4. Update my_ship_via table
DO $$
BEGIN
  -- Add id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'my_ship_via' AND column_name = 'id'
  ) THEN
    ALTER TABLE my_ship_via ADD COLUMN id uuid DEFAULT gen_random_uuid();
    UPDATE my_ship_via SET id = ship_via_id WHERE id IS NULL;
    ALTER TABLE my_ship_via ALTER COLUMN id SET NOT NULL;
  END IF;
END $$;

-- 5. Update purchase_orders table
DO $$
BEGIN
  -- Add id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' AND column_name = 'id'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN id uuid DEFAULT gen_random_uuid();
    UPDATE purchase_orders SET id = po_id WHERE id IS NULL;
    ALTER TABLE purchase_orders ALTER COLUMN id SET NOT NULL;
  END IF;
  
  -- Add missing columns for ship-to address
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' AND column_name = 'ship_to_company_name'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN ship_to_company_name text;
    ALTER TABLE purchase_orders ADD COLUMN ship_to_address_details text;
    ALTER TABLE purchase_orders ADD COLUMN ship_to_contact_name text;
    ALTER TABLE purchase_orders ADD COLUMN ship_to_contact_phone text;
    ALTER TABLE purchase_orders ADD COLUMN ship_to_contact_email text;
  END IF;
  
  -- Add missing cost columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' AND column_name = 'freight_charge'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN freight_charge decimal(10,2) DEFAULT 0.00;
    ALTER TABLE purchase_orders ADD COLUMN misc_charge decimal(10,2) DEFAULT 0.00;
    ALTER TABLE purchase_orders ADD COLUMN vat_percentage decimal(5,2) DEFAULT 0.00;
    ALTER TABLE purchase_orders ADD COLUMN subtotal decimal(12,2) DEFAULT 0.00;
  END IF;
END $$;

-- 6. Update po_items table
DO $$
BEGIN
  -- Add id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'po_items' AND column_name = 'id'
  ) THEN
    ALTER TABLE po_items ADD COLUMN id uuid DEFAULT gen_random_uuid();
    UPDATE po_items SET id = po_item_id WHERE id IS NULL;
    ALTER TABLE po_items ALTER COLUMN id SET NOT NULL;
  END IF;
  
  -- Add line_number column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'po_items' AND column_name = 'line_number'
  ) THEN
    ALTER TABLE po_items ADD COLUMN line_number integer;
    -- Set line numbers based on creation order
    WITH numbered_items AS (
      SELECT po_item_id, ROW_NUMBER() OVER (PARTITION BY po_id ORDER BY created_at) as line_num
      FROM po_items
    )
    UPDATE po_items 
    SET line_number = numbered_items.line_num
    FROM numbered_items 
    WHERE po_items.po_item_id = numbered_items.po_item_id;
    
    ALTER TABLE po_items ALTER COLUMN line_number SET NOT NULL;
  END IF;
  
  -- Rename description_override to description if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'po_items' AND column_name = 'description_override'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'po_items' AND column_name = 'description'
  ) THEN
    ALTER TABLE po_items RENAME COLUMN description_override TO description;
  END IF;
END $$;

-- 7. Update inventory table
DO $$
BEGIN
  -- Add id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory' AND column_name = 'id'
  ) THEN
    ALTER TABLE inventory ADD COLUMN id uuid DEFAULT gen_random_uuid();
    UPDATE inventory SET id = inventory_id WHERE id IS NULL;
    ALTER TABLE inventory ALTER COLUMN id SET NOT NULL;
  END IF;
  
  -- Add missing columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory' AND column_name = 'condition'
  ) THEN
    ALTER TABLE inventory ADD COLUMN condition text DEFAULT 'New';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory' AND column_name = 'quantity'
  ) THEN
    ALTER TABLE inventory ADD COLUMN quantity integer DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory' AND column_name = 'unit_cost'
  ) THEN
    ALTER TABLE inventory ADD COLUMN unit_cost decimal(10,2) DEFAULT 0.00;
    -- Copy po_price to unit_cost if po_price exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'inventory' AND column_name = 'po_price'
    ) THEN
      UPDATE inventory SET unit_cost = COALESCE(po_price, 0.00);
    END IF;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory' AND column_name = 'total_value'
  ) THEN
    ALTER TABLE inventory ADD COLUMN total_value decimal(12,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory' AND column_name = 'notes'
  ) THEN
    ALTER TABLE inventory ADD COLUMN notes text;
    -- Copy remarks to notes if remarks exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'inventory' AND column_name = 'remarks'
    ) THEN
      UPDATE inventory SET notes = remarks;
    END IF;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory' AND column_name = 'last_updated'
  ) THEN
    ALTER TABLE inventory ADD COLUMN last_updated timestamptz DEFAULT now();
  END IF;
  
  -- Rename sn to serial_number if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory' AND column_name = 'sn'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory' AND column_name = 'serial_number'
  ) THEN
    ALTER TABLE inventory RENAME COLUMN sn TO serial_number;
  END IF;
END $$;

-- 8. Enable Row Level Security on all tables
ALTER TABLE my_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE pn_master_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE my_ship_via ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies (these will be created only if they don't exist)
DO $$
BEGIN
  -- my_companies policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'my_companies' AND policyname = 'Users can manage my_companies') THEN
    CREATE POLICY "Users can manage my_companies" ON my_companies FOR ALL TO authenticated USING (true);
  END IF;
  
  -- companies policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'Users can manage companies') THEN
    CREATE POLICY "Users can manage companies" ON companies FOR ALL TO authenticated USING (true);
  END IF;
  
  -- pn_master_table policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pn_master_table' AND policyname = 'Users can manage pn_master_table') THEN
    CREATE POLICY "Users can manage pn_master_table" ON pn_master_table FOR ALL TO authenticated USING (true);
  END IF;
  
  -- my_ship_via policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'my_ship_via' AND policyname = 'Users can manage my_ship_via') THEN
    CREATE POLICY "Users can manage my_ship_via" ON my_ship_via FOR ALL TO authenticated USING (true);
  END IF;
  
  -- purchase_orders policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_orders' AND policyname = 'Users can manage purchase_orders') THEN
    CREATE POLICY "Users can manage purchase_orders" ON purchase_orders FOR ALL TO authenticated USING (true);
  END IF;
  
  -- po_items policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'po_items' AND policyname = 'Users can manage po_items') THEN
    CREATE POLICY "Users can manage po_items" ON po_items FOR ALL TO authenticated USING (true);
  END IF;
  
  -- inventory policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory' AND policyname = 'Users can manage inventory') THEN
    CREATE POLICY "Users can manage inventory" ON inventory FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- 10. Create update trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 11. Create update triggers for updated_at columns
DO $$
BEGIN
  -- Only create triggers if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_my_companies_updated_at') THEN
    CREATE TRIGGER update_my_companies_updated_at BEFORE UPDATE ON my_companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_companies_updated_at') THEN
    CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_pn_master_updated_at') THEN
    CREATE TRIGGER update_pn_master_updated_at BEFORE UPDATE ON pn_master_table FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_my_ship_via_updated_at') THEN
    CREATE TRIGGER update_my_ship_via_updated_at BEFORE UPDATE ON my_ship_via FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_purchase_orders_updated_at') THEN
    CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_po_items_updated_at') THEN
    CREATE TRIGGER update_po_items_updated_at BEFORE UPDATE ON po_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_inventory_updated_at') THEN
    CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 12. Create inventory last_updated trigger
CREATE OR REPLACE FUNCTION update_inventory_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.quantity != NEW.quantity OR OLD.unit_cost != NEW.unit_cost) THEN
        NEW.last_updated = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_inventory_last_updated_trigger') THEN
    CREATE TRIGGER update_inventory_last_updated_trigger
      BEFORE UPDATE ON inventory
      FOR EACH ROW
      EXECUTE FUNCTION update_inventory_last_updated();
  END IF;
END $$;

-- 13. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_my_companies_code ON my_companies(my_company_code);
CREATE INDEX IF NOT EXISTS idx_companies_code ON companies(company_code);
CREATE INDEX IF NOT EXISTS idx_companies_type ON companies(company_type);
CREATE INDEX IF NOT EXISTS idx_pn_master_pn ON pn_master_table(pn);
CREATE INDEX IF NOT EXISTS idx_ship_via_company ON my_ship_via(ship_company_name);
CREATE INDEX IF NOT EXISTS idx_ship_via_account ON my_ship_via(account_no);
CREATE INDEX IF NOT EXISTS idx_po_number ON purchase_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_po_date ON purchase_orders(po_date);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_items_po_id ON po_items(po_id);
CREATE INDEX IF NOT EXISTS idx_po_items_pn ON po_items(pn_id);
CREATE INDEX IF NOT EXISTS idx_inventory_pn ON inventory(pn_id);
CREATE INDEX IF NOT EXISTS idx_inventory_location ON inventory(location);
CREATE INDEX IF NOT EXISTS idx_inventory_condition ON inventory(condition);
CREATE INDEX IF NOT EXISTS idx_inventory_sn ON inventory(serial_number);

-- 14. Update foreign key references to use new id columns
DO $$
BEGIN
  -- Update purchase_orders foreign keys
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'purchase_orders_my_company_id_fkey'
  ) THEN
    ALTER TABLE purchase_orders DROP CONSTRAINT purchase_orders_my_company_id_fkey;
    ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_my_company_id_fkey 
      FOREIGN KEY (my_company_id) REFERENCES my_companies(id);
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'purchase_orders_vendor_company_id_fkey'
  ) THEN
    ALTER TABLE purchase_orders DROP CONSTRAINT purchase_orders_vendor_company_id_fkey;
    ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_vendor_company_id_fkey 
      FOREIGN KEY (vendor_company_id) REFERENCES companies(id);
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'purchase_orders_ship_via_id_fkey'
  ) THEN
    ALTER TABLE purchase_orders DROP CONSTRAINT purchase_orders_ship_via_id_fkey;
    ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_ship_via_id_fkey 
      FOREIGN KEY (ship_via_id) REFERENCES my_ship_via(id);
  END IF;
  
  -- Update po_items foreign keys
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'po_items_po_id_fkey'
  ) THEN
    ALTER TABLE po_items DROP CONSTRAINT po_items_po_id_fkey;
    ALTER TABLE po_items ADD CONSTRAINT po_items_po_id_fkey 
      FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'po_items_pn_id_fkey'
  ) THEN
    ALTER TABLE po_items DROP CONSTRAINT po_items_pn_id_fkey;
    ALTER TABLE po_items ADD CONSTRAINT po_items_pn_id_fkey 
      FOREIGN KEY (pn_id) REFERENCES pn_master_table(id);
  END IF;
  
  -- Update inventory foreign keys
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'inventory_pn_id_fkey'
  ) THEN
    ALTER TABLE inventory DROP CONSTRAINT inventory_pn_id_fkey;
    ALTER TABLE inventory ADD CONSTRAINT inventory_pn_id_fkey 
      FOREIGN KEY (pn_id) REFERENCES pn_master_table(id);
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'inventory_po_id_original_fkey'
  ) THEN
    ALTER TABLE inventory DROP CONSTRAINT inventory_po_id_original_fkey;
    ALTER TABLE inventory ADD CONSTRAINT inventory_po_id_original_fkey 
      FOREIGN KEY (po_id_original) REFERENCES purchase_orders(id);
  END IF;
END $$;

-- 15. Create PO number generation function and sequence
CREATE SEQUENCE IF NOT EXISTS po_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS text AS $$
DECLARE
    current_year text;
    next_val integer;
    po_num text;
BEGIN
    current_year := to_char(now(), 'YY');
    next_val := nextval('po_number_seq');
    po_num := 'P' || current_year || lpad(next_val::text, 3, '0');
    
    -- Check if PO number already exists, if so increment
    WHILE EXISTS (SELECT 1 FROM purchase_orders WHERE po_number = po_num) LOOP
        next_val := nextval('po_number_seq');
        po_num := 'P' || current_year || lpad(next_val::text, 3, '0');
    END LOOP;
    
    RETURN po_num;
END;
$$ LANGUAGE plpgsql;

-- 16. Function to update PO totals
CREATE OR REPLACE FUNCTION update_po_totals()
RETURNS TRIGGER AS $$
DECLARE
    po_subtotal decimal(12,2);
    po_vat_amount decimal(12,2);
    po_total decimal(12,2);
    po_vat_pct decimal(5,2);
    po_freight decimal(10,2);
    po_misc decimal(10,2);
BEGIN
    -- Get current PO details
    SELECT vat_percentage, freight_charge, misc_charge
    INTO po_vat_pct, po_freight, po_misc
    FROM purchase_orders 
    WHERE id = COALESCE(NEW.po_id, OLD.po_id);
    
    -- Calculate subtotal from line items
    SELECT COALESCE(SUM(line_total), 0)
    INTO po_subtotal
    FROM po_items 
    WHERE po_id = COALESCE(NEW.po_id, OLD.po_id);
    
    -- Calculate VAT and total
    po_vat_amount := po_subtotal * (po_vat_pct / 100);
    po_total := po_subtotal + po_freight + po_misc + po_vat_amount;
    
    -- Update the PO
    UPDATE purchase_orders 
    SET 
        subtotal = po_subtotal,
        total_amount = po_total,
        updated_at = now()
    WHERE id = COALESCE(NEW.po_id, OLD.po_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic total calculation
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_po_totals_on_item_change') THEN
    CREATE TRIGGER update_po_totals_on_item_change
      AFTER INSERT OR UPDATE OR DELETE ON po_items
      FOR EACH ROW
      EXECUTE FUNCTION update_po_totals();
  END IF;
END $$;

-- Success message
SELECT 'Database schema updated successfully! All tables now have the required columns and structure.' as result;