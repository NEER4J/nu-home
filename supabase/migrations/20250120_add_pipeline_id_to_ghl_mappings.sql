-- Add pipeline_id column to ghl_field_mappings table
-- This allows tracking which pipeline the opportunity belongs to

ALTER TABLE public.ghl_field_mappings 
ADD COLUMN IF NOT EXISTS pipeline_id text NULL;

-- Add comment for the new column
COMMENT ON COLUMN public.ghl_field_mappings.pipeline_id IS 'GHL pipeline ID that the opportunity belongs to';