-- Create lead_submission_data table for tracking user journey data
-- This table stores comprehensive data for each step of the user flow

CREATE TABLE lead_submission_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES partner_leads(submission_id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    service_category_id UUID NOT NULL REFERENCES "ServiceCategories"(service_category_id),
    
    -- Separate JSON fields for each page/action
    quote_data JSONB DEFAULT '{}'::jsonb,
    products_data JSONB DEFAULT '{}'::jsonb,
    addons_data JSONB DEFAULT '{}'::jsonb,
    survey_data JSONB DEFAULT '{}'::jsonb,
    checkout_data JSONB DEFAULT '{}'::jsonb,
    enquiry_data JSONB DEFAULT '{}'::jsonb,
    success_data JSONB DEFAULT '{}'::jsonb,
    
    -- Form submissions tracking
    form_submissions JSONB DEFAULT '[]'::jsonb,
    
    -- Track user session/device info
    session_id VARCHAR(255),
    device_info JSONB DEFAULT '{}'::jsonb,
    
    -- Track conversion funnel
    conversion_events JSONB DEFAULT '[]'::jsonb,
    
    -- Track time spent on each page
    page_timings JSONB DEFAULT '{}'::jsonb,
    
    -- Progress tracking
    current_page VARCHAR(50),
    pages_completed JSONB DEFAULT '[]'::jsonb,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add unique constraint on submission_id since each submission should have only one record
    CONSTRAINT lead_submission_data_submission_id_unique UNIQUE (submission_id)
);

-- Individual GIN indexes for each JSON field
CREATE INDEX lead_submission_data_quote_data_idx ON lead_submission_data USING GIN (quote_data);
CREATE INDEX lead_submission_data_products_data_idx ON lead_submission_data USING GIN (products_data);
CREATE INDEX lead_submission_data_addons_data_idx ON lead_submission_data USING GIN (addons_data);
CREATE INDEX lead_submission_data_survey_data_idx ON lead_submission_data USING GIN (survey_data);
CREATE INDEX lead_submission_data_checkout_data_idx ON lead_submission_data USING GIN (checkout_data);
CREATE INDEX lead_submission_data_enquiry_data_idx ON lead_submission_data USING GIN (enquiry_data);
CREATE INDEX lead_submission_data_success_data_idx ON lead_submission_data USING GIN (success_data);
CREATE INDEX lead_submission_data_form_submissions_idx ON lead_submission_data USING GIN (form_submissions);
CREATE INDEX lead_submission_data_device_info_idx ON lead_submission_data USING GIN (device_info);
CREATE INDEX lead_submission_data_conversion_events_idx ON lead_submission_data USING GIN (conversion_events);
CREATE INDEX lead_submission_data_page_timings_idx ON lead_submission_data USING GIN (page_timings);
CREATE INDEX lead_submission_data_pages_completed_idx ON lead_submission_data USING GIN (pages_completed);

-- Additional indexes for better query performance
CREATE INDEX lead_submission_data_submission_id_idx ON lead_submission_data (submission_id);
CREATE INDEX lead_submission_data_partner_id_idx ON lead_submission_data (partner_id);
CREATE INDEX lead_submission_data_service_category_id_idx ON lead_submission_data (service_category_id);
CREATE INDEX lead_submission_data_current_page_idx ON lead_submission_data (current_page);
CREATE INDEX lead_submission_data_last_activity_at_idx ON lead_submission_data (last_activity_at);
CREATE INDEX lead_submission_data_created_at_idx ON lead_submission_data (created_at);

-- Row Level Security
ALTER TABLE lead_submission_data ENABLE ROW LEVEL SECURITY;

-- Policy for partners to access their own submission data
CREATE POLICY "Partners can access their own submission data" 
ON lead_submission_data FOR ALL 
USING (partner_id = auth.uid());

-- Policy for admins to access all data
CREATE POLICY "Admins can access all submission data" 
ON lead_submission_data FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.email IN (
            'admin@nu-home.co.uk',
            'support@nu-home.co.uk'
        )
    )
);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_lead_submission_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lead_submission_data_updated_at_trigger
    BEFORE UPDATE ON lead_submission_data
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_submission_data_updated_at();

-- Add comments for documentation
COMMENT ON TABLE lead_submission_data IS 'Stores comprehensive user journey data for each service category flow';
COMMENT ON COLUMN lead_submission_data.quote_data IS 'Data collected from the quote/form page';
COMMENT ON COLUMN lead_submission_data.products_data IS 'Data from product selection page including selected product, power options, calculator settings';
COMMENT ON COLUMN lead_submission_data.addons_data IS 'Data from addons page including selected addons and bundles';
COMMENT ON COLUMN lead_submission_data.survey_data IS 'Data from survey page responses';
COMMENT ON COLUMN lead_submission_data.checkout_data IS 'Data from checkout page including payment details and final selections';
COMMENT ON COLUMN lead_submission_data.enquiry_data IS 'Data from enquiry page';
COMMENT ON COLUMN lead_submission_data.success_data IS 'Data from success page completion confirmation';
COMMENT ON COLUMN lead_submission_data.form_submissions IS 'Array of all form submissions with timestamps';
COMMENT ON COLUMN lead_submission_data.conversion_events IS 'Array of conversion events and milestones';
COMMENT ON COLUMN lead_submission_data.page_timings IS 'Object tracking time spent on each page';
COMMENT ON COLUMN lead_submission_data.current_page IS 'Current page the user is on';
COMMENT ON COLUMN lead_submission_data.pages_completed IS 'Array of completed pages in order';
