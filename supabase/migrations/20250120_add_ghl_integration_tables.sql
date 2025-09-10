-- Add GoHighLevel integration tables
-- This migration creates tables for storing GHL OAuth data and field mappings

-- Table for storing GHL OAuth integration data (one per partner)
CREATE TABLE IF NOT EXISTS public.ghl_integrations (
  integration_id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  partner_id uuid NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamp with time zone NOT NULL,
  company_id text NOT NULL,
  location_id text NULL, -- For sub-account tokens
  user_type text NOT NULL CHECK (user_type IN ('Company', 'Location')),
  scope text NOT NULL,
  refresh_token_id text NOT NULL,
  user_id text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ghl_integrations_pkey PRIMARY KEY (integration_id),
  CONSTRAINT ghl_integrations_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES auth.users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Table for storing GHL field mappings (similar to email_templates structure)
CREATE TABLE IF NOT EXISTS public.ghl_field_mappings (
  mapping_id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  partner_id uuid NOT NULL,
  service_category_id uuid NOT NULL,
  email_type character varying(50) NOT NULL,
  recipient_type character varying(20) NOT NULL CHECK (recipient_type IN ('customer', 'admin')),
  opportunity_id text NULL, -- GHL opportunity ID
  opportunity_stage text NULL, -- GHL opportunity stage
  field_mappings jsonb NOT NULL DEFAULT '{}'::jsonb, -- Maps our dynamic fields to GHL custom fields
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ghl_field_mappings_pkey PRIMARY KEY (mapping_id),
  CONSTRAINT ghl_field_mappings_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT ghl_field_mappings_service_category_id_fkey FOREIGN KEY (service_category_id) REFERENCES "ServiceCategories" (service_category_id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ghl_integrations_partner_id ON public.ghl_integrations USING btree (partner_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_ghl_integrations_active ON public.ghl_integrations USING btree (is_active) TABLESPACE pg_default WHERE (is_active = true);
CREATE INDEX IF NOT EXISTS idx_ghl_integrations_company_id ON public.ghl_integrations USING btree (company_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_ghl_field_mappings_partner_id ON public.ghl_field_mappings USING btree (partner_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_ghl_field_mappings_service_category_id ON public.ghl_field_mappings USING btree (service_category_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_ghl_field_mappings_email_type ON public.ghl_field_mappings USING btree (email_type) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_ghl_field_mappings_active ON public.ghl_field_mappings USING btree (is_active) TABLESPACE pg_default WHERE (is_active = true);

-- Unique constraint for active mappings
CREATE UNIQUE INDEX IF NOT EXISTS idx_ghl_field_mappings_unique_active ON public.ghl_field_mappings USING btree (
  partner_id,
  service_category_id,
  email_type,
  recipient_type
) TABLESPACE pg_default WHERE (is_active = true);

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_ghl_integration_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_ghl_field_mapping_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_ghl_integrations_timestamp
  BEFORE UPDATE ON public.ghl_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_ghl_integration_timestamp();

CREATE TRIGGER update_ghl_field_mappings_timestamp
  BEFORE UPDATE ON public.ghl_field_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_ghl_field_mapping_timestamp();

-- Add comments
COMMENT ON TABLE public.ghl_integrations IS 'Stores GoHighLevel OAuth integration data for each partner';
COMMENT ON TABLE public.ghl_field_mappings IS 'Stores field mappings between email templates and GHL custom fields';
COMMENT ON COLUMN public.ghl_field_mappings.field_mappings IS 'JSON object mapping our dynamic fields to GHL custom field IDs';
COMMENT ON COLUMN public.ghl_field_mappings.opportunity_id IS 'GHL opportunity ID where contacts will be created';
COMMENT ON COLUMN public.ghl_field_mappings.opportunity_stage IS 'GHL opportunity stage for new contacts';
