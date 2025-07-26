-- Add ATA 106 completion status tracking to sales_orders table
ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS ata106_completion_status TEXT CHECK (ata106_completion_status IN ('draft', 'partial', 'completed')),
ADD COLUMN IF NOT EXISTS ata106_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ata106_completed_by UUID REFERENCES auth.users(id);

-- Create index for faster queries on completion status
CREATE INDEX IF NOT EXISTS idx_sales_orders_ata106_status ON sales_orders(ata106_completion_status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_ata106_completed_at ON sales_orders(ata106_completed_at);

-- Add trigger to automatically update completion status based on signatures
CREATE OR REPLACE FUNCTION update_ata106_completion_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the sales order's completion status based on signatures
  WITH signature_counts AS (
    SELECT 
      sales_order_id,
      COUNT(*) as total_signatures,
      SUM(CASE WHEN signature_type = 'transferor' THEN 1 ELSE 0 END) as transferor_count,
      SUM(CASE WHEN signature_type = 'transferee' THEN 1 ELSE 0 END) as transferee_count
    FROM ata106_signatures 
    WHERE sales_order_id = COALESCE(NEW.sales_order_id, OLD.sales_order_id)
    GROUP BY sales_order_id
  )
  UPDATE sales_orders 
  SET 
    ata106_completion_status = CASE 
      WHEN sc.transferor_count > 0 AND sc.transferee_count > 0 THEN 'completed'
      WHEN sc.total_signatures > 0 THEN 'partial'
      ELSE 'draft'
    END,
    ata106_completed_at = CASE 
      WHEN sc.transferor_count > 0 AND sc.transferee_count > 0 THEN NOW()
      ELSE NULL
    END,
    ata106_completed_by = CASE 
      WHEN sc.transferor_count > 0 AND sc.transferee_count > 0 THEN NEW.signed_by
      ELSE NULL
    END
  FROM signature_counts sc
  WHERE sales_orders.sales_order_id = sc.sales_order_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to ata106_signatures table
DROP TRIGGER IF EXISTS trigger_update_ata106_completion_status ON ata106_signatures;
CREATE TRIGGER trigger_update_ata106_completion_status
  AFTER INSERT OR UPDATE OR DELETE ON ata106_signatures
  FOR EACH ROW EXECUTE FUNCTION update_ata106_completion_status();