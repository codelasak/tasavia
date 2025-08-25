-- Complete Company Migration Cleanup
-- Phase 2: Drop my_companies table and clean up

-- Step 1: Final validation before dropping
DO $$
DECLARE
    my_companies_count INTEGER;
    companies_internal_count INTEGER;
    validation_result TEXT;
BEGIN
    -- Count records
    SELECT COUNT(*) INTO my_companies_count FROM my_companies;
    SELECT COUNT(*) INTO companies_internal_count FROM companies WHERE is_self = true;
    
    -- Validate migration is complete
    IF my_companies_count = companies_internal_count THEN
        validation_result := 'VALIDATION_PASSED';
        RAISE NOTICE 'Migration validation passed: % my_companies = % companies with is_self=true', 
            my_companies_count, companies_internal_count;
    ELSE
        validation_result := 'VALIDATION_FAILED';
        RAISE EXCEPTION 'Migration validation failed: % my_companies != % companies with is_self=true', 
            my_companies_count, companies_internal_count;
    END IF;
END $$;

-- Step 2: Check for any remaining references to my_companies
DO $$
DECLARE
    po_refs INTEGER;
    so_refs INTEGER;
BEGIN
    -- Check purchase_orders for any remaining my_company_id references
    SELECT COUNT(*) INTO po_refs 
    FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' 
      AND column_name = 'my_company_id';
    
    -- Check sales_orders for any remaining my_company_id references  
    SELECT COUNT(*) INTO so_refs
    FROM information_schema.columns 
    WHERE table_name = 'sales_orders' 
      AND column_name = 'my_company_id';
    
    IF po_refs > 0 OR so_refs > 0 THEN
        RAISE EXCEPTION 'Found remaining my_company_id columns: PO=% SO=%', po_refs, so_refs;
    END IF;
    
    RAISE NOTICE 'No remaining my_company_id column references found';
END $$;

-- Step 3: Check for related table references that need updating
DO $$
DECLARE
    addr_count INTEGER;
    contact_count INTEGER;
    ship_count INTEGER;
    bank_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO addr_count FROM company_addresses WHERE company_ref_type = 'my_companies';
    SELECT COUNT(*) INTO contact_count FROM company_contacts WHERE company_ref_type = 'my_companies';
    SELECT COUNT(*) INTO ship_count FROM company_ship_via WHERE company_ref_type = 'my_companies';
    SELECT COUNT(*) INTO bank_count FROM company_bank_details WHERE company_ref_type = 'my_companies';
    
    RAISE NOTICE 'Related table validation: addresses=%, contacts=%, ship_via=%, bank_details=%', 
        addr_count, contact_count, ship_count, bank_count;
    
    IF addr_count > 0 OR contact_count > 0 OR ship_count > 0 OR bank_count > 0 THEN
        RAISE NOTICE 'Found records with my_companies references - will update them';
    END IF;
END $$;

-- Step 4: Update any remaining company_ref_type = 'my_companies' to 'companies'
UPDATE company_addresses 
SET company_ref_type = 'companies' 
WHERE company_ref_type = 'my_companies';

UPDATE company_contacts 
SET company_ref_type = 'companies' 
WHERE company_ref_type = 'my_companies';

UPDATE company_ship_via 
SET company_ref_type = 'companies' 
WHERE company_ref_type = 'my_companies';

UPDATE company_bank_details 
SET company_ref_type = 'companies' 
WHERE company_ref_type = 'my_companies';

-- Step 5: Drop the compatibility view first
DROP VIEW IF EXISTS my_companies_view;

-- Step 6: Drop the my_companies table
DROP TABLE IF EXISTS my_companies CASCADE;

-- Step 7: Verify table is dropped
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'my_companies') THEN
        RAISE EXCEPTION 'Failed to drop my_companies table';
    ELSE
        RAISE NOTICE 'Successfully dropped my_companies table';
    END IF;
END $$;

-- Step 8: Create proper foreign key constraints if missing
DO $$
BEGIN
    -- Add foreign key constraint for company_addresses if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'company_addresses_company_id_fkey'
        AND table_name = 'company_addresses'
    ) THEN
        ALTER TABLE company_addresses 
        ADD CONSTRAINT company_addresses_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added foreign key constraint: company_addresses_company_id_fkey';
    END IF;
    
    -- Add foreign key constraint for company_contacts if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'company_contacts_company_id_fkey'
        AND table_name = 'company_contacts'
    ) THEN
        ALTER TABLE company_contacts 
        ADD CONSTRAINT company_contacts_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added foreign key constraint: company_contacts_company_id_fkey';
    END IF;
    
    -- Add foreign key constraint for company_ship_via if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'company_ship_via_company_id_fkey'
        AND table_name = 'company_ship_via'
    ) THEN
        ALTER TABLE company_ship_via 
        ADD CONSTRAINT company_ship_via_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added foreign key constraint: company_ship_via_company_id_fkey';
    END IF;
    
    -- Add foreign key constraint for company_bank_details if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'company_bank_details_company_id_fkey'
        AND table_name = 'company_bank_details'
    ) THEN
        ALTER TABLE company_bank_details 
        ADD CONSTRAINT company_bank_details_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added foreign key constraint: company_bank_details_company_id_fkey';
    END IF;
END $$;

-- Step 9: Add foreign key constraints for order tables if missing
DO $$
BEGIN
    -- Purchase orders constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'purchase_orders_company_id_fkey'
        AND table_name = 'purchase_orders'
    ) THEN
        -- Check if company_id column exists in purchase_orders
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'purchase_orders' 
            AND column_name = 'company_id'
        ) THEN
            ALTER TABLE purchase_orders 
            ADD CONSTRAINT purchase_orders_company_id_fkey 
            FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE RESTRICT;
            
            RAISE NOTICE 'Added foreign key constraint: purchase_orders_company_id_fkey';
        ELSE
            RAISE NOTICE 'company_id column not found in purchase_orders table';
        END IF;
    END IF;
    
    -- Sales orders constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sales_orders_company_id_fkey'
        AND table_name = 'sales_orders'
    ) THEN
        -- Check if company_id column exists in sales_orders
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'sales_orders' 
            AND column_name = 'company_id'
        ) THEN
            ALTER TABLE sales_orders 
            ADD CONSTRAINT sales_orders_company_id_fkey 
            FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE RESTRICT;
            
            RAISE NOTICE 'Added foreign key constraint: sales_orders_company_id_fkey';
        ELSE
            RAISE NOTICE 'company_id column not found in sales_orders table';
        END IF;
    END IF;
END $$;

-- Step 10: Final success message
SELECT 'Company migration Phase 2 completed successfully' as result,
       COUNT(*) as total_companies,
       COUNT(*) FILTER (WHERE is_self = true) as internal_companies,
       COUNT(*) FILTER (WHERE is_self = false OR is_self IS NULL) as external_companies
FROM companies;