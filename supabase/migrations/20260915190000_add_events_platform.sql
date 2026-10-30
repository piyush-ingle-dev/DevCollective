create table if not exists public.devcollective_events (
  id uuid primary key default gen_random_uuid(), slug text not null unique, title text not null, subtitle text not null, description text not null,
  starts_at timestamptz not null, ends_at timestamptz not null, venue text not null, city text not null, organizer text not null,
  registration_url text, source_url text, ticket_info text,
  theme jsonb not null default '{"background":"#050505","foreground":"#FFFFFF","primary":"#E50914","secondary":"#171717","accent":"#FF1A1A"}'::jsonb,
  speakers jsonb not null default '[]'::jsonb, coordinators jsonb not null default '[]'::jsonb, contact_info text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint devcollective_events_valid_window check (ends_at > starts_at)
);
create index if not exists devcollective_events_starts_at_idx on public.devcollective_events(starts_at);
create index if not exists devcollective_events_ends_at_idx on public.devcollective_events(ends_at);
alter table public.devcollective_events enable row level security;
drop policy if exists "events_public_read" on public.devcollective_events;
create policy "events_public_read" on public.devcollective_events for select using (true);
insert into public.devcollective_events (slug,title,subtitle,description,starts_at,ends_at,venue,city,organizer,registration_url,source_url,ticket_info,theme,speakers,coordinators,contact_info)
values ('tedx-ghrcemn-2026','TEDxGHRCEMN 2026','BEYOND THE DOTS','Ideas. Stories. Perspectives. All on one stage. A day filled with thought-provoking talks, new perspectives, meaningful conversations and ideas worth taking beyond the room.','2026-09-09 09:00:00+05:30','2026-09-09 18:00:00+05:30','Eklavya Hall, G H Raisoni College of Engineering and Management','Nagpur','TEDxGHRCEMN','https://konfhub.com/tedxghrcemn-82e1c5a4','https://www.tedxghrcemn.site/','Main event passes were listed from ₹399; ticketing and payment were handled by KonfHub.','{"background":"#050505","foreground":"#FFFFFF","primary":"#E50914","secondary":"#171717","accent":"#FF1A1A"}','["Ajinkya Gandhe","Janhvi Singh","Sarang Thakre","Priyanka Sharma","Jayant Khalatkar","Himanshu Dusane"]','["Karan Baghele","Khushi Chordiya","Faculty Coordinator: Nitin Barsagade"]','Event enquiries: tedxghrcemn@gmail.com')
on conflict (slug) do update set title=excluded.title,subtitle=excluded.subtitle,description=excluded.description,starts_at=excluded.starts_at,ends_at=excluded.ends_at,venue=excluded.venue,city=excluded.city,organizer=excluded.organizer,registration_url=excluded.registration_url,source_url=excluded.source_url,ticket_info=excluded.ticket_info,theme=excluded.theme,speakers=excluded.speakers,coordinators=excluded.coordinators,contact_info=excluded.contact_info,updated_at=now();
