-- Add payment-related fields to PartnerSettings table
-- This migration adds support for category-specific payment gateway settings

-- Add is_stripe_enabled column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'PartnerSettings' 
        AND table_schema = 'public' 
        AND column_name = 'is_stripe_enabled'
    ) THEN
        ALTER TABLE public."PartnerSettings" ADD COLUMN is_stripe_enabled boolean DEFAULT false;
        RAISE NOTICE 'Added is_stripe_enabled column';
    ELSE
        RAISE NOTICE 'is_stripe_enabled column already exists';
    END IF;
END $$;

-- Add is_kanda_enabled column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'PartnerSettings' 
        AND table_schema = 'public' 
        AND column_name = 'is_kanda_enabled'
    ) THEN
        ALTER TABLE public."PartnerSettings" ADD COLUMN is_kanda_enabled boolean DEFAULT false;
        RAISE NOTICE 'Added is_kanda_enabled column';
    ELSE
        RAISE NOTICE 'is_kanda_enabled column already exists';
    END IF;
END $$;

-- Add is_monthly_payment_enabled column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'PartnerSettings' 
        AND table_schema = 'public' 
        AND column_name = 'is_monthly_payment_enabled'
    ) THEN
        ALTER TABLE public."PartnerSettings" ADD COLUMN is_monthly_payment_enabled boolean DEFAULT false;
        RAISE NOTICE 'Added is_monthly_payment_enabled column';
    ELSE
        RAISE NOTICE 'is_monthly_payment_enabled column already exists';
    END IF;
END $$;

-- Add is_pay_after_installation_enabled column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'PartnerSettings' 
        AND table_schema = 'public' 
        AND column_name = 'is_pay_after_installation_enabled'
    ) THEN
        ALTER TABLE public."PartnerSettings" ADD COLUMN is_pay_after_installation_enabled boolean DEFAULT false;
        RAISE NOTICE 'Added is_pay_after_installation_enabled column';
    ELSE
        RAISE NOTICE 'is_pay_after_installation_enabled column already exists';
    END IF;
END $$;

-- Create indexes for the new boolean columns for better query performance
CREATE INDEX IF NOT EXISTS partner_settings_stripe_enabled_idx 
ON public."PartnerSettings" USING btree (is_stripe_enabled) 
WHERE is_stripe_enabled = true;

CREATE INDEX IF NOT EXISTS partner_settings_kanda_enabled_idx 
ON public."PartnerSettings" USING btree (is_kanda_enabled) 
WHERE is_kanda_enabled = true;

CREATE INDEX IF NOT EXISTS partner_settings_monthly_payment_enabled_idx 
ON public."PartnerSettings" USING btree (is_monthly_payment_enabled) 
WHERE is_monthly_payment_enabled = true;

CREATE INDEX IF NOT EXISTS partner_settings_pay_after_installation_enabled_idx 
ON public."PartnerSettings" USING btree (is_pay_after_installation_enabled) 
WHERE is_pay_after_installation_enabled = true;

-- Verify the columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'PartnerSettings' 
  AND table_schema = 'public'
  AND column_name IN ('is_stripe_enabled', 'is_kanda_enabled', 'is_monthly_payment_enabled', 'is_pay_after_installation_enabled')
ORDER BY column_name;
