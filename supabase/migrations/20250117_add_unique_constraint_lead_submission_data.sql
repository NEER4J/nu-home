-- Add unique constraint on submission_id for lead_submission_data table
-- This allows upsert operations to work properly

ALTER TABLE lead_submission_data 
ADD CONSTRAINT lead_submission_data_submission_id_unique UNIQUE (submission_id);
