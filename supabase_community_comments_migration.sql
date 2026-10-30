-- DevCollective community comments persistence
-- Comments are authored by Clerk users and stored in Supabase.

create table if not exists public.devcollective_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.devcollective_posts(id) on delete cascade,
  author_clerk_user_id text not null references public.devcollective_profiles(clerk_user_id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists devcollective_post_comments_post_idx on public.devcollective_post_comments(post_id, created_at asc);
create index if not exists devcollective_post_comments_author_idx on public.devcollective_post_comments(author_clerk_user_id);

alter table public.devcollective_post_comments enable row level security;
revoke all on table public.devcollective_post_comments from anon, authenticated;
grant all on table public.devcollective_post_comments to service_role;

drop policy if exists "DevCollective comments are readable to app users" on public.devcollective_post_comments;
create policy "DevCollective comments are readable to app users" on public.devcollective_post_comments
for select to authenticated using (true);
