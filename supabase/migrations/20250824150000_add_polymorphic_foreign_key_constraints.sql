-- Add polymorphic foreign key constraints for company reference tables
-- These tables use company_id + company_ref_type pattern to reference either companies or my_companies

-- Function to validate polymorphic company references
CREATE OR REPLACE FUNCTION validate_company_reference(
    company_id UUID,
    company_ref_type TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    IF company_ref_type = 'companies' THEN
        RETURN EXISTS (SELECT 1 FROM companies WHERE companies.company_id = $1);
    ELSIF company_ref_type = 'my_companies' THEN
        RETURN EXISTS (SELECT 1 FROM my_companies WHERE my_companies.my_company_id = $1);
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Add check constraints for polymorphic references
-- company_contacts
DO $$ BEGIN
    ALTER TABLE company_contacts
    ADD CONSTRAINT fk_company_contact_polymorphic
    CHECK (validate_company_reference(company_id, company_ref_type));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- company_addresses  
DO $$ BEGIN
    ALTER TABLE company_addresses
    ADD CONSTRAINT fk_company_address_polymorphic
    CHECK (validate_company_reference(company_id, company_ref_type));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- company_bank_details
DO $$ BEGIN
    ALTER TABLE company_bank_details
    ADD CONSTRAINT fk_company_bank_details_polymorphic
    CHECK (validate_company_reference(company_id, company_ref_type));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- company_ship_via
DO $$ BEGIN
    ALTER TABLE company_ship_via
    ADD CONSTRAINT fk_company_ship_via_polymorphic
    CHECK (validate_company_reference(company_id, company_ref_type));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add constraints for valid company_ref_type values
DO $$ BEGIN
    ALTER TABLE company_contacts
    ADD CONSTRAINT company_contacts_ref_type_check
    CHECK (company_ref_type IN ('companies', 'my_companies'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE company_addresses
    ADD CONSTRAINT company_addresses_ref_type_check
    CHECK (company_ref_type IN ('companies', 'my_companies'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE company_bank_details
    ADD CONSTRAINT company_bank_details_ref_type_check
    CHECK (company_ref_type IN ('companies', 'my_companies'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE company_ship_via
    ADD CONSTRAINT company_ship_via_ref_type_check
    CHECK (company_ref_type IN ('companies', 'my_companies'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create indexes for better performance on polymorphic lookups (without CONCURRENTLY for migration)
CREATE INDEX IF NOT EXISTS idx_company_contacts_polymorphic 
ON company_contacts(company_id, company_ref_type);

CREATE INDEX IF NOT EXISTS idx_company_addresses_polymorphic 
ON company_addresses(company_id, company_ref_type);

CREATE INDEX IF NOT EXISTS idx_company_bank_details_polymorphic 
ON company_bank_details(company_id, company_ref_type);

CREATE INDEX IF NOT EXISTS idx_company_ship_via_polymorphic 
ON company_ship_via(company_id, company_ref_type);

-- Additional validation triggers for more robust enforcement
-- These triggers provide better error messages and prevent invalid data
CREATE OR REPLACE FUNCTION check_polymorphic_reference() RETURNS TRIGGER AS $$
BEGIN
    IF NOT validate_company_reference(NEW.company_id, NEW.company_ref_type) THEN
        RAISE EXCEPTION 'Foreign key constraint violation: company_id % does not exist in % table',
            NEW.company_id, NEW.company_ref_type
            USING ERRCODE = '23503';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for each table
DROP TRIGGER IF EXISTS check_company_contacts_reference ON company_contacts;
CREATE TRIGGER check_company_contacts_reference
    BEFORE INSERT OR UPDATE ON company_contacts
    FOR EACH ROW EXECUTE FUNCTION check_polymorphic_reference();

DROP TRIGGER IF EXISTS check_company_addresses_reference ON company_addresses;
CREATE TRIGGER check_company_addresses_reference
    BEFORE INSERT OR UPDATE ON company_addresses
    FOR EACH ROW EXECUTE FUNCTION check_polymorphic_reference();

DROP TRIGGER IF EXISTS check_company_bank_details_reference ON company_bank_details;
CREATE TRIGGER check_company_bank_details_reference
    BEFORE INSERT OR UPDATE ON company_bank_details
    FOR EACH ROW EXECUTE FUNCTION check_polymorphic_reference();

DROP TRIGGER IF EXISTS check_company_ship_via_reference ON company_ship_via;
CREATE TRIGGER check_company_ship_via_reference
    BEFORE INSERT OR UPDATE ON company_ship_via
    FOR EACH ROW EXECUTE FUNCTION check_polymorphic_reference();