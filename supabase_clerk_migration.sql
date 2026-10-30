-- DevCollective: Clerk authentication + Supabase database
-- Run this migration in the Supabase SQL Editor before first sign-in.
-- It intentionally uses a new table so existing Supabase Auth-era tables are not destroyed.

create table if not exists public.devcollective_profiles (
  clerk_user_id text primary key,
  name text not null,
  email text not null,
  role text not null default 'student',
  college text not null default 'Institute of Technology',
  branch text not null default 'Computer Science',
  academic_year text not null default '1st Year',
  avatar text,
  bio text,
  rep integer not null default 100 check (rep >= 0),
  level integer not null default 1 check (level >= 1),
  streak_days integer not null default 1 check (streak_days >= 0),
  github_url text not null default '',
  linkedin_url text not null default '',
  skills jsonb not null default '[]'::jsonb,
  selected_domains jsonb not null default '[]'::jsonb,
  auth_provider text not null default 'clerk',
  has_completed_onboarding boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.devcollective_profiles add column if not exists has_completed_onboarding boolean not null default false;

create index if not exists devcollective_profiles_email_idx on public.devcollective_profiles (lower(email));

create or replace function public.devcollective_profiles_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists devcollective_profiles_updated_at on public.devcollective_profiles;
create trigger devcollective_profiles_updated_at before update on public.devcollective_profiles
for each row execute function public.devcollective_profiles_set_updated_at();

alter table public.devcollective_profiles enable row level security;
revoke all on table public.devcollective_profiles from anon;
grant select, insert, update on table public.devcollective_profiles to authenticated;
-- The server uses Supabase's server-only secret key, which executes as service_role.
grant select, insert, update on table public.devcollective_profiles to service_role;

drop policy if exists "Clerk users can read their own DevCollective profile" on public.devcollective_profiles;
create policy "Clerk users can read their own DevCollective profile" on public.devcollective_profiles
for select to authenticated using ((select auth.jwt()->>'sub') = clerk_user_id);

drop policy if exists "Clerk users can create their own DevCollective profile" on public.devcollective_profiles;
create policy "Clerk users can create their own DevCollective profile" on public.devcollective_profiles
for insert to authenticated with check ((select auth.jwt()->>'sub') = clerk_user_id);

drop policy if exists "Clerk users can update their own DevCollective profile" on public.devcollective_profiles;
create policy "Clerk users can update their own DevCollective profile" on public.devcollective_profiles
for update to authenticated
using ((select auth.jwt()->>'sub') = clerk_user_id)
with check ((select auth.jwt()->>'sub') = clerk_user_id);
