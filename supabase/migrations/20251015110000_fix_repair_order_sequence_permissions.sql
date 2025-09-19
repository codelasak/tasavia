-- Ensure repair_order_sequence table exists with expected columns
CREATE TABLE IF NOT EXISTS public.repair_order_sequence (
    year INTEGER PRIMARY KEY,
    next_sequence_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Align defaults (in case the table already existed without them)
ALTER TABLE public.repair_order_sequence
    ALTER COLUMN next_sequence_number SET DEFAULT 1,
    ALTER COLUMN created_at SET DEFAULT NOW(),
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET DEFAULT NOW(),
    ALTER COLUMN updated_at SET NOT NULL;

-- Allow authenticated role to operate on the sequence via policies
ALTER TABLE public.repair_order_sequence ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.repair_order_sequence TO authenticated;

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.repair_order_sequence;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.repair_order_sequence;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.repair_order_sequence;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.repair_order_sequence;

CREATE POLICY "Authenticated select on repair_order_sequence"
    ON public.repair_order_sequence
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated insert on repair_order_sequence"
    ON public.repair_order_sequence
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated update on repair_order_sequence"
    ON public.repair_order_sequence
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Ensure a row exists for the current year so inserts work immediately
INSERT INTO public.repair_order_sequence (year)
VALUES (EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER)
ON CONFLICT (year) DO NOTHING;

-- Recreate the generator function with definer rights so it can manage the sequence table
CREATE OR REPLACE FUNCTION public.generate_repair_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
    v_next_number INTEGER;
BEGIN
    INSERT INTO public.repair_order_sequence AS ros (year, next_sequence_number)
    VALUES (v_year, 1)
    ON CONFLICT (year)
    DO UPDATE SET
        next_sequence_number = ros.next_sequence_number + 1,
        updated_at = NOW()
    RETURNING next_sequence_number INTO v_next_number;

    RETURN 'R' || RIGHT(v_year::TEXT, 2) || LPAD(v_next_number::TEXT, 3, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_repair_order_number() TO authenticated;

-- Recreate the trigger function with the same security posture
CREATE OR REPLACE FUNCTION public.assign_repair_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.repair_order_number IS NULL OR BTRIM(NEW.repair_order_number) = '' THEN
        NEW.repair_order_number := public.generate_repair_order_number();
    END IF;
    RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_repair_order_number() TO authenticated;

-- Ensure the trigger is present and points to the refreshed function
DROP TRIGGER IF EXISTS trigger_assign_repair_order_number ON public.repair_orders;
CREATE TRIGGER trigger_assign_repair_order_number
BEFORE INSERT ON public.repair_orders
FOR EACH ROW
EXECUTE FUNCTION public.assign_repair_order_number();
