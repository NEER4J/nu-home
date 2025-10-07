-- Migration script to update existing chat_messages table to JSON format
-- This script handles the transition from individual message records to JSON storage

-- First, let's check if we need to drop the existing table
-- (Uncomment the next line if you want to start fresh)
-- DROP TABLE IF EXISTS public.chat_messages CASCADE;

-- Alternative: Update existing table structure
-- This approach preserves any existing data

-- Step 1: Create a backup of existing data (if any)
CREATE TABLE IF NOT EXISTS chat_messages_backup AS 
SELECT * FROM public.chat_messages;

-- Step 2: Drop existing table and recreate with new structure
DROP TABLE IF EXISTS public.chat_messages CASCADE;

-- Step 3: Create new table with JSON storage
CREATE TABLE public.chat_messages (
  id uuid not null default gen_random_uuid(),
  submission_id uuid not null,
  partner_id uuid not null,
  messages jsonb not null default '[]'::jsonb,
  last_updated timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  constraint chat_messages_pkey primary key (id),
  constraint chat_messages_submission_id_fkey foreign key (submission_id) references partner_leads (submission_id) on delete CASCADE,
  constraint chat_messages_partner_id_fkey foreign key (partner_id) references auth.users (id) on delete CASCADE,
  constraint chat_messages_submission_id_unique unique (submission_id)
) TABLESPACE pg_default;

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS chat_messages_submission_id_idx ON public.chat_messages USING btree (submission_id);
CREATE INDEX IF NOT EXISTS chat_messages_partner_id_idx ON public.chat_messages USING btree (partner_id);
CREATE INDEX IF NOT EXISTS chat_messages_last_updated_idx ON public.chat_messages USING btree (last_updated);
CREATE INDEX IF NOT EXISTS chat_messages_messages_idx ON public.chat_messages USING gin (messages);

-- Step 5: Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies
CREATE POLICY "Partners can access their own chat messages" ON public.chat_messages
  FOR ALL USING (partner_id = auth.uid());

CREATE POLICY "Allow access to chat messages by submission" ON public.chat_messages
  FOR ALL USING (submission_id is not null);

-- Step 7: Optional - Migrate existing data from backup table
-- (Uncomment and modify this section if you have existing chat data to migrate)
/*
INSERT INTO public.chat_messages (submission_id, partner_id, messages, last_updated, created_at)
SELECT 
  submission_id,
  partner_id,
  jsonb_agg(
    jsonb_build_object(
      'id', message_id,
      'content', content,
      'role', role,
      'timestamp', timestamp
    ) ORDER BY timestamp
  ) as messages,
  MAX(timestamp) as last_updated,
  MIN(timestamp) as created_at
FROM chat_messages_backup
GROUP BY submission_id, partner_id;
*/

-- Step 8: Clean up backup table (uncomment when ready)
-- DROP TABLE IF EXISTS chat_messages_backup;
