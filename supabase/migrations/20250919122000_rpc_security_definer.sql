-- Secure and expose inventory RPCs to application roles

-- Harden existing list RPC
ALTER FUNCTION public.get_inventory_with_parts() SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.get_inventory_with_parts() TO authenticated, service_role;

-- Create detail RPC returning condition from PO items
CREATE OR REPLACE FUNCTION public.get_inventory_item_with_part(inv_id uuid)
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
  condition text,
  pn_master_table jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
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
    (
      SELECT pi.condition
      FROM po_items pi
      WHERE pi.po_id = COALESCE(
        i.po_id_original,
        (SELECT po_id FROM purchase_orders WHERE po_number = i.po_number_original LIMIT 1)
      )
      AND (
        (i.sn IS NOT NULL AND pi.sn = i.sn)
        OR (i.sn IS NULL AND pi.pn_id = i.pn_id)
      )
      LIMIT 1
    ) AS condition,
    jsonb_build_object('pn', p.pn, 'description', p.description) AS pn_master_table
  FROM inventory i
  LEFT JOIN pn_master_table p ON i.pn_id = p.pn_id
  WHERE i.inventory_id = inv_id
  LIMIT 1;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_inventory_item_with_part(uuid) TO authenticated, service_role;

