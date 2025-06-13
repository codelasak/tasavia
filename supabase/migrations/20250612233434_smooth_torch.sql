/*
  # Create Purchase Orders Tables

  1. New Tables
    - `purchase_orders` (PO Header)
      - All fields as per PRD requirements including ship-to address fields
      - Auto-generated PO numbers with format P<YY><sequence>
    
    - `po_items` (PO Line Items)
      - Line items with all required fields
      - Auto-calculated line totals

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users

  3. Functions
    - Auto-generate PO numbers
    - Calculate totals
*/

-- Create sequence for PO numbers
CREATE SEQUENCE IF NOT EXISTS po_number_seq START 1;

-- Function to generate PO number
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

CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text UNIQUE NOT NULL DEFAULT generate_po_number(),
  my_company_id uuid REFERENCES my_companies(id) NOT NULL,
  vendor_company_id uuid REFERENCES companies(id) NOT NULL,
  po_date date NOT NULL DEFAULT CURRENT_DATE,
  ship_to_company_name text,
  ship_to_address_details text,
  ship_to_contact_name text,
  ship_to_contact_phone text,
  ship_to_contact_email text,
  prepared_by_name text NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  ship_via_id uuid REFERENCES my_ship_via(id),
  payment_term text,
  remarks_1 text,
  freight_charge decimal(10,2) DEFAULT 0.00,
  misc_charge decimal(10,2) DEFAULT 0.00,
  vat_percentage decimal(5,2) DEFAULT 0.00,
  subtotal decimal(12,2) DEFAULT 0.00,
  total_amount decimal(12,2) DEFAULT 0.00,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Acknowledged', 'Completed', 'Cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS po_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
  line_number integer NOT NULL,
  pn_id uuid REFERENCES pn_master_table(id),
  description text,
  sn text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL DEFAULT 0.00,
  condition text,
  line_total decimal(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(po_id, line_number)
);

-- Enable RLS
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage purchase_orders"
  ON purchase_orders
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage po_items"
  ON po_items
  FOR ALL
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_po_number ON purchase_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_po_company ON purchase_orders(my_company_id, vendor_company_id);
CREATE INDEX IF NOT EXISTS idx_po_date ON purchase_orders(po_date);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_items_po_id ON po_items(po_id);
CREATE INDEX IF NOT EXISTS idx_po_items_pn ON po_items(pn_id);

-- Function to update PO totals
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

-- Create triggers for automatic total calculation
CREATE TRIGGER update_po_totals_on_item_change
    AFTER INSERT OR UPDATE OR DELETE ON po_items
    FOR EACH ROW
    EXECUTE FUNCTION update_po_totals();

-- Create update triggers
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_po_items_updated_at BEFORE UPDATE ON po_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();