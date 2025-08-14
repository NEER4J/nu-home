-- Test to check if the new columns exist in partner_leads table
-- Run this to see the current structure

SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'partner_leads' 
  AND table_schema = 'public'
  AND column_name IN ('product_info', 'addon_info', 'bundle_info')
ORDER BY column_name;

-- Also check if the table exists and show all columns
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'partner_leads' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
