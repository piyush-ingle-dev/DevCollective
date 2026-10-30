alter table public.devcollective_messages
  add column if not exists delivered_at timestamptz;

create table if not exists public.devcollective_user_presence (
  clerk_user_id text primary key,
  last_seen_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idx_dc_user_presence_last_seen
  on public.devcollective_user_presence(last_seen_at);

alter table public.devcollective_user_presence enable row level security;

grant select, insert, update, delete, references, trigger, truncate
  on table public.devcollective_user_presence to service_role;

grant select, insert, update, delete, references, trigger, truncate
  on table public.devcollective_conversations to service_role;

grant select, insert, update, delete, references, trigger, truncate
  on table public.devcollective_conversation_members to service_role;

grant select, insert, update, delete, references, trigger, truncate
  on table public.devcollective_messages to service_role;
