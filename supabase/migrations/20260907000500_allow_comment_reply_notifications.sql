alter table public.devcollective_notifications drop constraint if exists devcollective_notifications_type_check;
alter table public.devcollective_notifications add constraint devcollective_notifications_type_check check (type = any (array['post_like'::text, 'comment_like'::text, 'comment_reply'::text]));

alter table public.devcollective_notifications drop constraint if exists devcollective_notifications_target_check;
alter table public.devcollective_notifications add constraint devcollective_notifications_target_check check (
  ((type = 'post_like'::text) and (post_id is not null) and (comment_id is null))
  or ((type = 'comment_like'::text) and (comment_id is not null) and (post_id is not null))
  or ((type = 'comment_reply'::text) and (comment_id is not null) and (post_id is not null))
);