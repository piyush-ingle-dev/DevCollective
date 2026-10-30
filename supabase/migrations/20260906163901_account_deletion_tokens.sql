create table if not exists public.devcollective_account_deletion_tokens (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null references public.devcollective_profiles(clerk_user_id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists devcollective_account_deletion_tokens_user_idx
  on public.devcollective_account_deletion_tokens(clerk_user_id);

create index if not exists devcollective_account_deletion_tokens_expiry_idx
  on public.devcollective_account_deletion_tokens(expires_at);

alter table public.devcollective_account_deletion_tokens enable row level security;