-- Add cancelled status to business_status_enum
ALTER TYPE business_status_enum ADD VALUE 'cancelled';

-- Update the inventory status check constraint to include 'Cancelled'
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_status_check;

ALTER TABLE inventory ADD CONSTRAINT inventory_status_check
CHECK (status = ANY (ARRAY['Available'::text, 'Allocated'::text, 'Sold'::text, 'Out for Repair'::text, 'Repair Complete'::text, 'Damaged'::text, 'Reserved'::text, 'Cancelled'::text]));

-- Update the inventory_sync_legacy_status function to handle cancelled status
CREATE OR REPLACE FUNCTION public.inventory_sync_legacy_status()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Auto-derive legacy status from business_status for compatibility
    NEW.status := CASE NEW.business_status
        WHEN 'available' THEN 'Available'
        WHEN 'reserved' THEN 'Reserved'
        WHEN 'sold' THEN 'Sold'
        WHEN 'cancelled' THEN 'Cancelled'
        ELSE NEW.status -- Preserve any existing value if not mapped
    END;
    RETURN NEW;
END;
$function$;