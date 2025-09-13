-- Fix timestamp error in field mappings
-- This migration fixes the timestamp issue by using proper NOW() function

-- First, let's drop the existing table if it exists to avoid conflicts
DROP TABLE IF EXISTS email_field_mappings CASCADE;

-- Recreate the table with proper structure
CREATE TABLE email_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_category_id UUID NOT NULL REFERENCES "ServiceCategories"(service_category_id) ON DELETE CASCADE,
  email_type VARCHAR(50) NOT NULL,
  template_field_name VARCHAR(100) NOT NULL,
  
  -- Data source configuration
  database_source VARCHAR(50) NOT NULL, -- 'quote_data', 'products_data', 'addons_data', 'checkout_data', 'survey_data', 'enquiry_data'
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

-- Create indexes for performance
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

-- Insert default field mappings with proper timestamps
INSERT INTO email_field_mappings (
  partner_id,
  service_category_id,
  email_type,
  template_field_name,
  database_source,
  database_path,
  template_type,
  html_template,
  html_template_type,
  loop_config,
  template_variables,
  integration_types,
  display_name,
  description,
  field_category,
  is_required,
  is_system,
  is_active
) VALUES 
-- Contact Information
(
  '00000000-0000-0000-0000-000000000000', -- System default (will be overridden per partner)
  '00000000-0000-0000-0000-000000000000', -- System default (will be overridden per category)
  'quote-initial',
  'customer_name',
  'quote_data',
  '{"path": "contact_details.first_name"}',
  'format',
  NULL,
  'name',
  '{}',
  '{}',
  '["email", "ghl", "webhook"]',
  'Customer Name',
  'Customer first name',
  'Contact',
  true,
  true,
  true
),
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  'quote-initial',
  'customer_full_name',
  'quote_data',
  '{"path": "contact_details"}',
  'format',
  NULL,
  'full_name',
  '{}',
  '{}',
  '["email", "ghl", "webhook"]',
  'Customer Full Name',
  'Customer full name (first + last)',
  'Contact',
  true,
  true,
  true
),
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  'quote-initial',
  'customer_email',
  'quote_data',
  '{"path": "contact_details.email"}',
  'simple',
  NULL,
  NULL,
  '{}',
  '{}',
  '["email", "ghl", "webhook"]',
  'Customer Email',
  'Customer email address',
  'Contact',
  true,
  true,
  true
),
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  'quote-initial',
  'customer_phone',
  'quote_data',
  '{"path": "contact_details.phone"}',
  'format',
  NULL,
  'phone',
  '{}',
  '{}',
  '["email", "ghl", "webhook"]',
  'Customer Phone',
  'Customer phone number',
  'Contact',
  true,
  true,
  true
),
-- Address Information
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  'quote-initial',
  'property_address',
  'quote_data',
  '{"path": "selected_address"}',
  'format',
  NULL,
  'address_string',
  '{}',
  '{}',
  '["email", "ghl", "webhook"]',
  'Property Address',
  'Full property address',
  'Address',
  true,
  true,
  true
),
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  'quote-initial',
  'property_postcode',
  'quote_data',
  '{"path": "selected_address.postcode"}',
  'simple',
  NULL,
  NULL,
  '{}',
  '{}',
  '["email", "ghl", "webhook"]',
  'Property Postcode',
  'Property postcode',
  'Address',
  true,
  true,
  true
);

-- Create a function to copy default mappings for new partners/categories
CREATE OR REPLACE FUNCTION copy_default_field_mappings(
  p_partner_id UUID,
  p_service_category_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Copy all default mappings for the new partner/category
  INSERT INTO email_field_mappings (
    partner_id,
    service_category_id,
    email_type,
    template_field_name,
    database_source,
    database_path,
    template_type,
    html_template,
    html_template_type,
    loop_config,
    template_variables,
    integration_types,
    display_name,
    description,
    field_category,
    is_required,
    is_system,
    is_active
  )
  SELECT 
    p_partner_id,
    p_service_category_id,
    email_type,
    template_field_name,
    database_source,
    database_path,
    template_type,
    html_template,
    html_template_type,
    loop_config,
    template_variables,
    integration_types,
    display_name,
    description,
    field_category,
    is_required,
    is_system,
    is_active
  FROM email_field_mappings
  WHERE partner_id = '00000000-0000-0000-0000-000000000000'
    AND service_category_id = '00000000-0000-0000-0000-000000000000'
    AND is_system = true;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE email_field_mappings IS 'Stores mappings between database fields and template fields for various integrations';
COMMENT ON FUNCTION copy_default_field_mappings IS 'Copies default field mappings for a new partner/category combination';
