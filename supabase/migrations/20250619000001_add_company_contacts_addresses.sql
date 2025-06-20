-- Create company_contacts table for external company contacts (if it doesn't exist)
CREATE TABLE IF NOT EXISTS company_contacts (
  contact_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  title TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create company_addresses table for external company addresses (if it doesn't exist)
CREATE TABLE IF NOT EXISTS company_addresses (
  address_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  address_type TEXT NOT NULL DEFAULT 'main', -- 'main', 'billing', 'shipping', etc.
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_company_contacts_company_id ON company_contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_company_contacts_is_primary ON company_contacts(company_id, is_primary) WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_company_addresses_company_id ON company_addresses(company_id);
CREATE INDEX IF NOT EXISTS idx_company_addresses_is_primary ON company_addresses(company_id, is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_company_addresses_type ON company_addresses(company_id, address_type);

-- Add RLS policies for company_contacts
DO $$ 
BEGIN
  -- Enable RLS if not already enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_class 
    WHERE relname = 'company_contacts' AND relrowsecurity = true
  ) THEN
    ALTER TABLE company_contacts ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Create policies if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'company_contacts' AND policyname = 'Users can view company contacts') THEN
    CREATE POLICY "Users can view company contacts" ON company_contacts FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'company_contacts' AND policyname = 'Users can insert company contacts') THEN
    CREATE POLICY "Users can insert company contacts" ON company_contacts FOR INSERT WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'company_contacts' AND policyname = 'Users can update company contacts') THEN
    CREATE POLICY "Users can update company contacts" ON company_contacts FOR UPDATE USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'company_contacts' AND policyname = 'Users can delete company contacts') THEN
    CREATE POLICY "Users can delete company contacts" ON company_contacts FOR DELETE USING (true);
  END IF;
END $$;

-- Add RLS policies for company_addresses
DO $$ 
BEGIN
  -- Enable RLS if not already enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_class 
    WHERE relname = 'company_addresses' AND relrowsecurity = true
  ) THEN
    ALTER TABLE company_addresses ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Create policies if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'company_addresses' AND policyname = 'Users can view company addresses') THEN
    CREATE POLICY "Users can view company addresses" ON company_addresses FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'company_addresses' AND policyname = 'Users can insert company addresses') THEN
    CREATE POLICY "Users can insert company addresses" ON company_addresses FOR INSERT WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'company_addresses' AND policyname = 'Users can update company addresses') THEN
    CREATE POLICY "Users can update company addresses" ON company_addresses FOR UPDATE USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'company_addresses' AND policyname = 'Users can delete company addresses') THEN
    CREATE POLICY "Users can delete company addresses" ON company_addresses FOR DELETE USING (true);
  END IF;
END $$;

-- Migrate existing company data to new tables (only if data doesn't already exist)
DO $$
BEGIN
  -- Insert existing contact information as primary contacts (if not already migrated)
  IF NOT EXISTS (SELECT 1 FROM company_contacts LIMIT 1) THEN
    INSERT INTO company_contacts (company_id, contact_name, email, phone, is_primary)
    SELECT 
      company_id,
      COALESCE(contact_name, 'Main Contact') as contact_name,
      email,
      phone,
      true as is_primary
    FROM companies 
    WHERE contact_name IS NOT NULL OR email IS NOT NULL OR phone IS NOT NULL;
  END IF;

  -- Insert existing address information as primary addresses (if not already migrated)
  IF NOT EXISTS (SELECT 1 FROM company_addresses LIMIT 1) THEN
    INSERT INTO company_addresses (company_id, address_type, address, city, zip_code, country, is_primary)
    SELECT 
      company_id,
      'main' as address_type,
      COALESCE(address, '') as address,
      city,
      zip_code,
      country,
      true as is_primary
    FROM companies 
    WHERE address IS NOT NULL OR city IS NOT NULL OR country IS NOT NULL;
  END IF;
END $$;