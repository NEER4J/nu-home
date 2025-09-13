-- Create default field mappings for quote page data
-- This migration populates the email_field_mappings table with essential mappings for boiler quotes

-- Insert default field mappings for quote-initial email type
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
  is_active,
  created_at,
  updated_at
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
  true,
  NOW(),
  NOW()
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
),

-- Form Answers (Q&A Pairs)
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  'quote-initial',
  'form_answers_text',
  'quote_data',
  '{"path": "form_answers"}',
  'format',
  NULL,
  'qa_pairs',
  '{}',
  '{}',
  '["email", "ghl", "webhook"]',
  'Form Answers (Text)',
  'Form answers as plain text',
  'Form Data',
  false,
  true,
  true
),
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  'quote-initial',
  'form_answers_html',
  'quote_data',
  '{"path": "form_answers"}',
  'html_template',
  '<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <thead>
      <tr style="background-color: #f3f4f6;">
        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #d1d5db;">Question</th>
        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #d1d5db;">Answer</th>
      </tr>
    </thead>
    <tbody>
      {{#each form_answers}}
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 0; width: 40%; font-weight: 600; color: #374151;">{{question_text}}:</td>
        <td style="padding: 12px 0; color: #6b7280;">{{answer}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>',
  'qa_pairs',
  '{}',
  '{}',
  '["email", "ghl", "webhook"]',
  'Form Answers (HTML)',
  'Form answers as HTML table',
  'Form Data',
  false,
  true,
  true
),

-- Specific Form Questions (for easy access)
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  'quote-initial',
  'boiler_type',
  'quote_data',
  '{"path": "form_answers.boiler_type.answer"}',
  'simple',
  NULL,
  NULL,
  '{}',
  '{}',
  '["email", "ghl", "webhook"]',
  'Boiler Type',
  'Type of boiler needed',
  'Form Data',
  false,
  true,
  true
),
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  'quote-initial',
  'property_type',
  'quote_data',
  '{"path": "form_answers.property_type.answer"}',
  'simple',
  NULL,
  NULL,
  '{}',
  '{}',
  '["email", "ghl", "webhook"]',
  'Property Type',
  'Type of property',
  'Form Data',
  false,
  true,
  true
),
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  'quote-initial',
  'timeline',
  'quote_data',
  '{"path": "form_answers.timeline.answer"}',
  'simple',
  NULL,
  NULL,
  '{}',
  '{}',
  '["email", "ghl", "webhook"]',
  'Installation Timeline',
  'When customer wants installation',
  'Form Data',
  false,
  true,
  true
),

-- System Fields
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  'quote-initial',
  'submission_date',
  'quote_data',
  '{"path": "created_at"}',
  'format',
  NULL,
  'date',
  '{}',
  '{}',
  '["email", "ghl", "webhook"]',
  'Submission Date',
  'Date when quote was submitted',
  'System',
  false,
  true,
  true
),
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  'quote-initial',
  'submission_id',
  'quote_data',
  '{"path": "submission_id"}',
  'simple',
  NULL,
  NULL,
  '{}',
  '{}',
  '["email", "ghl", "webhook"]',
  'Submission ID',
  'Unique submission identifier',
  'System',
  false,
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
COMMENT ON FUNCTION copy_default_field_mappings IS 'Copies default field mappings for a new partner/category combination';
