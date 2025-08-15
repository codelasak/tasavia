-- Aviation Parts Management System - Phase 1 Rollback Script
-- WARNING: This will remove all Phase 1 enhancements. Use with caution!
-- Always backup your data before running rollback scripts.

BEGIN;

-- Remove triggers first (to prevent cascade issues)
DROP TRIGGER IF EXISTS trigger_inherit_country_data_to_sales_order ON sales_order_items;
DROP TRIGGER IF EXISTS trigger_inherit_aviation_data_to_inventory ON inventory;
DROP TRIGGER IF EXISTS trigger_inventory_status_updated ON inventory;
DROP TRIGGER IF EXISTS trigger_part_number_history_updated_at ON part_number_history;

-- Remove functions
DROP FUNCTION IF EXISTS inherit_country_data_to_sales_order();
DROP FUNCTION IF EXISTS inherit_aviation_data_to_inventory();
DROP FUNCTION IF EXISTS manual_inherit_aviation_data(TEXT);
DROP FUNCTION IF EXISTS update_inventory_status_timestamp();
DROP FUNCTION IF EXISTS update_part_number_history_updated_at();

-- Remove indexes created in Phase 1
-- Inventory dual status indexes
DROP INDEX IF EXISTS idx_inventory_physical_status;
DROP INDEX IF EXISTS idx_inventory_business_status;
DROP INDEX IF EXISTS idx_inventory_dual_status;
DROP INDEX IF EXISTS idx_inventory_status_updated;

-- Part number history indexes
DROP INDEX IF EXISTS idx_pn_history_inventory;
DROP INDEX IF EXISTS idx_pn_history_repair_order;
DROP INDEX IF EXISTS idx_pn_history_original_pn;
DROP INDEX IF EXISTS idx_pn_history_modified_pn;
DROP INDEX IF EXISTS idx_pn_history_modification_date;
DROP INDEX IF EXISTS idx_pn_history_active;

-- Purchase orders aviation compliance indexes
DROP INDEX IF EXISTS idx_po_aviation_compliance;
DROP INDEX IF EXISTS idx_po_origin_country;
DROP INDEX IF EXISTS idx_po_end_use_country;
DROP INDEX IF EXISTS idx_po_traceable_airline;
DROP INDEX IF EXISTS idx_po_certificate_expiry;

-- Sales orders shipping indexes
DROP INDEX IF EXISTS idx_so_awb_number;
DROP INDEX IF EXISTS idx_so_tracking_number;
DROP INDEX IF EXISTS idx_so_fedex_account;
DROP INDEX IF EXISTS idx_so_shipping_carrier;
DROP INDEX IF EXISTS idx_so_estimated_delivery;

-- Remove constraints
-- Inventory constraints
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS check_valid_status_combination;

-- Part number history constraints
ALTER TABLE part_number_history DROP CONSTRAINT IF EXISTS check_different_part_numbers;
ALTER TABLE part_number_history DROP CONSTRAINT IF EXISTS check_approval_logic;

-- Purchase orders constraints
ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS check_compliance_verification_logic;
ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS check_certificate_expiry_future;
ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS check_country_code_format;

-- Sales orders constraints
ALTER TABLE sales_orders DROP CONSTRAINT IF EXISTS check_weight_positive;
ALTER TABLE sales_orders DROP CONSTRAINT IF EXISTS check_shipping_cost_positive;
ALTER TABLE sales_orders DROP CONSTRAINT IF EXISTS check_delivery_dates_logical;
ALTER TABLE sales_orders DROP CONSTRAINT IF EXISTS check_tracking_number_format;

-- Remove columns from sales_orders (shipping fields)
ALTER TABLE sales_orders DROP COLUMN IF EXISTS awb_number;
ALTER TABLE sales_orders DROP COLUMN IF EXISTS fedex_account_number;
ALTER TABLE sales_orders DROP COLUMN IF EXISTS shipping_tracking_number;
ALTER TABLE sales_orders DROP COLUMN IF EXISTS package_dimensions;
ALTER TABLE sales_orders DROP COLUMN IF EXISTS gross_weight_kgs;
ALTER TABLE sales_orders DROP COLUMN IF EXISTS shipping_method;
ALTER TABLE sales_orders DROP COLUMN IF EXISTS shipping_carrier;
ALTER TABLE sales_orders DROP COLUMN IF EXISTS shipping_service_type;
ALTER TABLE sales_orders DROP COLUMN IF EXISTS estimated_delivery_date;
ALTER TABLE sales_orders DROP COLUMN IF EXISTS actual_delivery_date;
ALTER TABLE sales_orders DROP COLUMN IF EXISTS shipping_cost;
ALTER TABLE sales_orders DROP COLUMN IF EXISTS shipping_notes;

-- Remove columns from purchase_orders (aviation compliance fields)
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS last_certificate;
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS obtained_from;
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS traceable_to_airline;
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS traceable_to_msn;
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS origin_country;
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS end_use_country;
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS certificate_upload_path;
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS certificate_expiry_date;
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS compliance_notes;
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS aviation_compliance_verified;
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS compliance_verified_by;
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS compliance_verified_date;
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS certificate_reference_number;
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS regulatory_authority;
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS airworthiness_status;

-- Drop part number history table completely
DROP TABLE IF EXISTS part_number_history;

-- Remove dual status columns from inventory
ALTER TABLE inventory DROP COLUMN IF EXISTS physical_status;
ALTER TABLE inventory DROP COLUMN IF EXISTS business_status;
ALTER TABLE inventory DROP COLUMN IF EXISTS status_updated_at;
ALTER TABLE inventory DROP COLUMN IF EXISTS status_updated_by;

-- Drop enum types
DROP TYPE IF EXISTS physical_status_enum;
DROP TYPE IF EXISTS business_status_enum;

COMMIT;

-- Verification queries to confirm rollback
-- Uncomment these to verify the rollback was successful:

-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'inventory' AND column_name IN ('physical_status', 'business_status');

-- SELECT table_name FROM information_schema.tables 
-- WHERE table_name = 'part_number_history';

-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'purchase_orders' AND column_name LIKE '%aviation%';

COMMENT ON TABLE inventory IS 'Inventory table - Phase 1 aviation enhancements have been rolled back';