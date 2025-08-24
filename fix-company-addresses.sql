-- Simple Fix for Company Address Constraint Conflict
-- Run this as database admin to resolve the foreign key constraint issue

-- Drop the problematic constraint that prevents My Company addresses from being saved
ALTER TABLE company_addresses DROP CONSTRAINT fk_company_companies;

-- Verify the constraint was removed
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'company_addresses'::regclass 
    AND contype = 'f';

-- Expected result: Only 'fk_company' constraint should remain
-- This allows My Company addresses to be saved successfully