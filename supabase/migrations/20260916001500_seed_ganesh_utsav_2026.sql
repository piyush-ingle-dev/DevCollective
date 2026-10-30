insert into public.devcollective_events (
  slug, title, subtitle, description, starts_at, ends_at, venue, city, organizer,
  registration_url, source_url, ticket_info, theme, speakers, coordinators, contact_info
)
values (
  'shree-ganesh-utsav-2026',
  'Shree Ganesh Utsav Celebration 2026',
  'DEVOTION · DISCIPLINE · TOGETHERNESS',
  'You are cordially invited to join us for the Shree Ganesh Utsav Celebration 2026 at Shraddha Park, Nagpur. Let us come together to seek the blessings of Lord Ganesha and celebrate this auspicious occasion with devotion, joy and togetherness.',
  '2026-09-14 11:00:00+05:30',
  '2026-09-24 18:00:00+05:30',
  'Shraddha Park',
  'Nagpur',
  'Team Shree Ganesh Utsav Celebration 2026',
  null,
  null,
  'Main celebration: 15 September 2026 at 10:30 AM. College ID card is compulsory for entry.',
  '{"background":"#F7F0E5","foreground":"#171717","primary":"#5B169D","secondary":"#EEE2D4","accent":"#F36B21"}'::jsonb,
  '[]'::jsonb,
  '["Dr. Vivek Kapur · Campus Director, Shraddha Park Campus","Team Shree Ganesh Utsav Celebration 2026"]'::jsonb,
  'Shraddha Park, Nagpur'
)
on conflict (slug) do update set
  title=excluded.title,
  subtitle=excluded.subtitle,
  description=excluded.description,
  starts_at=excluded.starts_at,
  ends_at=excluded.ends_at,
  venue=excluded.venue,
  city=excluded.city,
  organizer=excluded.organizer,
  registration_url=excluded.registration_url,
  source_url=excluded.source_url,
  ticket_info=excluded.ticket_info,
  theme=excluded.theme,
  speakers=excluded.speakers,
  coordinators=excluded.coordinators,
  contact_info=excluded.contact_info,
  updated_at=now();
