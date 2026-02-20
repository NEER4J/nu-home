-- Add is_ev_type_selection column to FormQuestions table
-- This column indicates if a question is for EV type selection (brand/model selection)
-- Only applicable for EV Chargers service category

-- Add is_ev_type_selection column to FormQuestions table
ALTER TABLE public."FormQuestions" 
ADD COLUMN is_ev_type_selection boolean NULL DEFAULT false;

-- Add comment to the column
COMMENT ON COLUMN public."FormQuestions".is_ev_type_selection IS 'Indicates if this question is for EV type selection (brand/model selection). Only applicable for EV Chargers category.';
