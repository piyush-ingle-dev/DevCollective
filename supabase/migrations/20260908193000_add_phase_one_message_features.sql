alter table public.devcollective_messages
  add column if not exists edited_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by text,
  add column if not exists reply_to_message_id uuid references public.devcollective_messages(id) on delete set null;

create table if not exists public.devcollective_message_deletions (
  message_id uuid not null references public.devcollective_messages(id) on delete cascade,
  clerk_user_id text not null,
  deleted_at timestamptz not null default now(),
  primary key (message_id, clerk_user_id)
);

create index if not exists idx_dc_message_deletions_user
  on public.devcollective_message_deletions(clerk_user_id);

alter table public.devcollective_message_deletions enable row level security;

grant select, insert, update, delete, references, trigger, truncate
  on table public.devcollective_message_deletions to service_role;
