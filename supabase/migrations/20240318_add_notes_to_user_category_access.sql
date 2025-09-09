-- Add notes column to UserCategoryAccess table
ALTER TABLE "UserCategoryAccess"
ADD COLUMN IF NOT EXISTS notes text; 