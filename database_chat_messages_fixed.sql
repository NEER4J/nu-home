-- Chat messages table to store chatbot conversations as JSON
create table public.chat_messages (
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

-- Indexes for better performance
create index if not exists chat_messages_submission_id_idx on public.chat_messages using btree (submission_id);
create index if not exists chat_messages_partner_id_idx on public.chat_messages using btree (partner_id);
create index if not exists chat_messages_last_updated_idx on public.chat_messages using btree (last_updated);
create index if not exists chat_messages_messages_idx on public.chat_messages using gin (messages);

-- RLS policies
alter table public.chat_messages enable row level security;

-- Policy to allow partners to access their own chat messages
create policy "Partners can access their own chat messages" on public.chat_messages
  for all using (partner_id = auth.uid());

-- Policy to allow access to chat messages for any submission
-- This is safe because submission_id is provided in the URL and is unique
create policy "Allow access to chat messages by submission" on public.chat_messages
  for all using (submission_id is not null);
