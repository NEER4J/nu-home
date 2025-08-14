-- Migration runner for partner_leads table
-- This will add the new columns if they don't exist

-- First, let's check if the columns already exist
DO $$
BEGIN
    -- Check if product_info column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'partner_leads' 
        AND table_schema = 'public' 
        AND column_name = 'product_info'
    ) THEN
        ALTER TABLE public.partner_leads ADD COLUMN product_info jsonb DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Added product_info column';
    ELSE
        RAISE NOTICE 'product_info column already exists';
    END IF;

    -- Check if addon_info column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'partner_leads' 
        AND table_schema = 'public' 
        AND column_name = 'addon_info'
    ) THEN
        ALTER TABLE public.partner_leads ADD COLUMN addon_info jsonb DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added addon_info column';
    ELSE
        RAISE NOTICE 'addon_info column already exists';
    END IF;

    -- Check if bundle_info column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'partner_leads' 
        AND table_schema = 'public' 
        AND column_name = 'bundle_info'
    ) THEN
        ALTER TABLE public.partner_leads ADD COLUMN bundle_info jsonb DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added bundle_info column';
    ELSE
        RAISE NOTICE 'bundle_info column already exists';
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS partner_leads_product_info_idx 
ON public.partner_leads USING GIN (product_info);

CREATE INDEX IF NOT EXISTS partner_leads_addon_info_idx 
ON public.partner_leads USING GIN (addon_info);

CREATE INDEX IF NOT EXISTS partner_leads_bundle_info_idx 
ON public.partner_leads USING GIN (bundle_info);

-- Verify the columns exist
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
