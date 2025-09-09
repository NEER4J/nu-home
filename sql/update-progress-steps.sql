-- Update the progress_step constraint to include enquiry steps
ALTER TABLE partner_leads 
DROP CONSTRAINT IF EXISTS partner_leads_progress_step_check;

ALTER TABLE partner_leads 
ADD CONSTRAINT partner_leads_progress_step_check 
CHECK (
  progress_step = ANY (
    ARRAY[
      'products'::text,
      'addons'::text,
      'checkout'::text,
      'booked'::text,
      'paid'::text,
      'payment_completed'::text,
      'survey'::text,
      'survey_completed'::text,
      'enquiry'::text,
      'enquiry_completed'::text
    ]
  )
);

-- Also update the status constraint to include enquiry_submitted
ALTER TABLE partner_leads 
DROP CONSTRAINT IF EXISTS partner_leads_status_check;

ALTER TABLE partner_leads 
ADD CONSTRAINT partner_leads_status_check 
CHECK (
  status = ANY (
    ARRAY[
      'new'::text,
      'assigned'::text,
      'contacted'::text,
      'quoted'::text,
      'booked'::text,
      'completed'::text,
      'cancelled'::text,
      'enquiry_submitted'::text
    ]
  )
);