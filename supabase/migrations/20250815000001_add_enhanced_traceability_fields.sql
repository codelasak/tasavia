-- Add enhanced traceability fields to po_items table
-- These fields support the updated traceability requirements with file uploads and country information

ALTER TABLE po_items 
ADD COLUMN source_of_traceability_documentation TEXT,
ADD COLUMN origin_country TEXT,
ADD COLUMN origin_country_code TEXT,
ADD COLUMN traceability_files_path TEXT;

-- Add enhanced traceability fields to inventory table as well
-- Check if columns exist first to avoid conflicts
DO $$ 
BEGIN
    -- Add source_of_traceability_documentation if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'source_of_traceability_documentation') THEN
        ALTER TABLE inventory ADD COLUMN source_of_traceability_documentation TEXT;
    END IF;
    
    -- Add origin_country if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'origin_country') THEN
        ALTER TABLE inventory ADD COLUMN origin_country TEXT;
    END IF;
    
    -- Add origin_country_code if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'origin_country_code') THEN
        ALTER TABLE inventory ADD COLUMN origin_country_code TEXT;
    END IF;
    
    -- Add traceability_files_path if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'traceability_files_path') THEN
        ALTER TABLE inventory ADD COLUMN traceability_files_path TEXT;
    END IF;
END $$;

-- Add comments to document the new fields
COMMENT ON COLUMN po_items.source_of_traceability_documentation IS 'Source documentation for traceability information';
COMMENT ON COLUMN po_items.origin_country IS 'Country of origin for the part';
COMMENT ON COLUMN po_items.origin_country_code IS 'ISO country code for origin country';
COMMENT ON COLUMN po_items.traceability_files_path IS 'JSON array of file URLs for traceability documentation stored in Supabase storage';

-- Add comments to inventory table columns as well
COMMENT ON COLUMN inventory.source_of_traceability_documentation IS 'Source documentation for traceability information';
COMMENT ON COLUMN inventory.origin_country IS 'Country of origin for the part';
COMMENT ON COLUMN inventory.origin_country_code IS 'ISO country code for origin country';
COMMENT ON COLUMN inventory.traceability_files_path IS 'JSON array of file URLs for traceability documentation stored in Supabase storage';

-- Update the create_inventory_from_po_completion function to include new traceability fields
CREATE OR REPLACE FUNCTION create_inventory_from_po_completion(po_id_param UUID)
RETURNS TABLE(
  inventory_id UUID,
  pn_id UUID,
  created_count INTEGER
) 
LANGUAGE plpgsql
AS $$
DECLARE
    po_record RECORD;
    po_item_record RECORD;
    new_inventory_id UUID;
    created_inventory_count INTEGER := 0;
BEGIN
    -- Get PO information
    SELECT po_number, po_date INTO po_record
    FROM purchase_orders 
    WHERE po_id = po_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase order not found: %', po_id_param;
    END IF;
    
    -- Process each PO item
    FOR po_item_record IN 
        SELECT 
            pi.pn_id,
            pi.quantity,
            pi.unit_price,
            pi.condition,
            pi.sn,
            pi.traceability_source,
            pi.traceable_to,
            pi.last_certified_agency,
            pi.source_of_traceability_documentation,
            pi.origin_country,
            pi.origin_country_code,
            pi.traceability_files_path
        FROM po_items pi
        WHERE pi.po_id = po_id_param
    LOOP
        -- Generate new inventory ID
        new_inventory_id := gen_random_uuid();
        
        -- Insert inventory record with enhanced traceability fields
        INSERT INTO inventory (
            inventory_id,
            pn_id,
            quantity,
            unit_cost,
            condition,
            serial_number,
            po_id_original,
            po_number_original,
            status,
            traceability_source,
            traceable_to,
            last_certified_agency,
            source_of_traceability_documentation,
            origin_country,
            origin_country_code,
            traceability_files_path,
            created_at
        ) VALUES (
            new_inventory_id,
            po_item_record.pn_id,
            po_item_record.quantity,
            po_item_record.unit_price,
            po_item_record.condition,
            po_item_record.sn,
            po_id_param,
            po_record.po_number,
            'Available',
            po_item_record.traceability_source,
            po_item_record.traceable_to,
            po_item_record.last_certified_agency,
            po_item_record.source_of_traceability_documentation,
            po_item_record.origin_country,
            po_item_record.origin_country_code,
            po_item_record.traceability_files_path,
            NOW()
        );
        
        -- Return the created inventory info
        inventory_id := new_inventory_id;
        pn_id := po_item_record.pn_id;
        created_count := created_inventory_count + 1;
        created_inventory_count := created_inventory_count + 1;
        
        RETURN NEXT;
    END LOOP;
    
    RETURN;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_inventory_from_po_completion(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_inventory_from_po_completion(UUID) TO service_role;