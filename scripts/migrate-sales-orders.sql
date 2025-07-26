-- Sales Orders Data Migration Script
-- Purpose: Update existing sales orders with new schema fields and default values
-- Run this script after applying the schema migrations

-- Begin transaction for data safety
BEGIN;

-- Update existing sales orders with default values for new fields
UPDATE sales_orders 
SET 
  reference_number = CASE 
    WHEN reference_number IS NULL THEN 'REF-' || EXTRACT(YEAR FROM COALESCE(sales_date, created_at)) || '-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::text, 4, '0')
    ELSE reference_number 
  END,
  contract_number = NULL, -- Leave as optional
  country_of_origin = NULL, -- Leave as optional
  end_use_country = NULL, -- Leave as optional
  freight_charge = COALESCE(freight_charge, 0.00),
  misc_charge = COALESCE(misc_charge, 0.00),
  vat_percentage = COALESCE(vat_percentage, 0.00),
  vat_amount = COALESCE(vat_amount, 0.00),
  updated_at = NOW()
WHERE 
  reference_number IS NULL 
  OR freight_charge IS NULL 
  OR misc_charge IS NULL 
  OR vat_percentage IS NULL 
  OR vat_amount IS NULL;

-- Update inventory items with enhanced traceability defaults
UPDATE inventory 
SET 
  application_code = CASE 
    WHEN application_code IS NULL AND condition = 'SVC' THEN 'GEN-APP'
    WHEN application_code IS NULL AND condition = 'OHC' THEN 'CERT-APP'
    ELSE application_code
  END,
  dimensions = CASE 
    WHEN dimensions IS NULL THEN 'N/S'
    ELSE dimensions
  END,
  weight = CASE 
    WHEN weight IS NULL AND condition IN ('SVC', 'OHC', 'AR') THEN 1.0
    ELSE weight
  END,
  country_of_origin = CASE 
    WHEN country_of_origin IS NULL THEN 'United States'
    ELSE country_of_origin
  END,
  updated_at = NOW()
WHERE 
  application_code IS NULL 
  OR dimensions IS NULL 
  OR weight IS NULL 
  OR country_of_origin IS NULL;

-- Create sample company bank details for existing companies
INSERT INTO company_bank_details (
  company_id,
  company_ref_type,
  account_holder_name,
  bank_name,
  account_number,
  swift_code,
  iban,
  bank_address,
  branch_code,
  branch_address,
  is_primary,
  is_active
)
SELECT 
  mc.my_company_id,
  'my_company',
  mc.my_company_name,
  'Sample Bank',
  'ACC-' || UPPER(LEFT(mc.my_company_code, 4)) || '-' || LPAD((ROW_NUMBER() OVER (ORDER BY mc.created_at))::text, 6, '0'),
  'SAMPUS33',
  'US' || LPAD((ROW_NUMBER() OVER (ORDER BY mc.created_at))::text, 20, '0'),
  '123 Banking Street, New York, NY 10001',
  'NYC001',
  '123 Banking Street, Branch Office',
  true,
  true
FROM my_companies mc
WHERE NOT EXISTS (
  SELECT 1 FROM company_bank_details cbd 
  WHERE cbd.company_id = mc.my_company_id 
  AND cbd.company_ref_type = 'my_company'
);

-- Update existing sales order totals to include new financial fields
UPDATE sales_orders 
SET 
  sub_total = COALESCE(sub_total, 0.00),
  vat_amount = COALESCE(sub_total, 0.00) * (COALESCE(vat_percentage, 0.00) / 100),
  total_net = COALESCE(sub_total, 0.00) + COALESCE(freight_charge, 0.00) + COALESCE(misc_charge, 0.00) + (COALESCE(sub_total, 0.00) * (COALESCE(vat_percentage, 0.00) / 100)),
  updated_at = NOW()
WHERE 
  vat_amount IS NULL 
  OR total_net IS NULL 
  OR total_net = 0;

-- Create audit log for migration
INSERT INTO admin_actions (
  action_type,
  admin_id,
  details,
  created_at
) VALUES (
  'DATA_MIGRATION',
  (SELECT id FROM accounts WHERE name LIKE '%admin%' LIMIT 1),
  json_build_object(
    'migration_type', 'sales_orders_enhancement',
    'timestamp', NOW(),
    'updated_sales_orders', (SELECT COUNT(*) FROM sales_orders WHERE updated_at >= NOW() - INTERVAL '1 minute'),
    'updated_inventory', (SELECT COUNT(*) FROM inventory WHERE updated_at >= NOW() - INTERVAL '1 minute'),
    'created_bank_details', (SELECT COUNT(*) FROM company_bank_details WHERE created_at >= NOW() - INTERVAL '1 minute')
  ),
  NOW()
);

-- Commit transaction
COMMIT;

-- Verification queries (run separately after migration)
/*
-- Verify sales orders migration
SELECT 
  COUNT(*) as total_orders,
  COUNT(CASE WHEN reference_number IS NOT NULL THEN 1 END) as with_reference,
  COUNT(CASE WHEN freight_charge > 0 THEN 1 END) as with_freight,
  COUNT(CASE WHEN vat_percentage > 0 THEN 1 END) as with_vat,
  AVG(total_net) as avg_total
FROM sales_orders;

-- Verify inventory migration
SELECT 
  COUNT(*) as total_inventory,
  COUNT(CASE WHEN application_code IS NOT NULL THEN 1 END) as with_app_code,
  COUNT(CASE WHEN dimensions IS NOT NULL THEN 1 END) as with_dimensions,
  COUNT(CASE WHEN weight IS NOT NULL THEN 1 END) as with_weight,
  COUNT(CASE WHEN country_of_origin IS NOT NULL THEN 1 END) as with_country
FROM inventory;

-- Verify bank details creation
SELECT 
  COUNT(*) as total_bank_details,
  COUNT(CASE WHEN is_primary = true THEN 1 END) as primary_accounts,
  COUNT(DISTINCT company_id) as companies_with_banking
FROM company_bank_details;
*/