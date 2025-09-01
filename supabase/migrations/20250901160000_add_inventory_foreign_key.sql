-- Add foreign key constraint to establish proper relationship between inventory and pn_master_table
-- This is required for Supabase PostgREST API to understand the relationship for nested queries

ALTER TABLE inventory 
ADD CONSTRAINT fk_inventory_pn_id 
FOREIGN KEY (pn_id) REFERENCES pn_master_table(pn_id) 
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add comment to document the relationship
COMMENT ON CONSTRAINT fk_inventory_pn_id ON inventory IS 'Foreign key to pn_master_table for part number details';