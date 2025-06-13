/*
  # Create PN Master Table

  1. New Tables
    - `pn_master_table`
      - `id` (uuid, primary key)
      - `pn` (text, unique, not null)
      - `description` (text)
      - `remarks` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on table
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS pn_master_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pn text UNIQUE NOT NULL,
  description text,
  remarks text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE pn_master_table ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage pn_master_table"
  ON pn_master_table
  FOR ALL
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pn_master_pn ON pn_master_table(pn);
CREATE INDEX IF NOT EXISTS idx_pn_master_description ON pn_master_table USING gin(to_tsvector('english', description));

-- Create update trigger
CREATE TRIGGER update_pn_master_updated_at BEFORE UPDATE ON pn_master_table FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();