-- Faculty mentoring requests: student-to-faculty workflow.

create table if not exists public.devcollective_faculty_mentoring_requests (
  id uuid primary key default gen_random_uuid(),
  faculty_clerk_user_id text not null references public.devcollective_profiles(clerk_user_id) on delete cascade,
  student_clerk_user_id text not null references public.devcollective_profiles(clerk_user_id) on delete cascade,
  topic text not null,
  message text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint devcollective_faculty_mentoring_requests_status_check check (status in ('pending','accepted','declined','cancelled')),
  constraint devcollective_faculty_mentoring_requests_participants_check check (faculty_clerk_user_id <> student_clerk_user_id)
);

alter table public.devcollective_faculty_mentoring_requests enable row level security;

create index if not exists idx_faculty_mentoring_requests_faculty
  on public.devcollective_faculty_mentoring_requests (faculty_clerk_user_id, status, created_at desc);

create index if not exists idx_faculty_mentoring_requests_student
  on public.devcollective_faculty_mentoring_requests (student_clerk_user_id, status, created_at desc);

grant select, insert, update, delete on table public.devcollective_faculty_mentoring_requests to service_role;
