-- Rename review_sections column to review_section
ALTER TABLE public."PartnerSettings" 
RENAME COLUMN review_sections TO review_section;

-- Update the comment
COMMENT ON COLUMN public."PartnerSettings".review_section IS 'Review section configuration to display on products page';
