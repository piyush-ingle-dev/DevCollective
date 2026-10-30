-- Level 0 learning progression + authoritative REP ledger.
-- Applied to the DevCollective Supabase project as migration: add_level_0_learning_progression.

create table if not exists public.learning_levels (
  id text primary key,
  level_number integer not null unique,
  title text not null,
  subtitle text,
  is_mandatory boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.learning_modules (
  id text primary key,
  level_id text not null references public.learning_levels(id) on delete cascade,
  module_order integer not null,
  title text not null,
  description text not null,
  icon text not null,
  estimated_minutes integer not null default 0 check (estimated_minutes >= 0),
  rep_reward integer not null default 0 check (rep_reward >= 0),
  unique(level_id, module_order)
);

create table if not exists public.learning_submodules (
  id text primary key,
  module_id text not null references public.learning_modules(id) on delete cascade,
  submodule_order integer not null,
  title text not null,
  description text not null,
  estimated_minutes integer not null default 0 check (estimated_minutes >= 0),
  kind text not null check (kind in ('theory','interactive','practical','reflection','assessment')),
  rep_reward integer not null default 0 check (rep_reward >= 0),
  unique(module_id, submodule_order)
);

create table if not exists public.user_submodule_progress (
  user_id text not null,
  submodule_id text not null references public.learning_submodules(id) on delete cascade,
  verified_at timestamptz not null default now(),
  primary key (user_id, submodule_id)
);

create table if not exists public.user_module_progress (
  user_id text not null,
  module_id text not null references public.learning_modules(id) on delete cascade,
  verified_submodule_count integer not null default 0 check (verified_submodule_count >= 0),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, module_id)
);

create table if not exists public.user_level_progress (
  user_id text not null,
  level_id text not null references public.learning_levels(id) on delete cascade,
  verified_submodule_count integer not null default 0 check (verified_submodule_count >= 0),
  total_submodule_count integer not null default 0 check (total_submodule_count >= 0),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, level_id)
);

create table if not exists public.learning_rep_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  amount integer not null check (amount <> 0),
  reason text not null,
  source text not null,
  source_id text not null,
  created_at timestamptz not null default now(),
  unique(user_id, source, source_id)
);

create index if not exists idx_user_submodule_progress_user on public.user_submodule_progress(user_id);
create index if not exists idx_user_module_progress_user on public.user_module_progress(user_id);
create index if not exists idx_user_level_progress_user on public.user_level_progress(user_id);
create index if not exists idx_learning_rep_ledger_user_created on public.learning_rep_ledger(user_id, created_at desc);

insert into public.learning_levels (id, level_number, title, subtitle, is_mandatory)
values ('level-0', 0, 'CSE Foundations', 'Mandatory foundation before specialization', true)
on conflict (id) do update set title=excluded.title, subtitle=excluded.subtitle, is_mandatory=excluded.is_mandatory;

insert into public.learning_modules (id, level_id, module_order, title, description, icon, estimated_minutes, rep_reward) values
('cse-foundations','level-0',1,'CSE Foundations','A compact map of the major areas of Computer Science and how they connect.','layers',75,120),
('git-basics','level-0',2,'Git & Version Control','Learn Git concepts and the workflow used to safely manage code changes.','git-branch',100,140),
('computer-networks','level-0',3,'Computer Networks','Build the mental model behind the internet, requests, addresses, protocols, and packets.','network',100,140),
('c-programming','level-0',4,'C Programming Basics','Learn the programming fundamentals that make lower-level concepts easier to understand later.','code-2',110,150),
('college-study-strategy','level-0',5,'College Study Strategy','A senior-led blog series about studying consistently, choosing priorities, and surviving college without burning out.','graduation-cap',55,90),
('computer-fundamentals','level-0',6,'Computer Fundamentals','Build the basic mental model of hardware, operating systems, storage, memory, and execution.','cpu',90,130)
on conflict (id) do update set title=excluded.title,description=excluded.description,icon=excluded.icon,estimated_minutes=excluded.estimated_minutes,rep_reward=excluded.rep_reward;

insert into public.learning_submodules (id,module_id,submodule_order,title,description,estimated_minutes,kind,rep_reward) values
('cse-map','cse-foundations',1,'The CSE Map','Understand the major branches of Computer Science without going too deep yet.',20,'interactive',20),
('how-software-comes-together','cse-foundations',2,'How Software Fits Together','Trace a simple idea from source code to a running application.',25,'theory',20),
('cse-foundations-checkpoint','cse-foundations',3,'Foundations Checkpoint','Prove that you can identify the role of the major CSE areas.',30,'assessment',40),
('git-mental-model','git-basics',1,'Git Mental Model','Understand repositories, working trees, staging, commits, branches, and remotes.',25,'interactive',20),
('git-core-workflow','git-basics',2,'The Core Git Workflow','Practice init, status, add, commit, branch, merge, pull, and push.',40,'practical',40),
('git-github-workflow','git-basics',3,'GitHub & Collaboration','Connect Git to GitHub, pull requests, and basic collaboration.',20,'theory',20),
('git-practical-checkpoint','git-basics',4,'Git Practical Checkpoint','Demonstrate a complete local-to-remote workflow.',15,'assessment',60),
('network-basics','computer-networks',1,'Networks, Devices & Addresses','Learn LAN, WAN, IP, MAC, ports, routers, and switches.',25,'interactive',20),
('dns-http-tcp','computer-networks',2,'DNS, HTTP, TCP & HTTPS','Understand the common layers behind a modern web request.',30,'theory',25),
('url-to-page','computer-networks',3,'What Happens When You Open a URL?','Follow a request from browser to server and back.',25,'interactive',25),
('network-checkpoint','computer-networks',4,'Network Checkpoint','Explain the journey of a web request in the correct order.',20,'assessment',50),
('c-syntax-control-flow','c-programming',1,'C Syntax & Control Flow','Start with variables, types, operators, conditions, loops, and functions.',35,'practical',35),
('c-arrays-pointers','c-programming',2,'Arrays, Strings & Pointers','Get the first practical exposure to memory-oriented programming.',35,'interactive',35),
('c-memory-functions','c-programming',3,'Functions, Memory & Compilation','Connect source code, compilation, memory, and execution.',20,'theory',20),
('c-foundations-checkpoint','c-programming',4,'C Foundations Checkpoint','Solve small programming exercises and explain the memory model at a beginner level.',20,'assessment',60),
('study-senior-stories','college-study-strategy',1,'Senior Stories','Read practical lessons from seniors and alumni in blog format.',20,'reflection',20),
('study-planning','college-study-strategy',2,'Build Your Weekly System','Turn advice into a realistic weekly study and development routine.',20,'practical',30),
('study-reflection','college-study-strategy',3,'Your Personal Study Contract','Write a short commitment to how you will approach the next learning level.',15,'assessment',40),
('hardware-basics','computer-fundamentals',1,'CPU, Memory & Storage','Understand the role of the CPU, RAM, cache, persistent storage, and I/O devices.',25,'interactive',20),
('os-basics','computer-fundamentals',2,'Operating System Basics','Understand processes, files, users, permissions, and system resources.',25,'theory',25),
('execution-cycle','computer-fundamentals',3,'From Instruction to Execution','Connect source-level code to CPU instructions at a high level.',20,'interactive',25),
('fundamentals-checkpoint','computer-fundamentals',4,'Computer Fundamentals Checkpoint','Demonstrate that you understand the core hardware/software model.',20,'assessment',60)
on conflict (id) do update set title=excluded.title,description=excluded.description,estimated_minutes=excluded.estimated_minutes,kind=excluded.kind,rep_reward=excluded.rep_reward;

alter table public.learning_levels enable row level security;
alter table public.learning_modules enable row level security;
alter table public.learning_submodules enable row level security;
alter table public.user_submodule_progress enable row level security;
alter table public.user_module_progress enable row level security;
alter table public.user_level_progress enable row level security;
alter table public.learning_rep_ledger enable row level security;

create or replace function public.complete_learning_submodule(p_user_id text, p_submodule_id text)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  v_submodule public.learning_submodules%rowtype;
  v_module public.learning_modules%rowtype;
  v_level public.learning_levels%rowtype;
  v_new_submodule boolean := false;
  v_module_count integer;
  v_verified_count integer;
  v_module_completed boolean := false;
  v_level_total integer;
  v_level_verified integer;
  v_level_completed boolean := false;
  v_rep_awarded integer := 0;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then raise exception 'user_id is required'; end if;
  select * into v_submodule from public.learning_submodules where id=p_submodule_id;
  if not found then raise exception 'Unknown learning submodule'; end if;
  select * into v_module from public.learning_modules where id=v_submodule.module_id;
  select * into v_level from public.learning_levels where id=v_module.level_id;

  insert into public.user_submodule_progress(user_id,submodule_id) values(p_user_id,p_submodule_id) on conflict(user_id,submodule_id) do nothing;
  v_new_submodule := found;

  select count(*) into v_module_count from public.learning_submodules where module_id=v_module.id;
  select count(*) into v_verified_count from public.user_submodule_progress usp join public.learning_submodules ls on ls.id=usp.submodule_id where usp.user_id=p_user_id and ls.module_id=v_module.id;
  v_module_completed := v_verified_count=v_module_count;
  insert into public.user_module_progress(user_id,module_id,verified_submodule_count,completed_at,updated_at)
  values(p_user_id,v_module.id,v_verified_count,case when v_module_completed then now() else null end,now())
  on conflict(user_id,module_id) do update set verified_submodule_count=excluded.verified_submodule_count,completed_at=case when public.user_module_progress.completed_at is not null then public.user_module_progress.completed_at else excluded.completed_at end,updated_at=now();

  if v_new_submodule then
    insert into public.learning_rep_ledger(user_id,amount,reason,source,source_id) values(p_user_id,v_submodule.rep_reward,'Completed Level 0 submodule','learning_submodule',p_submodule_id) on conflict(user_id,source,source_id) do nothing;
    if found then v_rep_awarded:=v_rep_awarded+v_submodule.rep_reward; end if;
  end if;

  if v_module_completed and not exists(select 1 from public.learning_rep_ledger where user_id=p_user_id and source='learning_module' and source_id=v_module.id) then
    insert into public.learning_rep_ledger(user_id,amount,reason,source,source_id) values(p_user_id,v_module.rep_reward,'Completed Level 0 module','learning_module',v_module.id);
    v_rep_awarded:=v_rep_awarded+v_module.rep_reward;
  end if;

  select count(*) into v_level_total from public.learning_submodules ls join public.learning_modules lm on lm.id=ls.module_id where lm.level_id=v_level.id;
  select count(*) into v_level_verified from public.user_submodule_progress usp join public.learning_submodules ls on ls.id=usp.submodule_id join public.learning_modules lm on lm.id=ls.module_id where usp.user_id=p_user_id and lm.level_id=v_level.id;
  v_level_completed:=v_level_verified=v_level_total;
  insert into public.user_level_progress(user_id,level_id,verified_submodule_count,total_submodule_count,completed_at,updated_at)
  values(p_user_id,v_level.id,v_level_verified,v_level_total,case when v_level_completed then now() else null end,now())
  on conflict(user_id,level_id) do update set verified_submodule_count=excluded.verified_submodule_count,total_submodule_count=excluded.total_submodule_count,completed_at=case when public.user_level_progress.completed_at is not null then public.user_level_progress.completed_at else excluded.completed_at end,updated_at=now();

  return jsonb_build_object('levelId',v_level.id,'moduleId',v_module.id,'submoduleId',v_submodule.id,'newlyVerified',v_new_submodule,'moduleCompleted',v_module_completed,'levelCompleted',v_level_completed,'verifiedSubmoduleCount',v_level_verified,'totalSubmoduleCount',v_level_total,'repAwarded',v_rep_awarded);
end; $$;

revoke execute on function public.complete_learning_submodule(text,text) from public, anon, authenticated;
grant execute on function public.complete_learning_submodule(text,text) to service_role;
