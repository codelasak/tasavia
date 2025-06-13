/*
  # Create Ship Via Table

  1. New Tables
    - `my_ship_via`
      - `id` (uuid, primary key)
      - `ship_company_name` (text, not null)
      - `owner` (text)
      - `account_no` (text, not null)
      - `ship_model` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on table
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS my_ship_via (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ship_company_name text NOT NULL,
  owner text,
  account_no text NOT NULL,
  ship_model text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE my_ship_via ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage my_ship_via"
  ON my_ship_via
  FOR ALL
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ship_via_company ON my_ship_via(ship_company_name);
CREATE INDEX IF NOT EXISTS idx_ship_via_account ON my_ship_via(account_no);

-- Create update trigger
CREATE TRIGGER update_my_ship_via_updated_at BEFORE UPDATE ON my_ship_via FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();