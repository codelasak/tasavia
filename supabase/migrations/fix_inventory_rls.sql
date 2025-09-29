-- Fix Inventory Table RLS Policies
-- Add missing INSERT, UPDATE, DELETE policies for authenticated users

-- Step 1: Remove existing policy that might be conflicting
DROP POLICY IF EXISTS "inventory_read_authenticated" ON inventory;

-- Step 2: Create comprehensive policy for all operations
CREATE POLICY "Enable all operations for authenticated users"
ON public.inventory
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);