-- Add save_quote_data column to lead_submission_data table
-- This column will store individual product save quote data

ALTER TABLE lead_submission_data 
ADD COLUMN save_quote_data JSONB DEFAULT '[]'::jsonb;

-- Add GIN index for the new column
CREATE INDEX lead_submission_data_save_quote_data_idx ON lead_submission_data USING GIN (save_quote_data);

-- Add comment to explain the column
COMMENT ON COLUMN lead_submission_data.save_quote_data IS 'Array of individual product save quote submissions with product details and user info';
