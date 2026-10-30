create table if not exists public.devcollective_follows (
  follower_clerk_user_id text not null references public.devcollective_profiles(clerk_user_id) on delete cascade,
  following_clerk_user_id text not null references public.devcollective_profiles(clerk_user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_clerk_user_id, following_clerk_user_id),
  check (follower_clerk_user_id <> following_clerk_user_id)
);

create index if not exists idx_devcollective_follows_following on public.devcollective_follows(following_clerk_user_id, created_at desc);
create index if not exists idx_devcollective_follows_follower on public.devcollective_follows(follower_clerk_user_id, created_at desc);

create table if not exists public.devcollective_connection_requests (
  id uuid primary key default gen_random_uuid(),
  sender_clerk_user_id text not null references public.devcollective_profiles(clerk_user_id) on delete cascade,
  recipient_clerk_user_id text not null references public.devcollective_profiles(clerk_user_id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sender_clerk_user_id <> recipient_clerk_user_id)
);

create unique index if not exists idx_devcollective_connection_pending_pair on public.devcollective_connection_requests(sender_clerk_user_id, recipient_clerk_user_id) where status = 'pending';
create unique index if not exists idx_devcollective_connection_accepted_pair on public.devcollective_connection_requests(least(sender_clerk_user_id, recipient_clerk_user_id), greatest(sender_clerk_user_id, recipient_clerk_user_id)) where status = 'accepted';
create index if not exists idx_devcollective_connections_sender on public.devcollective_connection_requests(sender_clerk_user_id, status, created_at desc);
create index if not exists idx_devcollective_connections_recipient on public.devcollective_connection_requests(recipient_clerk_user_id, status, created_at desc);

alter table public.devcollective_follows enable row level security;
alter table public.devcollective_connection_requests enable row level security;

grant select, insert, update, delete on public.devcollective_follows to service_role;
grant select, insert, update, delete on public.devcollective_connection_requests to service_role;
