-- Fix company_addresses constraint conflict
-- 
-- Problem: The company_addresses table has two conflicting foreign key constraints:
-- 1. fk_company -> references my_companies(my_company_id) 
-- 2. fk_company_companies -> references companies(company_id)
--
-- When saving addresses for "My Companies", the company_id exists in my_companies
-- but not in companies table, causing fk_company_companies constraint to fail.
--
-- Solution: Drop the conflicting constraint and keep only the correct one.

-- Drop the problematic constraint
ALTER TABLE company_addresses DROP CONSTRAINT IF EXISTS fk_company_companies;

-- Verify only the correct constraint remains
-- The fk_company constraint should still exist and validate against my_companies table