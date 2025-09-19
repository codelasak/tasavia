-- Ensure application roles can access the public schema

-- Grant schema usage (required to access objects within the schema)
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated;

-- If you plan to allow anonymous read access, uncomment the line below
-- GRANT USAGE ON SCHEMA public TO anon;

