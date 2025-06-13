/*
  # Create Inventory Table

  1. New Tables
    - `inventory`
      - `id` (uuid, primary key)
      - `pn_id` (uuid, foreign key to pn_master_table)
      - `serial_number` (text)
      - `condition` (text)
      - `location` (text)
      - `quantity` (integer)
      - `unit_cost` (decimal)
      - `total_value` (decimal, calculated)
      - `last_updated` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on table
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pn_id uuid REFERENCES pn_master_table(id) NOT NULL,
  serial_number text,
  condition text DEFAULT 'New',
  location text,
  quantity integer NOT NULL DEFAULT 0,
  unit_cost decimal(10,2) DEFAULT 0.00,
  total_value decimal(12,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  notes text,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage inventory"
  ON inventory
  FOR ALL
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inventory_pn ON inventory(pn_id);
CREATE INDEX IF NOT EXISTS idx_inventory_location ON inventory(location);
CREATE INDEX IF NOT EXISTS idx_inventory_condition ON inventory(condition);
CREATE INDEX IF NOT EXISTS idx_inventory_sn ON inventory(serial_number);

-- Create update trigger
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update last_updated when quantity or cost changes
CREATE OR REPLACE FUNCTION update_inventory_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.quantity != NEW.quantity OR OLD.unit_cost != NEW.unit_cost) THEN
        NEW.last_updated = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inventory_last_updated_trigger
    BEFORE UPDATE ON inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_last_updated();