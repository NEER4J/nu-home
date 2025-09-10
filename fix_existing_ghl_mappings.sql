-- Fix existing ghl_field_mappings records that might not have tags initialized
-- This ensures all existing records have the tags field properly set

UPDATE public.ghl_field_mappings 
SET tags = '[]'::jsonb 
WHERE tags IS NULL;

-- Verify the update
SELECT 
  mapping_id,
  recipient_type,
  tags,
  tags IS NULL as tags_is_null,
  jsonb_typeof(tags) as tags_type
FROM public.ghl_field_mappings 
ORDER BY created_at DESC 
LIMIT 10;
