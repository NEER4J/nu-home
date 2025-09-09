-- Add partner assignment fields to QuoteSubmissions table (if they don't exist)
DO $$ 
BEGIN
    -- Add assigned_partner_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'QuoteSubmissions' 
                   AND column_name = 'assigned_partner_id') THEN
        ALTER TABLE public."QuoteSubmissions" ADD COLUMN assigned_partner_id uuid null;
    END IF;
    
    -- Add assignment_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'QuoteSubmissions' 
                   AND column_name = 'assignment_date') THEN
        ALTER TABLE public."QuoteSubmissions" ADD COLUMN assignment_date timestamp with time zone null;
    END IF;
END $$;

-- Add foreign key constraint for assigned_partner_id (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'QuoteSubmissions_assigned_partner_id_fkey') THEN
        ALTER TABLE public."QuoteSubmissions" 
        ADD CONSTRAINT QuoteSubmissions_assigned_partner_id_fkey 
        FOREIGN KEY (assigned_partner_id) REFERENCES auth.users (id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add index for assigned_partner_id (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_quote_submissions_assigned_partner_id 
ON public."QuoteSubmissions" USING btree (assigned_partner_id) TABLESPACE pg_default;
