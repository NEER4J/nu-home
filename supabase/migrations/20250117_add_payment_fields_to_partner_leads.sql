-- Add payment fields to partner_leads table
ALTER TABLE public."partner_leads" 
ADD COLUMN payment_method character varying(100) NULL,
ADD COLUMN payment_status character varying(50) NULL DEFAULT 'pending';

-- Add check constraint for payment_status
ALTER TABLE public."partner_leads" 
ADD CONSTRAINT partner_leads_payment_status_chk 
CHECK (payment_status = ANY(ARRAY['pending', 'processing', 'completed', 'failed', 'cancelled']));

-- Create index for payment status
CREATE INDEX IF NOT EXISTS partner_leads_payment_status_idx 
ON public."partner_leads" USING btree (payment_status);

-- Create index for payment method
CREATE INDEX IF NOT EXISTS partner_leads_payment_method_idx 
ON public."partner_leads" USING btree (payment_method);

-- Create composite index for payment status and method
CREATE INDEX IF NOT EXISTS partner_leads_payment_status_method_idx 
ON public."partner_leads" USING btree (payment_status, payment_method);

-- Update progress_step check constraint to include 'paid' status
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
      'payment_completed'::text
    ]
  )
);
