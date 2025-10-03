-- Assign user_id to all existing FormQuestions
-- This migration assigns the specified user ID to all existing questions

-- Update all existing FormQuestions to have the specified user_id
UPDATE public."FormQuestions" 
SET user_id = '4e5184f0-d71f-4812-9539-b43f3c158260'
WHERE user_id = 'eda52723-6be3-4a50-a04d-2e1a4c63b1bd';

-- Verify the update
-- You can run this query to check how many questions were updated:
-- SELECT COUNT(*) as updated_questions FROM public."FormQuestions" WHERE user_id = 'eda52723-6be3-4a50-a04d-2e1a4c63b1bd';

-- Optional: If you want to see which questions were updated, you can run:
-- SELECT question_id, question_text, service_category_id, user_id 
-- FROM public."FormQuestions" 
-- WHERE user_id = 'eda52723-6be3-4a50-a04d-2e1a4c63b1bd'
-- ORDER BY created_at;
