create table if not exists public.devcollective_admin_allowlist (
  email text primary key,
  created_at timestamptz not null default now()
);

insert into public.devcollective_admin_allowlist (email)
values ('raat131221@gmail.com'), ('kanojiyapk524@gmail.com')
on conflict (email) do nothing;

alter table public.devcollective_profiles
  add column if not exists mentor_verified_at timestamptz;

create table if not exists public.devcollective_mentor_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_clerk_user_id text not null references public.devcollective_profiles(clerk_user_id) on delete cascade,
  applicant_email text not null,
  applicant_name text not null,
  college text not null,
  branch text not null,
  skills text not null,
  experience text not null,
  motivation text not null,
  resume_file_name text not null,
  resume_storage_path text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  review_note text,
  reviewed_by text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists idx_dc_mentor_apps_status_created
  on public.devcollective_mentor_applications(status, created_at desc);
create index if not exists idx_dc_mentor_apps_applicant
  on public.devcollective_mentor_applications(applicant_clerk_user_id, created_at desc);
create unique index if not exists idx_dc_mentor_apps_one_pending
  on public.devcollective_mentor_applications(applicant_clerk_user_id)
  where status = 'pending';

alter table public.devcollective_admin_allowlist enable row level security;
alter table public.devcollective_mentor_applications enable row level security;
revoke all on table public.devcollective_admin_allowlist from anon, authenticated;
revoke all on table public.devcollective_mentor_applications from anon, authenticated;
grant select, insert, update, delete, references, trigger, truncate on table public.devcollective_admin_allowlist to service_role;
grant select, insert, update, delete, references, trigger, truncate on table public.devcollective_mentor_applications to service_role;
