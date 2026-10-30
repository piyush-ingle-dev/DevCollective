alter table public.devcollective_messages
  add column if not exists edited_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by text,
  add column if not exists reply_to_message_id uuid references public.devcollective_messages(id) on delete set null;

create table if not exists public.devcollective_message_deletions (
  message_id uuid not null references public.devcollective_messages(id) on delete cascade,
  clerk_user_id text not null,
  deleted_at timestamptz not null default now(),
  primary key (message_id, clerk_user_id)
);

create index if not exists idx_dc_message_deletions_user
  on public.devcollective_message_deletions(clerk_user_id, deleted_at desc);

create index if not exists idx_dc_messages_reply
  on public.devcollective_messages(reply_to_message_id);

alter table public.devcollective_message_deletions enable row level security;

revoke all on table public.devcollective_conversations from anon, authenticated;
revoke all on table public.devcollective_conversation_members from anon, authenticated;
revoke all on table public.devcollective_messages from anon, authenticated;
revoke all on table public.devcollective_message_deletions from anon, authenticated;

grant select, insert, update, delete, references, trigger, truncate
  on table public.devcollective_conversations to service_role;
grant select, insert, update, delete, references, trigger, truncate
  on table public.devcollective_conversation_members to service_role;
grant select, insert, update, delete, references, trigger, truncate
  on table public.devcollective_messages to service_role;
grant select, insert, update, delete, references, trigger, truncate
  on table public.devcollective_message_deletions to service_role;

comment on column public.devcollective_messages.edited_at is 'Timestamp of the most recent server-authorized edit.';
comment on column public.devcollective_messages.deleted_at is 'Soft-delete timestamp for delete-for-everyone.';
comment on column public.devcollective_messages.deleted_by is 'Clerk user id that performed delete-for-everyone.';
comment on column public.devcollective_messages.reply_to_message_id is 'Optional referenced message in the same conversation.';
comment on table public.devcollective_message_deletions is 'Per-user soft deletion state for delete-for-me.';
