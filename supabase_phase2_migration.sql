-- ====================================================
-- DevCollective Phase 2 Supabase Migration (Hardened)
-- ====================================================

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  role text,
  college text,
  branch text,
  academic_year text,
  rep integer not null default 0,
  level integer not null default 0,
  streak_days integer not null default 0,
  has_completed_onboarding boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. REP TRANSACTIONS TABLE
create table if not exists public.rep_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,
  reason text not null,
  source text not null,
  source_id text,
  created_at timestamptz default now(),
  constraint unique_user_source_task unique (user_id, source, source_id)
);

-- 3. LEARNING TASKS TABLE (Legitimate system learning tasks)
create table if not exists public.learning_tasks (
  id text primary key,
  title text not null,
  rep_reward integer not null default 50,
  created_at timestamptz default now()
);

-- Populate initial legitimate system learning tasks
insert into public.learning_tasks (id, title, rep_reward)
values
  ('task-1', 'Watch Neural Networks Introduction', 50),
  ('task-2', 'Implement basic backpropagation logic in Python', 50),
  ('task-3', 'Peer review 2 project submissions on Community Hub', 50),
  ('task-4', 'Post a "Build in Public" progress update', 50)
on conflict (id) do nothing;

-- 4. TASK COMPLETIONS TABLE (Records verified completions)
create table if not exists public.task_completions (
  user_id uuid references auth.users(id) on delete cascade,
  task_id text references public.learning_tasks(id) on delete cascade,
  completed_at timestamptz default now(),
  primary key (user_id, task_id)
);

-- 5. ENABLE ROW LEVEL SECURITY
alter table public.profiles enable row level security;
alter table public.rep_transactions enable row level security;
alter table public.learning_tasks enable row level security;
alter table public.task_completions enable row level security;

-- 6. RLS POLICIES FOR PROFILES
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can update own editable profile fields" on public.profiles;
create policy "Users can update own editable profile fields"
  on public.profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 7. RLS POLICIES FOR REP TRANSACTIONS & TASKS
drop policy if exists "Users can view own rep transactions" on public.rep_transactions;
create policy "Users can view own rep transactions"
  on public.rep_transactions for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can view learning tasks" on public.learning_tasks;
create policy "Users can view learning tasks"
  on public.learning_tasks for select
  to authenticated
  using (true);

drop policy if exists "Users can view own task completions" on public.task_completions;
create policy "Users can view own task completions"
  on public.task_completions for select
  to authenticated
  using (auth.uid() = user_id);

-- 8. COLUMN-LEVEL PERMISSION RESTRICTIONS ON PROFILES
-- Revoke full table UPDATE privileges from authenticated and anon roles
revoke update on public.profiles from authenticated;
revoke update on public.profiles from anon;

-- Grant UPDATE privileges ONLY on legitimate, user-editable profile fields
grant update (name, college, branch, academic_year, has_completed_onboarding, updated_at)
  on public.profiles to authenticated;

-- Grant SELECT privileges to authenticated role
grant select on public.profiles to authenticated;
grant select on public.rep_transactions to authenticated;
grant select on public.learning_tasks to authenticated;
grant select on public.task_completions to authenticated;

-- 9. DATABASE TRIGGER FOR AUTOMATIC PROFILE CREATION ON SIGNUP
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (
    user_id,
    name,
    email,
    role,
    college,
    branch,
    academic_year,
    rep,
    level,
    streak_days,
    has_completed_onboarding
  ) values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    coalesce(new.raw_user_meta_data->>'college', 'Institute of Technology'),
    coalesce(new.raw_user_meta_data->>'branch', 'Computer Science'),
    coalesce(new.raw_user_meta_data->>'academicYear', new.raw_user_meta_data->>'academic_year', 'Third Year'),
    0,
    0,
    0,
    false
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Restrict execution of handle_new_user() (runs only via system trigger)
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 10. SECURE RPC FUNCTION FOR AWARDING REP
create or replace function public.award_rep(
  p_task_id text
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_amount constant integer := 50;
  v_reason constant text := 'Completed learning task';
  v_source constant text := 'learning_task';
  v_new_rep integer;
begin
  -- 1. Authenticated user verification
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- 2. Validate legitimate task existence against learning_tasks table
  if not exists (select 1 from public.learning_tasks where id = p_task_id) then
    raise exception 'Invalid learning task ID';
  end if;

  -- 3. Duplicate reward protection check
  if exists (
    select 1 from public.rep_transactions
    where user_id = v_user_id
      and source = v_source
      and source_id = p_task_id
  ) then
    select rep into v_new_rep from public.profiles where user_id = v_user_id;
    return coalesce(v_new_rep, 0);
  end if;

  -- 4. Record task completion
  insert into public.task_completions (user_id, task_id)
  values (v_user_id, p_task_id)
  on conflict (user_id, task_id) do nothing;

  -- 5. Record transaction log
  insert into public.rep_transactions (user_id, amount, reason, source, source_id)
  values (v_user_id, v_amount, v_reason, v_source, p_task_id);

  -- 6. Atomically increment profile REP
  update public.profiles
  set rep = rep + v_amount,
      updated_at = now()
  where user_id = v_user_id
  returning rep into v_new_rep;

  return v_new_rep;
end;
$$;

-- 11. STRICT RPC EXECUTION PERMISSIONS
revoke execute on function public.award_rep(text) from public;
revoke execute on function public.award_rep(text) from anon;
grant execute on function public.award_rep(text) to authenticated;
