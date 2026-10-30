alter table public.devcollective_events
  add column if not exists details jsonb not null default '{}'::jsonb;

insert into public.devcollective_events (
  slug,
  title,
  subtitle,
  description,
  starts_at,
  ends_at,
  venue,
  city,
  organizer,
  registration_url,
  source_url,
  ticket_info,
  theme,
  speakers,
  coordinators,
  contact_info,
  details
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
  '{"background":"#F7F0E5","foreground":"#171717","primary":"#5B169D","secondary":"#EEE2D4","accent":"#F36B21"}',
  '[]',
  '["Dr. Vivek Kapur · Campus Director, Shraddha Park Campus","Team Shree Ganesh Utsav Celebration 2026"]',
  'Shraddha Park, Nagpur',
  '{
    "specialNote":"Traditional attire is encouraged for all students and faculty.",
    "quote":"Ganpati Bappa Morya!",
    "presidedBy":"Dr. Vivek Kapur",
    "presidedByTitle":"Campus Director, Shraddha Park Campus",
    "organizedBy":"Team Shree Ganesh Utsav Celebration 2026",
    "mainDate":"15 September 2026",
    "mainTime":"10:30 AM",
    "instructions":[
      "College ID Card is compulsory for entry. No entry will be permitted without a valid ID Card.",
      "Students must maintain proper discipline and decorum throughout the celebration.",
      "Follow the instructions of faculty coordinators and event volunteers.",
      "Maintain cleanliness and do not litter the campus premises.",
      "Any misconduct or indiscipline will not be tolerated. Strict action will be taken against students found violating the rules.",
      "Students are requested to cooperate with the organizing team for the smooth and safe conduct of the event."
    ],
    "schedule":[
      {"date":"14-Sep-26","day":"Monday","morning":"Hostel","afternoon":"Hostel"},
      {"date":"15-Sep-26","day":"Tuesday","morning":"Campus Director Office, Registrar, Deans and COE Office","afternoon":"Registrar Office: Account, HR, Student section"},
      {"date":"16-Sep-26","day":"Wednesday","morning":"GHRCEM First Year","afternoon":"GHRCEM and GHRSTU - ETC and GHRUA"},
      {"date":"17-Sep-26","day":"Thursday","morning":"GHRCEM - CSE and IT","afternoon":"GHRCEM - AI"},
      {"date":"18-Sep-26","day":"Friday","morning":"Hostel","afternoon":"Hostel"},
      {"date":"19-Sep-26","day":"Saturday","morning":"GHRSTU First Year","afternoon":"Maintenance Department"},
      {"date":"20-Sep-26","day":"Sunday","morning":"Hostel","afternoon":"Hostel"},
      {"date":"21-Sep-26","day":"Monday","morning":"Science and Technology","afternoon":"GHRCEM and GHRSTU - DS and CYS"},
      {"date":"22-Sep-26","day":"Tuesday","morning":"Polytechnic","afternoon":"GHRSTU 2nd/3rd Year (CSE/AI)"},
      {"date":"23-Sep-26","day":"Wednesday","morning":"Commerce and Management","afternoon":"GHRCEM and GHRSTU - CE, ME and EE"},
      {"date":"24-Sep-26","day":"Thursday","morning":"Pharmacy and Junior college","afternoon":"Mahaprasad and Visarjan"}
    ]
  }'
)
on conflict (slug) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  description = excluded.description,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  venue = excluded.venue,
  city = excluded.city,
  organizer = excluded.organizer,
  registration_url = excluded.registration_url,
  source_url = excluded.source_url,
  ticket_info = excluded.ticket_info,
  theme = excluded.theme,
  speakers = excluded.speakers,
  coordinators = excluded.coordinators,
  contact_info = excluded.contact_info,
  details = excluded.details,
  updated_at = now();
