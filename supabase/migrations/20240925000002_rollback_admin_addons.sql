-- Rollback migration for AdminAddons
-- This file can be used to undo the changes made in 20240925000001_create_admin_addons.sql

-- Remove the foreign key constraint and column from Addons table
ALTER TABLE public."Addons" 
DROP CONSTRAINT IF EXISTS addons_base_admin_addon_id_fkey;

ALTER TABLE public."Addons" 
DROP COLUMN IF EXISTS base_admin_addon_id;

-- Drop the AdminAddons table (this will cascade to remove indexes and triggers)
DROP TABLE IF EXISTS public."AdminAddons" CASCADE;
