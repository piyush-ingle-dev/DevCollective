-- Faculty production hardening: directory data, availability, audit trail and invitation constraints.

alter table public.devcollective_faculty_profiles
  add column if not exists availability_status text not null default 'available',
  add column if not exists availability_note text;

alter table public.devcollective_faculty_profiles
  drop constraint if exists devcollective_faculty_profiles_availability_status_check;

alter table public.devcollective_faculty_profiles
  add constraint devcollective_faculty_profiles_availability_status_check
  check (availability_status in ('available','busy','offline'));

create index if not exists idx_devcollective_faculty_directory
  on public.devcollective_faculty_profiles (approval_status, availability_status, department);

create index if not exists idx_devcollective_faculty_invites_email_status
  on public.devcollective_faculty_invitations (lower(email), status);

create table if not exists public.devcollective_faculty_audit_log (
  id uuid primary key default gen_random_uuid(),
  faculty_clerk_user_id text,
  actor_clerk_user_id text not null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.devcollective_faculty_audit_log enable row level security;

create index if not exists idx_devcollective_faculty_audit_faculty
  on public.devcollective_faculty_audit_log (faculty_clerk_user_id, created_at desc);

create index if not exists idx_devcollective_faculty_audit_actor
  on public.devcollective_faculty_audit_log (actor_clerk_user_id, created_at desc);

create unique index if not exists idx_one_pending_faculty_invite_per_email
  on public.devcollective_faculty_invitations (lower(email))
  where status = 'pending';

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.devcollective_faculty_invitations to service_role;
grant select, insert, update, delete on table public.devcollective_faculty_profiles to service_role;
grant select, insert, update, delete on table public.devcollective_profiles to service_role;
grant select, insert on table public.devcollective_faculty_audit_log to service_role;
grant usage, select on all sequences in schema public to service_role;
