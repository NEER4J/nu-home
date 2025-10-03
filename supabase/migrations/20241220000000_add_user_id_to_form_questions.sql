-- Add user_id column to FormQuestions table to make questions user-specific
-- This migration adds user_id to FormQuestions table and creates necessary indexes

-- Add user_id column to FormQuestions table
ALTER TABLE public."FormQuestions" 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for user_id for better query performance
CREATE INDEX IF NOT EXISTS idx_form_questions_user_id ON public."FormQuestions" USING btree (user_id);

-- Create composite index for user_id and service_category_id for efficient queries
CREATE INDEX IF NOT EXISTS idx_form_questions_user_category ON public."FormQuestions" USING btree (user_id, service_category_id);

-- Create composite index for user_id, service_category_id, and status for active questions
CREATE INDEX IF NOT EXISTS idx_form_questions_user_category_status ON public."FormQuestions" USING btree (user_id, service_category_id, status);

-- Update existing questions to have a default user_id (you may need to adjust this based on your data)
-- For now, we'll set them to NULL to indicate they are global/system questions
-- You can update this later to assign them to specific users if needed

-- Add comment to the column
COMMENT ON COLUMN public."FormQuestions".user_id IS 'User ID that owns this form question. NULL means global/system question.';
