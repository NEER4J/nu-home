-- Create email templates table for partner-specific email customization
CREATE TABLE public.email_templates (
  template_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  partner_id uuid NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'boiler', 'solar', etc.
  email_type VARCHAR(50) NOT NULL, -- 'quote-initial', 'checkout-stripe', etc.
  recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('customer', 'admin')),
  
  -- Template content
  subject_template TEXT NOT NULL,
  html_template TEXT NOT NULL,
  text_template TEXT,
  
  -- Template metadata
  name VARCHAR(255),
  description TEXT,
  
  -- Dynamic fields configuration
  dynamic_fields JSONB DEFAULT '[]'::jsonb,
  
  -- Styling configuration
  styling JSONB DEFAULT '{
    "primaryColor": "#3b82f6",
    "fontFamily": "Arial, sans-serif",
    "headerBgColor": "#3b82f6",
    "footerBgColor": "#f9fafb"
  }'::jsonb,
  
  -- Status and versioning
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT email_templates_pkey PRIMARY KEY (template_id),
  CONSTRAINT email_templates_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create template fields definition table
CREATE TABLE public.template_fields (
  field_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  category VARCHAR(50) NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'boolean', 'list', 'table')),
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT true, -- System fields can't be deleted
  default_value TEXT,
  validation_rules JSONB,
  sample_value TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT template_fields_pkey PRIMARY KEY (field_id),
  CONSTRAINT template_fields_unique_name UNIQUE (category, field_name)
);

-- Create template versions table for history
CREATE TABLE public.email_template_versions (
  version_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  template_id uuid NOT NULL,
  version_number INTEGER NOT NULL,
  subject_template TEXT NOT NULL,
  html_template TEXT NOT NULL,
  text_template TEXT,
  dynamic_fields JSONB,
  styling JSONB,
  created_by uuid,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT email_template_versions_pkey PRIMARY KEY (version_id),
  CONSTRAINT email_template_versions_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.email_templates(template_id) ON DELETE CASCADE,
  CONSTRAINT email_template_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX idx_email_templates_partner_id ON public.email_templates(partner_id);
CREATE INDEX idx_email_templates_category ON public.email_templates(category);
CREATE INDEX idx_email_templates_email_type ON public.email_templates(email_type);
CREATE INDEX idx_email_templates_active ON public.email_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_template_fields_category ON public.template_fields(category);

-- Create unique constraint for active templates only
CREATE UNIQUE INDEX idx_email_templates_unique_active 
ON public.email_templates(partner_id, category, email_type, recipient_type) 
WHERE is_active = true;

-- Insert default template fields for boiler category
INSERT INTO public.template_fields (category, field_name, field_type, display_name, description, is_required, is_system, sample_value) VALUES
-- Customer fields
('boiler', 'firstName', 'text', 'First Name', 'Customer first name', true, true, 'John'),
('boiler', 'lastName', 'text', 'Last Name', 'Customer last name', true, true, 'Doe'),
('boiler', 'email', 'text', 'Email', 'Customer email address', true, true, 'john.doe@example.com'),
('boiler', 'phone', 'text', 'Phone', 'Customer phone number', false, true, '07123456789'),
('boiler', 'postcode', 'text', 'Postcode', 'Customer postcode', true, true, 'SW1A 1AA'),
('boiler', 'refNumber', 'text', 'Reference Number', 'Quote reference number', true, true, 'REF-2024-001'),
('boiler', 'submissionId', 'text', 'Submission ID', 'Unique submission identifier', true, true, '896cd588-20e5-45c2-8c30-2622958bfca2'),

-- Company fields
('boiler', 'companyName', 'text', 'Company Name', 'Partner company name', true, true, 'ABC Boilers Ltd'),
('boiler', 'companyPhone', 'text', 'Company Phone', 'Company contact phone', false, true, '0800 123 4567'),
('boiler', 'companyEmail', 'text', 'Company Email', 'Company contact email', false, true, 'info@abcboilers.com'),
('boiler', 'companyAddress', 'text', 'Company Address', 'Company full address', false, true, '123 Business St, London'),
('boiler', 'companyWebsite', 'text', 'Company Website', 'Company website URL', false, true, 'https://www.abcboilers.com'),
('boiler', 'logoUrl', 'text', 'Logo URL', 'Company logo image URL', false, true, 'https://example.com/logo.png'),

-- Quote fields
('boiler', 'quoteInfo', 'table', 'Quote Information', 'Detailed quote information', false, true, 'Boiler Type: Combi\nProperty Type: Semi-detached'),
('boiler', 'addressInfo', 'table', 'Address Information', 'Property address details', false, true, 'Line 1: 123 Main St\nCity: London'),
('boiler', 'submissionDate', 'date', 'Submission Date', 'Date of quote submission', true, true, '2024-01-15'),

-- Dynamic content fields
('boiler', 'productName', 'text', 'Product Name', 'Selected product name', false, false, 'Worcester Bosch 30kW Combi'),
('boiler', 'productPrice', 'number', 'Product Price', 'Product price', false, false, '2500'),
('boiler', 'installationDate', 'date', 'Installation Date', 'Scheduled installation date', false, false, '2024-01-20'),
('boiler', 'paymentMethod', 'text', 'Payment Method', 'Selected payment method', false, false, 'Monthly Payment Plan'),

-- Links
('boiler', 'quoteLink', 'text', 'Quote Link', 'Link to view full quote', false, true, 'https://example.com/quote/123'),
('boiler', 'privacyPolicy', 'text', 'Privacy Policy', 'Privacy policy text or link', false, true, 'Privacy Policy'),
('boiler', 'termsConditions', 'text', 'Terms & Conditions', 'Terms and conditions text or link', false, true, 'Terms & Conditions');

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_templates_timestamp
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION update_email_template_timestamp();

CREATE TRIGGER update_template_fields_timestamp
BEFORE UPDATE ON public.template_fields
FOR EACH ROW
EXECUTE FUNCTION update_email_template_timestamp();

-- Grant permissions
GRANT ALL ON public.email_templates TO authenticated;
GRANT ALL ON public.template_fields TO authenticated;
GRANT ALL ON public.email_template_versions TO authenticated;
