-- Threaded replies for community comments.
alter table public.devcollective_post_comments
  add column if not exists parent_comment_id uuid null;

alter table public.devcollective_post_comments
  drop constraint if exists devcollective_post_comments_parent_comment_id_fkey;

alter table public.devcollective_post_comments
  add constraint devcollective_post_comments_parent_comment_id_fkey
  foreign key (parent_comment_id)
  references public.devcollective_post_comments(id)
  on delete set null;

create index if not exists devcollective_post_comments_parent_idx
  on public.devcollective_post_comments(parent_comment_id);
