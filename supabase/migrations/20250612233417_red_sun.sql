/*
  # Create Companies Tables

  1. New Tables
    - `my_companies`
      - `id` (uuid, primary key)
      - `my_company_name` (text)
      - `my_company_code` (text, unique)
      - `my_company_address` (text)
      - `city` (text)
      - `country` (text)
      - `phone` (text)
      - `email` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `companies` (External vendors/customers)
      - `id` (uuid, primary key)
      - `company_name` (text)
      - `company_code` (text, unique)
      - `address` (text)
      - `city` (text)
      - `country` (text)
      - `phone` (text)
      - `email` (text)
      - `company_type` (text) - vendor, customer, both
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage data
*/

CREATE TABLE IF NOT EXISTS my_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  my_company_name text NOT NULL,
  my_company_code text UNIQUE NOT NULL,
  my_company_address text,
  city text,
  country text,
  phone text,
  email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  company_code text UNIQUE NOT NULL,
  address text,
  city text,
  country text,
  phone text,
  email text,
  company_type text DEFAULT 'vendor' CHECK (company_type IN ('vendor', 'customer', 'both')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE my_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage my_companies"
  ON my_companies
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage companies"
  ON companies
  FOR ALL
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_my_companies_code ON my_companies(my_company_code);
CREATE INDEX IF NOT EXISTS idx_companies_code ON companies(company_code);
CREATE INDEX IF NOT EXISTS idx_companies_type ON companies(company_type);

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_my_companies_updated_at BEFORE UPDATE ON my_companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();