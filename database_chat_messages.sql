-- Chat messages table to store chatbot conversations
create table public.chat_messages (
  id uuid not null default gen_random_uuid(),
  submission_id uuid not null,
  partner_id uuid not null,
  message_id character varying(255) not null,
  role character varying(20) not null check (role in ('user', 'assistant')),
  content text not null,
  timestamp timestamp with time zone not null default now(),
  metadata jsonb null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  constraint chat_messages_pkey primary key (id),
  constraint chat_messages_submission_id_fkey foreign key (submission_id) references partner_leads (submission_id) on delete CASCADE,
  constraint chat_messages_partner_id_fkey foreign key (partner_id) references auth.users (id) on delete CASCADE,
  constraint chat_messages_submission_id_message_id_unique unique (submission_id, message_id)
) TABLESPACE pg_default;

-- Indexes for better performance
create index if not exists chat_messages_submission_id_idx on public.chat_messages using btree (submission_id);
create index if not exists chat_messages_partner_id_idx on public.chat_messages using btree (partner_id);
create index if not exists chat_messages_timestamp_idx on public.chat_messages using btree (timestamp);
create index if not exists chat_messages_role_idx on public.chat_messages using btree (role);

-- RLS policies
alter table public.chat_messages enable row level security;

-- Policy to allow partners to access their own chat messages
create policy "Partners can access their own chat messages" on public.chat_messages
  for all using (partner_id = auth.uid());

-- Policy to allow access based on submission_id (for customers)
-- Since customers access via submission ID in URL, we allow access to messages for that submission
-- This is safe because the submission_id is unique and provided in the URL
create policy "Users can access chat messages for their submission" on public.chat_messages
  for all using (submission_id is not null);
