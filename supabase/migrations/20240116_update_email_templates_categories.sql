-- Update email templates to use service_category_id instead of category string
ALTER TABLE public.email_templates 
ADD COLUMN service_category_id uuid;

-- Add foreign key constraint to ServiceCategories
ALTER TABLE public.email_templates 
ADD CONSTRAINT email_templates_service_category_id_fkey 
FOREIGN KEY (service_category_id) REFERENCES public."ServiceCategories"(service_category_id) ON DELETE CASCADE;

-- Create index for service_category_id
CREATE INDEX IF NOT EXISTS idx_email_templates_service_category_id 
ON public.email_templates USING btree (service_category_id);

-- Update template_fields to use service_category_id as well
ALTER TABLE public.template_fields 
ADD COLUMN service_category_id uuid;

-- Add foreign key constraint for template_fields
ALTER TABLE public.template_fields 
ADD CONSTRAINT template_fields_service_category_id_fkey 
FOREIGN KEY (service_category_id) REFERENCES public."ServiceCategories"(service_category_id) ON DELETE CASCADE;

-- Create index for template_fields service_category_id
CREATE INDEX IF NOT EXISTS idx_template_fields_service_category_id 
ON public.template_fields USING btree (service_category_id);

-- Update the unique constraint to use service_category_id
DROP INDEX IF EXISTS idx_email_templates_unique_active;
CREATE UNIQUE INDEX idx_email_templates_unique_active 
ON public.email_templates(partner_id, service_category_id, email_type, recipient_type) 
WHERE is_active = true;

-- Update template_fields unique constraint
ALTER TABLE public.template_fields 
DROP CONSTRAINT IF EXISTS template_fields_unique_name;

ALTER TABLE public.template_fields 
ADD CONSTRAINT template_fields_unique_name 
UNIQUE (service_category_id, field_name);

-- Migrate existing data (if any) - find boiler category and update
DO $$
DECLARE
    boiler_category_id uuid;
BEGIN
    -- Try to find boiler category
    SELECT service_category_id INTO boiler_category_id 
    FROM public."ServiceCategories" 
    WHERE slug = 'boiler' 
    LIMIT 1;
    
    -- If boiler category exists, update existing templates and fields
    IF boiler_category_id IS NOT NULL THEN
        UPDATE public.email_templates 
        SET service_category_id = boiler_category_id 
        WHERE category = 'boiler';
        
        UPDATE public.template_fields 
        SET service_category_id = boiler_category_id 
        WHERE category = 'boiler';
    END IF;
END $$;

-- Make service_category_id NOT NULL after migration
ALTER TABLE public.email_templates 
ALTER COLUMN service_category_id SET NOT NULL;

ALTER TABLE public.template_fields 
ALTER COLUMN service_category_id SET NOT NULL;

-- Drop old category columns (optional - keep for backward compatibility for now)
-- ALTER TABLE public.email_templates DROP COLUMN category;
-- ALTER TABLE public.template_fields DROP COLUMN category;
