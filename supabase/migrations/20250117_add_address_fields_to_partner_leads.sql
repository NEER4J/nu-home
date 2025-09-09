-- Add new address fields to partner_leads table
-- These fields will store detailed address information

-- Add new address columns
ALTER TABLE public.partner_leads 
ADD COLUMN IF NOT EXISTS address_line_1 character varying(255) NULL,
ADD COLUMN IF NOT EXISTS address_line_2 character varying(255) NULL,
ADD COLUMN IF NOT EXISTS street_name character varying(255) NULL,
ADD COLUMN IF NOT EXISTS street_number character varying(50) NULL,
ADD COLUMN IF NOT EXISTS building_name character varying(255) NULL,
ADD COLUMN IF NOT EXISTS sub_building character varying(100) NULL,
ADD COLUMN IF NOT EXISTS county character varying(255) NULL,
ADD COLUMN IF NOT EXISTS country character varying(100) NULL DEFAULT 'United Kingdom',
ADD COLUMN IF NOT EXISTS address_type character varying(50) NULL DEFAULT 'residential',
ADD COLUMN IF NOT EXISTS formatted_address text NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS partner_leads_address_line_1_idx 
ON public.partner_leads USING btree (address_line_1);

CREATE INDEX IF NOT EXISTS partner_leads_street_name_idx 
ON public.partner_leads USING btree (street_name);

CREATE INDEX IF NOT EXISTS partner_leads_town_city_idx 
ON public.partner_leads USING btree (city);

CREATE INDEX IF NOT EXISTS partner_leads_county_idx 
ON public.partner_leads USING btree (county);

CREATE INDEX IF NOT EXISTS partner_leads_address_type_idx 
ON public.partner_leads USING btree (address_type);

-- Add check constraint for address_type
ALTER TABLE public.partner_leads 
ADD CONSTRAINT partner_leads_address_type_chk 
CHECK (address_type = ANY(ARRAY['residential', 'business', 'commercial']));

-- Update existing records to populate new fields from form_answers if available
UPDATE public.partner_leads 
SET 
  address_line_1 = (form_answers->>'address_details'->>'address_line_1')::character varying(255),
  address_line_2 = (form_answers->>'address_details'->>'address_line_2')::character varying(255),
  street_name = (form_answers->>'address_details'->>'street_name')::character varying(255),
  street_number = (form_answers->>'address_details'->>'street_number')::character varying(50),
  building_name = (form_answers->>'address_details'->>'building_name')::character varying(255),
  sub_building = (form_answers->>'address_details'->>'sub_building')::character varying(100),
  county = (form_answers->>'address_details'->>'county')::character varying(255),
  country = COALESCE((form_answers->>'address_details'->>'country')::character varying(100), 'United Kingdom'),
  address_type = COALESCE((form_answers->>'address_details'->>'address_type')::character varying(50), 'residential'),
  formatted_address = (form_answers->>'address_details'->>'formatted_address')::text
WHERE form_answers->>'address_details' IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.partner_leads.address_line_1 IS 'Primary address line (e.g., "123 High Street")';
COMMENT ON COLUMN public.partner_leads.address_line_2 IS 'Secondary address line (e.g., "Apartment 4B")';
COMMENT ON COLUMN public.partner_leads.street_name IS 'Street name without number';
COMMENT ON COLUMN public.partner_leads.street_number IS 'House/building number or flat number';
COMMENT ON COLUMN public.partner_leads.building_name IS 'Building name (e.g., "The Old Post Office")';
COMMENT ON COLUMN public.partner_leads.sub_building IS 'Unit, flat, or apartment identifier';
COMMENT ON COLUMN public.partner_leads.county IS 'County or administrative area';
COMMENT ON COLUMN public.partner_leads.country IS 'Country name';
COMMENT ON COLUMN public.partner_leads.address_type IS 'Type of address: residential, business, or commercial';
COMMENT ON COLUMN public.partner_leads.formatted_address IS 'Complete formatted address string';
