-- Add Stripe and Kanda Finance settings columns to UserProfiles table
-- This migration adds support for encrypted payment gateway settings

-- Add stripe_settings column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'UserProfiles' 
        AND table_schema = 'public' 
        AND column_name = 'stripe_settings'
    ) THEN
        ALTER TABLE public."UserProfiles" ADD COLUMN stripe_settings jsonb DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Added stripe_settings column';
    ELSE
        RAISE NOTICE 'stripe_settings column already exists';
    END IF;
END $$;

-- Add kanda_settings column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'UserProfiles' 
        AND table_schema = 'public' 
        AND column_name = 'kanda_settings'
    ) THEN
        ALTER TABLE public."UserProfiles" ADD COLUMN kanda_settings jsonb DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Added kanda_settings column';
    ELSE
        RAISE NOTICE 'kanda_settings column already exists';
    END IF;
END $$;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS userprofiles_stripe_settings_idx 
ON public."UserProfiles" USING GIN (stripe_settings);

CREATE INDEX IF NOT EXISTS userprofiles_kanda_settings_idx 
ON public."UserProfiles" USING GIN (kanda_settings);

-- Verify the columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'UserProfiles' 
  AND table_schema = 'public'
  AND column_name IN ('stripe_settings', 'kanda_settings')
ORDER BY column_name;
