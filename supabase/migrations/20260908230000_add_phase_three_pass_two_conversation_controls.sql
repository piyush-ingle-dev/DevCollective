alter table public.devcollective_messages
  add column if not exists forwarded_from_message_id uuid references public.devcollective_messages(id) on delete set null;

create index if not exists idx_dc_messages_forwarded_from
  on public.devcollective_messages(forwarded_from_message_id);

create table if not exists public.devcollective_user_blocks (
  blocker_clerk_user_id text not null,
  blocked_clerk_user_id text not null,
  created_at timestamptz not null default now(),
  primary key (blocker_clerk_user_id, blocked_clerk_user_id),
  check (blocker_clerk_user_id <> blocked_clerk_user_id)
);
create index if not exists idx_dc_user_blocks_blocked on public.devcollective_user_blocks(blocked_clerk_user_id);

create table if not exists public.devcollective_user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_clerk_user_id text not null,
  reported_clerk_user_id text not null,
  conversation_id uuid references public.devcollective_conversations(id) on delete set null,
  category text not null check (category in ('spam','harassment','inappropriate','impersonation','other')),
  details text,
  created_at timestamptz not null default now()
);
create index if not exists idx_dc_user_reports_reported on public.devcollective_user_reports(reported_clerk_user_id, created_at desc);

create table if not exists public.devcollective_conversation_mutes (
  conversation_id uuid not null references public.devcollective_conversations(id) on delete cascade,
  clerk_user_id text not null,
  muted_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (conversation_id, clerk_user_id)
);

create table if not exists public.devcollective_conversation_archives (
  conversation_id uuid not null references public.devcollective_conversations(id) on delete cascade,
  clerk_user_id text not null,
  archived_at timestamptz not null default now(),
  primary key (conversation_id, clerk_user_id)
);

create table if not exists public.devcollective_conversation_hides (
  conversation_id uuid not null references public.devcollective_conversations(id) on delete cascade,
  clerk_user_id text not null,
  hidden_at timestamptz not null default now(),
  primary key (conversation_id, clerk_user_id)
);

create index if not exists idx_dc_conversation_mutes_user on public.devcollective_conversation_mutes(clerk_user_id);
create index if not exists idx_dc_conversation_archives_user on public.devcollective_conversation_archives(clerk_user_id);
create index if not exists idx_dc_conversation_hides_user on public.devcollective_conversation_hides(clerk_user_id);

alter table public.devcollective_user_blocks enable row level security;
alter table public.devcollective_user_reports enable row level security;
alter table public.devcollective_conversation_mutes enable row level security;
alter table public.devcollective_conversation_archives enable row level security;
alter table public.devcollective_conversation_hides enable row level security;

grant select, insert, update, delete, references, trigger, truncate on table public.devcollective_user_blocks to service_role;
grant select, insert, update, delete, references, trigger, truncate on table public.devcollective_user_reports to service_role;
grant select, insert, update, delete, references, trigger, truncate on table public.devcollective_conversation_mutes to service_role;
grant select, insert, update, delete, references, trigger, truncate on table public.devcollective_conversation_archives to service_role;
grant select, insert, update, delete, references, trigger, truncate on table public.devcollective_conversation_hides to service_role;
