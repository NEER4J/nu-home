-- Add 'survey' to the progress_step check constraint
ALTER TABLE public."partner_leads" 
DROP CONSTRAINT partner_leads_progress_step_chk;

ALTER TABLE public."partner_leads" 
ADD CONSTRAINT partner_leads_progress_step_chk 
CHECK (
  progress_step = ANY (
    ARRAY[
      'products'::text,
      'addons'::text,
      'checkout'::text,
      'booked'::text,
      'paid'::text,
      'payment_completed'::text,
      'survey'::text
    ]
  )
);
