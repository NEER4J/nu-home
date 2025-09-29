-- Add new fields to PartnerSettings table for content sections
ALTER TABLE public."PartnerSettings" 
ADD COLUMN IF NOT EXISTS review_section jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS main_cta jsonb DEFAULT '{}'::jsonb;

-- Add comments for the new fields
COMMENT ON COLUMN public."PartnerSettings".review_section IS 'Review section configuration to display on products page';
COMMENT ON COLUMN public."PartnerSettings".main_cta IS 'Main call-to-action section configuration';
