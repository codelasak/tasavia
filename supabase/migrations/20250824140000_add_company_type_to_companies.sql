-- Add company_type to companies for vendor/customer/both classification
-- Safe on re-runs due to IF NOT EXISTS and constraint names

DO $$ BEGIN
  ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS company_type text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Constrain allowed values
DO $$ BEGIN
  ALTER TABLE public.companies
  ADD CONSTRAINT companies_company_type_check
  CHECK (company_type IN ('vendor','customer','both'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Optional default for new rows
ALTER TABLE public.companies ALTER COLUMN company_type SET DEFAULT 'vendor';

-- Backfill nulls to default (idempotent)
UPDATE public.companies SET company_type = 'vendor' WHERE company_type IS NULL;

