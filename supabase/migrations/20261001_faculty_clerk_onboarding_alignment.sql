alter table public.devcollective_profiles
  add column if not exists account_status text not null default 'active';

alter table public.devcollective_profiles
  drop constraint if exists devcollective_profiles_account_status_check;

alter table public.devcollective_profiles
  add constraint devcollective_profiles_account_status_check
  check (account_status in ('active','pending','suspended'));

drop policy if exists "Faculty can view own profile" on public.devcollective_faculty_profiles;
drop policy if exists "Faculty can update own pending profile" on public.devcollective_faculty_profiles;

alter table public.devcollective_faculty_invitations
  drop constraint if exists devcollective_faculty_invitations_invited_by_fkey;

alter table public.devcollective_faculty_invitations
  alter column invited_by type text using invited_by::text;

alter table public.devcollective_faculty_profiles
  drop constraint if exists devcollective_faculty_profiles_user_id_fkey;

alter table public.devcollective_faculty_profiles
  rename column user_id to clerk_user_id;

alter table public.devcollective_faculty_profiles
  alter column clerk_user_id type text using clerk_user_id::text;

alter table public.devcollective_faculty_profiles
  alter column approved_by type text using approved_by::text;

create index if not exists devcollective_faculty_profiles_approval_idx
  on public.devcollective_faculty_profiles (approval_status);

create index if not exists devcollective_faculty_invitations_email_idx
  on public.devcollective_faculty_invitations (email);