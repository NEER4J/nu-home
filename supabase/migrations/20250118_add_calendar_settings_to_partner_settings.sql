-- Add calendar_settings field to PartnerSettings table
-- This will store multiple calendar configurations for different purposes

ALTER TABLE public."PartnerSettings" 
ADD COLUMN calendar_settings JSONB DEFAULT '{}'::jsonb;

-- Add comment to explain the structure
COMMENT ON COLUMN public."PartnerSettings".calendar_settings IS 'Stores calendar configurations for different purposes like survey bookings, appointments, etc. Structure: {"survey_booking": {"enabled": true, "calendar_id": "cal_123", "calendar_name": "Survey Bookings"}, "appointments": {"enabled": false, "calendar_id": null, "calendar_name": null}}';

-- Create index for better performance on calendar_settings queries
CREATE INDEX IF NOT EXISTS idx_partner_settings_calendar_settings 
ON public."PartnerSettings" USING GIN (calendar_settings);
