-- Enable Row Level Security for Company Tables
-- Phase 1: Emergency Security Fix

-- Step 1: Enable RLS on companies table
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Step 2: Enable RLS on my_companies table (will be dropped in Phase 2)
ALTER TABLE my_companies ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies for companies table

-- Policy for authenticated users to read companies
CREATE POLICY "authenticated_users_can_read_companies" ON companies
    FOR SELECT 
    TO authenticated 
    USING (true);

-- Policy for authenticated users to insert companies
CREATE POLICY "authenticated_users_can_insert_companies" ON companies
    FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

-- Policy for authenticated users to update companies
CREATE POLICY "authenticated_users_can_update_companies" ON companies
    FOR UPDATE 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- Policy for authenticated users to delete companies
CREATE POLICY "authenticated_users_can_delete_companies" ON companies
    FOR DELETE 
    TO authenticated 
    USING (true);

-- Step 4: Create RLS policies for my_companies table (temporary, for compatibility)

-- Policy for authenticated users to read my_companies
CREATE POLICY "authenticated_users_can_read_my_companies" ON my_companies
    FOR SELECT 
    TO authenticated 
    USING (true);

-- Policy for authenticated users to insert my_companies
CREATE POLICY "authenticated_users_can_insert_my_companies" ON my_companies
    FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

-- Policy for authenticated users to update my_companies
CREATE POLICY "authenticated_users_can_update_my_companies" ON my_companies
    FOR UPDATE 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- Policy for authenticated users to delete my_companies
CREATE POLICY "authenticated_users_can_delete_my_companies" ON my_companies
    FOR DELETE 
    TO authenticated 
    USING (true);

-- Step 5: Verify RLS is enabled
SELECT 
  'RLS Status Check' as check_type,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('companies', 'my_companies')
  AND schemaname = 'public'
ORDER BY tablename;

-- Success message
SELECT 'Row Level Security enabled successfully for company tables' as result;