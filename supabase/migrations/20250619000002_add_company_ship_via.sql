-- Add company_ship_via table and update purchase_orders foreign key

CREATE TABLE IF NOT EXISTS company_ship_via (
  ship_via_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  ship_company_name TEXT NOT NULL,
  account_no TEXT NOT NULL,
  owner TEXT,
  ship_model TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for faster lookup
CREATE INDEX IF NOT EXISTS idx_company_ship_via_company ON company_ship_via(company_id);
CREATE INDEX IF NOT EXISTS idx_company_ship_via_company_name ON company_ship_via(ship_company_name);
CREATE INDEX IF NOT EXISTS idx_company_ship_via_account ON company_ship_via(account_no);

-- Update trigger for updated_at
CREATE TRIGGER update_company_ship_via_updated_at
BEFORE UPDATE ON company_ship_via
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS and policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'company_ship_via' AND relrowsecurity = true
  ) THEN
    ALTER TABLE company_ship_via ENABLE ROW LEVEL SECURITY;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'company_ship_via' AND policyname = 'Enable all operations for authenticated users on company_ship_via'
  ) THEN
    CREATE POLICY "Enable all operations for authenticated users on company_ship_via" ON company_ship_via
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'company_ship_via' AND policyname = 'Enable all operations for anonymous users on company_ship_via'
  ) THEN
    CREATE POLICY "Enable all operations for anonymous users on company_ship_via" ON company_ship_via
      FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Update purchase_orders foreign key to reference company_ship_via
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'purchase_orders_ship_via_id_new_fkey'
  ) THEN
    ALTER TABLE purchase_orders DROP CONSTRAINT purchase_orders_ship_via_id_new_fkey;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'purchase_orders_ship_via_id_fkey'
  ) THEN
    ALTER TABLE purchase_orders DROP CONSTRAINT purchase_orders_ship_via_id_fkey;
  END IF;
  ALTER TABLE purchase_orders
    ADD CONSTRAINT purchase_orders_ship_via_id_fkey
      FOREIGN KEY (ship_via_id) REFERENCES company_ship_via(ship_via_id);
END $$;
