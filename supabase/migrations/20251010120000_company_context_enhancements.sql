BEGIN;

ALTER TABLE public.company_addresses
    ADD COLUMN IF NOT EXISTS state TEXT;

CREATE SEQUENCE IF NOT EXISTS public.external_company_code_seq
    AS BIGINT
    INCREMENT BY 1
    MINVALUE 1
    NO MAXVALUE
    START WITH 1000
    OWNED BY NONE;

CREATE OR REPLACE FUNCTION public.generate_external_company_code(p_company_name text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    prefix text;
    candidate text;
    attempts integer := 0;
    digits text;
BEGIN
    prefix := COALESCE(NULLIF(regexp_replace(upper(COALESCE(p_company_name, '')), '[^A-Z]', '', 'g'), ''), 'EXT');
    prefix := substr(prefix || 'XXX', 1, 3);

    LOOP
        attempts := attempts + 1;
        digits := lpad((floor(random() * 1000))::int::text, 3, '0');
        candidate := prefix || digits;

        EXIT WHEN NOT EXISTS (
            SELECT 1 FROM public.companies WHERE company_code = candidate
        );

        IF attempts >= 100 THEN
            RAISE EXCEPTION 'Unable to generate unique external company code for prefix %', prefix;
        END IF;
    END LOOP;

    RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_external_company_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF COALESCE(NEW.is_self, false) = false
       AND (NEW.company_code IS NULL OR trim(NEW.company_code) = '') THEN
        NEW.company_code := public.generate_external_company_code(NEW.company_name);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_external_company_code ON public.companies;
CREATE TRIGGER trg_assign_external_company_code
BEFORE INSERT ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.assign_external_company_code();

UPDATE public.companies
SET company_code = public.generate_external_company_code(company_name)
WHERE COALESCE(is_self, false) = false
  AND (company_code IS NULL OR trim(company_code) = '');

GRANT USAGE ON SEQUENCE public.external_company_code_seq TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.generate_external_company_code(text) TO authenticated, anon, service_role;

COMMIT;
