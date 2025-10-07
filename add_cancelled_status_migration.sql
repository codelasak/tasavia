-- Add cancelled status to business_status_enum
ALTER TYPE business_status_enum ADD VALUE 'cancelled';

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