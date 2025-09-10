-- Add tags field to ghl_field_mappings table
-- This allows storing multiple tags as a JSON array for each mapping

ALTER TABLE public.ghl_field_mappings 
ADD COLUMN IF NOT EXISTS tags jsonb NULL DEFAULT '[]'::jsonb;

-- Add comment for the new column
COMMENT ON COLUMN public.ghl_field_mappings.tags IS 'JSON array of tags to be applied to contacts created through this mapping';

-- Create index for better performance when querying tags
CREATE INDEX IF NOT EXISTS idx_ghl_field_mappings_tags ON public.ghl_field_mappings USING gin (tags) TABLESPACE pg_default;