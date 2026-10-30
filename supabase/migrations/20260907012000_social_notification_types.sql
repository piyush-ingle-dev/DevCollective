alter table public.devcollective_notifications drop constraint if exists devcollective_notifications_type_check;
alter table public.devcollective_notifications add constraint devcollective_notifications_type_check check (type in ('post_like','comment_like','comment_reply','follow','connection_request','connection_accepted'));
