-- Add product_info, addon_info, and bundle_info columns to partner_leads table
-- These columns will store product, addon, and bundle details for easy access across pages

-- Product info column
ALTER TABLE public.partner_leads
ADD COLUMN IF NOT EXISTS product_info jsonb DEFAULT '{}'::jsonb;

-- Addon info column (array of addon objects)
ALTER TABLE public.partner_leads
ADD COLUMN IF NOT EXISTS addon_info jsonb DEFAULT '[]'::jsonb;

-- Bundle info column (array of bundle objects)
ALTER TABLE public.partner_leads
ADD COLUMN IF NOT EXISTS bundle_info jsonb DEFAULT '[]'::jsonb;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS partner_leads_product_info_idx 
ON public.partner_leads USING GIN (product_info);

CREATE INDEX IF NOT EXISTS partner_leads_addon_info_idx 
ON public.partner_leads USING GIN (addon_info);

CREATE INDEX IF NOT EXISTS partner_leads_bundle_info_idx 
ON public.partner_leads USING GIN (bundle_info);

-- Example structure of product_info:
-- {
--   "product_id": "uuid",
--   "name": "string",
--   "price": number,
--   "image_url": "string"
-- }

-- Example structure of addon_info:
-- [
--   {
--     "addon_id": "uuid",
--     "name": "string",
--     "price": number,
--     "quantity": number
--   }
-- ]

-- Example structure of bundle_info:
-- [
--   {
--     "bundle_id": "uuid",
--     "name": "string",
--     "price": number,
--     "quantity": number
--   }
-- ]
