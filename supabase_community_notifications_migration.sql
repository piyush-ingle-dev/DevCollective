-- DevCollective likes + notification persistence
-- Post likes already exist; this adds comment likes and durable in-app notifications.

create table if not exists public.devcollective_post_comment_likes (
  comment_id uuid not null references public.devcollective_post_comments(id) on delete cascade,
  user_clerk_user_id text not null references public.devcollective_profiles(clerk_user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_clerk_user_id)
);

create index if not exists devcollective_comment_likes_comment_idx
  on public.devcollective_post_comment_likes(comment_id);

create table if not exists public.devcollective_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_clerk_user_id text not null references public.devcollective_profiles(clerk_user_id) on delete cascade,
  actor_clerk_user_id text not null references public.devcollective_profiles(clerk_user_id) on delete cascade,
  type text not null check (type in ('post_like', 'comment_like')),
  post_id uuid references public.devcollective_posts(id) on delete cascade,
  comment_id uuid references public.devcollective_post_comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint devcollective_notifications_target_check check (
    (type = 'post_like' and post_id is not null and comment_id is null)
    or
    (type = 'comment_like' and comment_id is not null and post_id is not null)
  )
);

create index if not exists devcollective_notifications_recipient_idx
  on public.devcollective_notifications(recipient_clerk_user_id, created_at desc);

alter table public.devcollective_post_comment_likes enable row level security;
alter table public.devcollective_notifications enable row level security;
revoke all on table public.devcollective_post_comment_likes from anon, authenticated;
revoke all on table public.devcollective_notifications from anon, authenticated;
grant all on table public.devcollective_post_comment_likes to service_role;
grant all on table public.devcollective_notifications to service_role;

drop policy if exists "DevCollective comment likes are readable to app users" on public.devcollective_post_comment_likes;
create policy "DevCollective comment likes are readable to app users"
  on public.devcollective_post_comment_likes for select to authenticated using (true);

drop policy if exists "DevCollective notifications are readable to app users" on public.devcollective_notifications;
create policy "DevCollective notifications are readable to app users"
  on public.devcollective_notifications for select to authenticated using (true);

create or replace function public.devcollective_notify_post_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient text;
begin
  select author_clerk_user_id into recipient
  from public.devcollective_posts
  where id = new.post_id;

  if recipient is not null and recipient <> new.user_clerk_user_id then
    insert into public.devcollective_notifications
      (recipient_clerk_user_id, actor_clerk_user_id, type, post_id)
    values
      (recipient, new.user_clerk_user_id, 'post_like', new.post_id);
  end if;

  return new;
end;
$$;

drop trigger if exists devcollective_post_like_notification on public.devcollective_post_likes;
create trigger devcollective_post_like_notification
after insert on public.devcollective_post_likes
for each row execute function public.devcollective_notify_post_like();

create or replace function public.devcollective_notify_comment_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient text;
  post_id_for_comment uuid;
begin
  select author_clerk_user_id, post_id
    into recipient, post_id_for_comment
  from public.devcollective_post_comments
  where id = new.comment_id;

  if recipient is not null and recipient <> new.user_clerk_user_id then
    insert into public.devcollective_notifications
      (recipient_clerk_user_id, actor_clerk_user_id, type, post_id, comment_id)
    values
      (recipient, new.user_clerk_user_id, 'comment_like', post_id_for_comment, new.comment_id);
  end if;

  return new;
end;
$$;

drop trigger if exists devcollective_comment_like_notification on public.devcollective_post_comment_likes;
create trigger devcollective_comment_like_notification
after insert on public.devcollective_post_comment_likes
for each row execute function public.devcollective_notify_comment_like();
