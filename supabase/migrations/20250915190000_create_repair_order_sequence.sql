-- Update existing sequence to start from 510 to match the desired format R25510
UPDATE repair_order_sequence
SET next_sequence_number = 510,
    updated_at = NOW()
WHERE year = 2025;

-- Create function to generate repair order numbers (if it doesn't exist)
CREATE OR REPLACE FUNCTION generate_repair_order_number()
RETURNS TEXT AS $$
DECLARE
  v_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  v_next_number INTEGER;
  v_formatted_number TEXT;
BEGIN
  -- Get or create sequence for current year
  INSERT INTO repair_order_sequence (year, next_sequence_number)
  VALUES (v_year, 1)
  ON CONFLICT (year) DO UPDATE
  SET next_sequence_number = repair_order_sequence.next_sequence_number + 1
  RETURNING next_sequence_number INTO v_next_number;

  -- Format as RYYXXX (e.g., R25001)
  v_formatted_number := 'R' || RIGHT(v_year::TEXT, 2) || LPAD(v_next_number::TEXT, 3, '0');

  RETURN v_formatted_number;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically assign repair order numbers
CREATE OR REPLACE FUNCTION assign_repair_order_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Only assign number if it's null or empty
  IF NEW.repair_order_number IS NULL OR TRIM(NEW.repair_order_number) = '' THEN
    NEW.repair_order_number := generate_repair_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and recreate it
DROP TRIGGER IF EXISTS trigger_assign_repair_order_number ON repair_orders;

CREATE TRIGGER trigger_assign_repair_order_number
BEFORE INSERT ON repair_orders
FOR EACH ROW
EXECUTE FUNCTION assign_repair_order_number();

-- Update existing repair orders to use new numbering format
UPDATE repair_orders
SET repair_order_number = generate_repair_order_number()
WHERE repair_order_id = 'aa232840-96d0-4252-bb95-ef2adee506b9'
OR repair_order_number IS NULL
OR TRIM(repair_order_number) = '';