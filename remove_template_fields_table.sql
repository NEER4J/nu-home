-- Script to remove template_fields table and its dependencies
-- Run this script if you want to completely remove the template_fields table

-- Drop the table (this will also drop all indexes and constraints)
DROP TABLE IF EXISTS public.template_fields CASCADE;

-- Note: This will remove all template field data permanently
-- Make sure you have backed up any important data before running this script

-- If you want to keep the table but just not use it, you can comment out the DROP statement above
-- and just leave the table in place for future use if needed
