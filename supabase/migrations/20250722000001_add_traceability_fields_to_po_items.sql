-- Add traceability fields to po_items table
-- These fields will be populated during PO creation/editing and then transferred to inventory when PO is completed

ALTER TABLE po_items 
ADD COLUMN traceability_source TEXT,
ADD COLUMN traceable_to TEXT,
ADD COLUMN last_certified_agency TEXT;

-- Add comments to document the fields
COMMENT ON COLUMN po_items.traceability_source IS 'Source of traceability information for ATA 106 compliance';
COMMENT ON COLUMN po_items.traceable_to IS 'What this part is traceable to for ATA 106 compliance';
COMMENT ON COLUMN po_items.last_certified_agency IS 'Last certified agency for ATA 106 compliance';

-- Update the create_inventory_from_po_completion function to include traceability fields
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
            pi.last_certified_agency
        FROM po_items pi
        WHERE pi.po_id = po_id_param
    LOOP
        -- Generate new inventory ID
        new_inventory_id := gen_random_uuid();
        
        -- Insert inventory record with traceability fields
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