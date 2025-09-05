-- Add admin_email field to PartnerSettings table
ALTER TABLE public."PartnerSettings" 
ADD COLUMN admin_email text NULL;

-- Add comment to explain the field
COMMENT ON COLUMN public."PartnerSettings".admin_email IS 'Admin email address for this partner and service category combination. Used for sending category-specific admin notifications.';

-- Create index for admin_email queries
CREATE INDEX IF NOT EXISTS partner_settings_admin_email_idx 
ON public."PartnerSettings" USING btree (admin_email) 
TABLESPACE pg_default
WHERE (admin_email IS NOT NULL);
