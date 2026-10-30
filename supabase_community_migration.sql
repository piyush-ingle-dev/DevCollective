-- DevCollective community persistence
-- Creates durable posts and likes used by the Clerk-authenticated Express API.

create table if not exists public.devcollective_posts (
  id uuid primary key default gen_random_uuid(),
  author_clerk_user_id text not null references public.devcollective_profiles(clerk_user_id) on delete cascade,
  category text not null check (category in ('Build in Public','Questions','Projects','Hackathons','AI','Android','General')),
  title text,
  content text not null,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists devcollective_posts_created_at_idx on public.devcollective_posts(created_at desc);
create index if not exists devcollective_posts_category_idx on public.devcollective_posts(category);
create index if not exists devcollective_posts_author_idx on public.devcollective_posts(author_clerk_user_id);

create table if not exists public.devcollective_post_likes (
  post_id uuid not null references public.devcollective_posts(id) on delete cascade,
  user_clerk_user_id text not null references public.devcollective_profiles(clerk_user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_clerk_user_id)
);

create index if not exists devcollective_post_likes_user_idx on public.devcollective_post_likes(user_clerk_user_id);

create or replace function public.devcollective_posts_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists devcollective_posts_updated_at on public.devcollective_posts;
create trigger devcollective_posts_updated_at before update on public.devcollective_posts
for each row execute function public.devcollective_posts_set_updated_at();

alter table public.devcollective_posts enable row level security;
alter table public.devcollective_post_likes enable row level security;

revoke all on table public.devcollective_posts from anon, authenticated;
revoke all on table public.devcollective_post_likes from anon, authenticated;
grant all on table public.devcollective_posts to service_role;
grant all on table public.devcollective_post_likes to service_role;

drop policy if exists "DevCollective posts are publicly readable to app users" on public.devcollective_posts;
create policy "DevCollective posts are publicly readable to app users" on public.devcollective_posts
for select to authenticated using (true);

drop policy if exists "DevCollective likes are readable to app users" on public.devcollective_post_likes;
create policy "DevCollective likes are readable to app users" on public.devcollective_post_likes
for select to authenticated using (true);
