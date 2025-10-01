-- Add callback_data column to lead_submission_data table
ALTER TABLE public.lead_submission_data 
ADD COLUMN callback_data jsonb NULL DEFAULT '{}'::jsonb;
