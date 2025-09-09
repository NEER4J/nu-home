-- Add main_page_url field to PartnerSettings table
ALTER TABLE public."PartnerSettings" 
ADD COLUMN main_page_url text NULL;

-- Add comment to explain the field
COMMENT ON COLUMN public."PartnerSettings".main_page_url IS 'The main page URL where the iframe is embedded, used to redirect users back from email links';

-- Create index for better performance when querying by main_page_url
CREATE INDEX IF NOT EXISTS partner_settings_main_page_url_idx 
ON public."PartnerSettings" 
USING btree (main_page_url) 
TABLESPACE pg_default
WHERE (main_page_url IS NOT NULL);
