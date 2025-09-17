-- Create email_field_mappings table for dynamic field mapping
-- This table stores mappings between database fields and template fields for various integrations

CREATE TABLE email_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_category_id UUID NOT NULL REFERENCES "ServiceCategories"(service_category_id) ON DELETE CASCADE,
  email_type VARCHAR(50) NOT NULL,
  template_field_name VARCHAR(100) NOT NULL,
  
  -- Data source configuration
  database_source VARCHAR(50) NOT NULL, -- 'quote_data', 'products_data', 'addons_data', 'checkout_data', 'survey_data', 'enquiry_data', 'save_quote_data'
  database_path JSONB NOT NULL, -- JSON path to the field
  
  -- Template configuration
  template_type VARCHAR(50) DEFAULT 'simple', -- 'simple', 'html_template', 'loop_template', 'format'
  
  -- HTML Template Storage
  html_template TEXT, -- Store complete HTML templates
  html_template_type VARCHAR(50), -- 'product_card', 'product_list', 'qa_pairs', 'addon_list', 'bundle_list', 'payment_plan', 'order_summary', 'custom'
  
  -- Loop configuration for arrays
  loop_config JSONB DEFAULT '{}'::jsonb, -- For handling arrays/loops
  
  -- Template variables and placeholders
  template_variables JSONB DEFAULT '{}'::jsonb, -- Define available variables for this template
  
  -- Integration support
  integration_types JSONB DEFAULT '["email"]'::jsonb, -- Array of integration types: email, ghl, webhook, etc.
  
  -- Field metadata
  display_name VARCHAR(200),
  description TEXT,
  field_category VARCHAR(100),
  is_required BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(partner_id, service_category_id, email_type, template_field_name)
);

-- Indexes for performance
CREATE INDEX email_field_mappings_partner_category_type_idx 
ON email_field_mappings(partner_id, service_category_id, email_type);

CREATE INDEX email_field_mappings_template_field_idx 
ON email_field_mappings(template_field_name);

CREATE INDEX email_field_mappings_integration_types_idx 
ON email_field_mappings USING GIN (integration_types);

CREATE INDEX email_field_mappings_database_source_idx 
ON email_field_mappings(database_source);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_email_field_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_field_mappings_updated_at_trigger
  BEFORE UPDATE ON email_field_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_email_field_mappings_updated_at();

-- Add comments for documentation
COMMENT ON TABLE email_field_mappings IS 'Stores mappings between database fields and template fields for various integrations';
COMMENT ON COLUMN email_field_mappings.database_source IS 'Source table/field in lead_submission_data (quote_data, products_data, etc.)';
COMMENT ON COLUMN email_field_mappings.database_path IS 'JSON path to the specific field within the database source';
COMMENT ON COLUMN email_field_mappings.html_template IS 'HTML template for complex field rendering';
COMMENT ON COLUMN email_field_mappings.integration_types IS 'Array of integration types this mapping supports (email, ghl, webhook, etc.)';
COMMENT ON COLUMN email_field_mappings.template_variables IS 'Available variables for this template with descriptions';
