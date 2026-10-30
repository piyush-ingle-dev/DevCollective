create extension if not exists pgcrypto;

create table if not exists public.devcollective_conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'direct' check (kind in ('direct','group')),
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz
);

create table if not exists public.devcollective_conversation_members (
  conversation_id uuid not null references public.devcollective_conversations(id) on delete cascade,
  clerk_user_id text not null,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (conversation_id, clerk_user_id)
);

create table if not exists public.devcollective_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.devcollective_conversations(id) on delete cascade,
  sender_clerk_user_id text not null,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists idx_dc_conversation_members_user
  on public.devcollective_conversation_members(clerk_user_id);
create index if not exists idx_dc_messages_conversation_created
  on public.devcollective_messages(conversation_id, created_at desc);

alter table public.devcollective_conversations enable row level security;
alter table public.devcollective_conversation_members enable row level security;
alter table public.devcollective_messages enable row level security;

-- Messaging is accessed only through the authenticated Node/WebSocket server.
-- Keep direct browser roles out of these tables and explicitly grant the
-- server's Supabase service role the privileges required by the WebSocket layer.
grant select, insert, update, delete, references, trigger, truncate
  on table public.devcollective_conversations to service_role;
grant select, insert, update, delete, references, trigger, truncate
  on table public.devcollective_conversation_members to service_role;
grant select, insert, update, delete, references, trigger, truncate
  on table public.devcollective_messages to service_role;
grant usage, select on all sequences in schema public to service_role;

create or replace function public.devcollective_touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.devcollective_conversations
  set updated_at = now(), last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists trg_dc_touch_conversation on public.devcollective_messages;
create trigger trg_dc_touch_conversation
after insert on public.devcollective_messages
for each row execute function public.devcollective_touch_conversation();

comment on table public.devcollective_conversations is 'User-to-user DevCollective conversations. Accessed by the authenticated WebSocket server using the Supabase service role.';
comment on table public.devcollective_conversation_members is 'Membership for DevCollective conversations.';
comment on table public.devcollective_messages is 'Persistent DevCollective chat messages.';
