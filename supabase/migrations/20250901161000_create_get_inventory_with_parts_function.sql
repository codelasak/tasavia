-- Create RPC function to get inventory with part number details
-- This function properly joins inventory and pn_master_table to return structured data

CREATE OR REPLACE FUNCTION public.get_inventory_with_parts()
RETURNS TABLE(
    inventory_id uuid,
    pn_id uuid,
    sn text,
    location text,
    po_price numeric,
    remarks text,
    status text,
    physical_status text,
    business_status text,
    status_updated_at timestamptz,
    status_updated_by uuid,
    po_id_original uuid,
    po_number_original text,
    created_at timestamptz,
    updated_at timestamptz,
    pn_master_table jsonb
)
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        i.inventory_id,
        i.pn_id,
        i.sn,
        i.location,
        i.po_price,
        i.remarks,
        i.status,
        i.physical_status::text,
        i.business_status::text,
        i.status_updated_at,
        i.status_updated_by,
        i.po_id_original,
        i.po_number_original,
        i.created_at,
        i.updated_at,
        jsonb_build_object(
            'pn', p.pn,
            'description', p.description
        ) as pn_master_table
    FROM inventory i
    LEFT JOIN pn_master_table p ON i.pn_id = p.pn_id
    ORDER BY i.updated_at DESC;
END;
$function$;