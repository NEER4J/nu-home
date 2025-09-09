-- Add GTM event name field to PartnerSettings table
ALTER TABLE "PartnerSettings" 
ADD COLUMN IF NOT EXISTS gtm_event_name VARCHAR(255);

-- Add comment to explain the field
COMMENT ON COLUMN "PartnerSettings".gtm_event_name IS 'GTM event name to trigger on quote submission for this service category';
