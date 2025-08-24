-- Database Simplification Phase 2: Company Table Unification
-- This migration unifies my_companies and companies into a single companies table

-- Step 0: Ensure clean session and disable triggers temporarily
SET session_replication_role = replica;

-- Step 1: Add is_self column to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_self BOOLEAN DEFAULT false;

-- Step 1.5: Drop existing foreign key constraints that reference my_companies
-- Try to drop all possible constraint names that might exist
DO $$
BEGIN
    -- Drop constraints with various possible names
    ALTER TABLE company_addresses DROP CONSTRAINT IF EXISTS fk_company;
    ALTER TABLE company_addresses DROP CONSTRAINT IF EXISTS company_addresses_company_id_fkey;
    ALTER TABLE company_addresses DROP CONSTRAINT IF EXISTS company_addresses_company_ref_fkey;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some company_addresses constraints may not exist: %', SQLERRM;
END $$;

DO $$
BEGIN
    ALTER TABLE company_contacts DROP CONSTRAINT IF EXISTS fk_company;
    ALTER TABLE company_contacts DROP CONSTRAINT IF EXISTS company_contacts_company_id_fkey;
    ALTER TABLE company_contacts DROP CONSTRAINT IF EXISTS company_contacts_company_ref_fkey;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some company_contacts constraints may not exist: %', SQLERRM;
END $$;

DO $$
BEGIN
    ALTER TABLE company_ship_via DROP CONSTRAINT IF EXISTS fk_company;
    ALTER TABLE company_ship_via DROP CONSTRAINT IF EXISTS company_ship_via_company_id_fkey;
    ALTER TABLE company_ship_via DROP CONSTRAINT IF EXISTS company_ship_via_company_ref_fkey;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some company_ship_via constraints may not exist: %', SQLERRM;
END $$;

-- Step 2: Migrate data from my_companies to companies
DO $$
DECLARE
    my_company_record RECORD;
    new_company_id UUID;
BEGIN
    -- Loop through all my_companies records
    FOR my_company_record IN 
        SELECT * FROM my_companies 
    LOOP
        -- Generate new UUID for the unified companies table
        new_company_id := gen_random_uuid();
        
        -- Insert into companies table
        INSERT INTO companies (
            company_id,
            company_name,
            company_code,
            is_self,
            created_at,
            updated_at
        ) VALUES (
            new_company_id,
            my_company_record.my_company_name,
            my_company_record.my_company_code,
            true,  -- Mark as internal company
            my_company_record.created_at,
            my_company_record.updated_at
        );
        
        -- Update company_addresses to point to new company_id
        UPDATE company_addresses 
        SET company_id = new_company_id,
            company_ref_type = 'companies'
        WHERE company_id = my_company_record.my_company_id 
        AND company_ref_type = 'my_companies';
        
        -- Update company_contacts to point to new company_id
        UPDATE company_contacts 
        SET company_id = new_company_id,
            company_ref_type = 'companies'
        WHERE company_id = my_company_record.my_company_id 
        AND company_ref_type = 'my_companies';
        
        -- Update company_ship_via to point to new company_id
        UPDATE company_ship_via 
        SET company_id = new_company_id,
            company_ref_type = 'companies'
        WHERE company_id = my_company_record.my_company_id 
        AND company_ref_type = 'my_companies';
        
        -- Update purchase_orders references
        UPDATE purchase_orders 
        SET my_company_id = new_company_id
        WHERE my_company_id = my_company_record.my_company_id;
        
        -- Update sales_orders references 
        UPDATE sales_orders 
        SET my_company_id = new_company_id
        WHERE my_company_id = my_company_record.my_company_id;
        
        RAISE NOTICE 'Migrated my_company: % (%) -> %', 
            my_company_record.my_company_name, 
            my_company_record.my_company_id, 
            new_company_id;
    END LOOP;
END $$;

-- Step 3: Update foreign key column names
-- Rename my_company_id to company_id in purchase_orders
ALTER TABLE purchase_orders RENAME COLUMN my_company_id TO company_id;

-- Rename my_company_id to company_id in sales_orders  
ALTER TABLE sales_orders RENAME COLUMN my_company_id TO company_id;

-- Step 4: Remove company_ref_type dependency
-- Since all data is now in companies table, we can simplify the polymorphic pattern
-- But we'll keep company_ref_type for backward compatibility during transition

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_is_self ON companies(is_self);
CREATE INDEX IF NOT EXISTS idx_companies_internal ON companies(company_id) WHERE is_self = true;
CREATE INDEX IF NOT EXISTS idx_companies_external ON companies(company_id) WHERE is_self = false OR is_self IS NULL;

-- Step 6: Update foreign key constraints
-- Add proper foreign key constraints for unified structure
ALTER TABLE purchase_orders 
DROP CONSTRAINT IF EXISTS purchase_orders_my_company_id_fkey;

ALTER TABLE purchase_orders
ADD CONSTRAINT purchase_orders_company_id_fkey 
FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE;

ALTER TABLE sales_orders 
DROP CONSTRAINT IF EXISTS sales_orders_my_company_id_fkey;

ALTER TABLE sales_orders
ADD CONSTRAINT sales_orders_company_id_fkey 
FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE;

-- Step 6.5: Recreate foreign key constraints for company supporting tables
ALTER TABLE company_addresses
ADD CONSTRAINT company_addresses_company_id_fkey 
FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE;

ALTER TABLE company_contacts
ADD CONSTRAINT company_contacts_company_id_fkey 
FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE;

ALTER TABLE company_ship_via
ADD CONSTRAINT company_ship_via_company_id_fkey 
FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE;

-- Step 7: Create views for backward compatibility (optional)
CREATE OR REPLACE VIEW my_companies_view AS
SELECT 
    company_id as my_company_id,
    company_name as my_company_name,
    company_code as my_company_code,
    created_at,
    updated_at
FROM companies 
WHERE is_self = true;

COMMENT ON VIEW my_companies_view IS 'Backward compatibility view for my_companies table';

-- Step 8: Drop old my_companies table (commented out for safety)
-- DROP TABLE my_companies CASCADE;

-- Step 9: Re-enable triggers and restore normal replication role
SET session_replication_role = DEFAULT;

-- Final verification
SELECT 'Phase 2 Company Unification completed successfully' AS result,
       COUNT(*) as total_companies,
       COUNT(*) FILTER (WHERE is_self = true) as internal_companies,
       COUNT(*) FILTER (WHERE is_self = false OR is_self IS NULL) as external_companies
FROM companies;