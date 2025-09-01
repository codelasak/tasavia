-- DEFINITIVE FIX for create_inventory_from_po_completion function
-- This removes ALL problematic fields and uses ONLY existing inventory table columns

CREATE OR REPLACE FUNCTION public.create_inventory_from_po_completion(po_id_param uuid)
 RETURNS TABLE(success boolean, created_count integer, inventory_ids uuid[], error_message text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    po_record RECORD;
    po_item_record RECORD;
    new_inventory_id UUID;
    created_inventory_count INTEGER := 0;
    inventory_id_array UUID[] := ARRAY[]::UUID[];
    existing_inventory_count INTEGER := 0;
BEGIN
    -- Get PO information
    SELECT po_id, po_number, po_date, status INTO po_record
    FROM purchase_orders 
    WHERE po_id = po_id_param;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0, ARRAY[]::UUID[], 'Purchase order not found: ' || po_id_param::text;
        RETURN;
    END IF;
    
    -- Check if inventory already exists for this PO
    SELECT COUNT(*) INTO existing_inventory_count
    FROM inventory 
    WHERE po_id_original = po_id_param;
    
    IF existing_inventory_count > 0 THEN
        RETURN QUERY SELECT FALSE, 0, ARRAY[]::UUID[], 
                           'Inventory already exists for this PO (' || existing_inventory_count::text || ' items)';
        RETURN;
    END IF;
    
    -- Process each PO item
    FOR po_item_record IN 
        SELECT 
            pi.pn_id,
            pi.unit_price,
            pi.sn,
            pi.traceability_source,
            pi.traceable_to,
            pi.last_certified_agency
        FROM po_items pi
        WHERE pi.po_id = po_id_param
    LOOP
        -- Generate new inventory ID
        new_inventory_id := gen_random_uuid();
        
        -- Insert inventory record with CORRECT enum values and ONLY existing columns
        INSERT INTO inventory (
            inventory_id,
            pn_id,
            po_price,
            sn,
            po_id_original,
            po_number_original,
            physical_status,      -- REQUIRED enum: 'depot', 'in_repair', 'in_transit'
            business_status,      -- REQUIRED enum: 'available', 'reserved', 'sold'
            traceability_source,
            traceable_to,
            last_certified_agency,
            created_at,
            updated_at
        ) VALUES (
            new_inventory_id,
            po_item_record.pn_id,
            po_item_record.unit_price,
            po_item_record.sn,
            po_id_param,
            po_record.po_number,
            'depot',              -- Items arrive at depot
            'available',          -- Items are available for sale
            po_item_record.traceability_source,
            po_item_record.traceable_to,
            po_item_record.last_certified_agency,
            NOW(),
            NOW()
        );
        
        -- Add to inventory ID array
        inventory_id_array := array_append(inventory_id_array, new_inventory_id);
        created_inventory_count := created_inventory_count + 1;
    END LOOP;
    
    -- Update PO status to Completed
    UPDATE purchase_orders 
    SET status = 'Completed', updated_at = NOW()
    WHERE po_id = po_id_param;
    
    -- Return success
    RETURN QUERY SELECT TRUE, created_inventory_count, inventory_id_array, NULL::TEXT;
    RETURN;
END;
$function$;