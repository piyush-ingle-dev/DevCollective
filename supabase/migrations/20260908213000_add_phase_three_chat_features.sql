create table if not exists public.devcollective_message_reactions (
  message_id uuid not null references public.devcollective_messages(id) on delete cascade,
  clerk_user_id text not null,
  reaction text not null check (reaction in ('👍','❤️','🔥','😂','🎉','🚀','👀','💯')),
  created_at timestamptz not null default now(),
  primary key (message_id, clerk_user_id, reaction)
);

create index if not exists idx_dc_message_reactions_message
  on public.devcollective_message_reactions(message_id);

create table if not exists public.devcollective_message_stars (
  message_id uuid not null references public.devcollective_messages(id) on delete cascade,
  clerk_user_id text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, clerk_user_id)
);

create index if not exists idx_dc_message_stars_user
  on public.devcollective_message_stars(clerk_user_id);

create table if not exists public.devcollective_message_pins (
  message_id uuid primary key references public.devcollective_messages(id) on delete cascade,
  conversation_id uuid not null references public.devcollective_conversations(id) on delete cascade,
  pinned_by text not null,
  pinned_at timestamptz not null default now()
);

create index if not exists idx_dc_message_pins_conversation
  on public.devcollective_message_pins(conversation_id);

alter table public.devcollective_message_reactions enable row level security;
alter table public.devcollective_message_stars enable row level security;
alter table public.devcollective_message_pins enable row level security;

grant select, insert, update, delete, references, trigger, truncate on table public.devcollective_message_reactions to service_role;
grant select, insert, update, delete, references, trigger, truncate on table public.devcollective_message_stars to service_role;
grant select, insert, update, delete, references, trigger, truncate on table public.devcollective_message_pins to service_role;
