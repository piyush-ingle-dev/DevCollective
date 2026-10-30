import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, CalendarDays, ChevronRight, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { DevEvent } from '../types';

const API = `${String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')}/functions/v1/events`;

const fallbackEvents: DevEvent[] = [
  {
    id: 'tedx-ghrcemn-2026', slug: 'tedx-ghrcemn-2026', title: 'TEDxGHRCEMN 2026', subtitle: 'BEYOND THE DOTS',
    description: 'Ideas. Stories. Perspectives. All on one stage. A day filled with thought-provoking talks, new perspectives, meaningful conversations and ideas worth taking beyond the room.',
    startsAt: '2026-09-09T09:00:00+05:30', endsAt: '2026-09-09T18:00:00+05:30', venue: 'Eklavya Hall, G H Raisoni College of Engineering and Management', city: 'Nagpur', organizer: 'TEDxGHRCEMN',
    registrationUrl: 'https://konfhub.com/tedxghrcemn-82e1c5a4', sourceUrl: 'https://www.tedxghrcemn.site/', ticketInfo: 'Main event passes were listed from ₹399; ticketing and payment were handled by KonfHub.',
    theme: { background: '#050505', foreground: '#FFFFFF', primary: '#E50914', secondary: '#171717', accent: '#FF1A1A' }, speakers: [], coordinators: [], contactInfo: '', createdAt: '2026-09-01T00:00:00+05:30', updatedAt: '2026-09-15T00:00:00+05:30',
  },
  {
    id: 'shree-ganesh-utsav-2026', slug: 'shree-ganesh-utsav-2026', title: 'Shree Ganesh Utsav Celebration 2026', subtitle: 'DEVOTION · DISCIPLINE · TOGETHERNESS',
    description: 'Shree Ganesh Utsav Celebration 2026 at Shraddha Park, Nagpur. Main celebration on 15 September at 10:30 AM, with the campus schedule continuing through 24 September.',
    startsAt: '2026-09-14T11:00:00+05:30', endsAt: '2026-09-24T18:00:00+05:30', venue: 'Shraddha Park', city: 'Nagpur', organizer: 'Team Shree Ganesh Utsav Celebration 2026', registrationUrl: null, sourceUrl: null, ticketInfo: 'College ID card is compulsory for entry.',
    theme: { background: '#F7F0E5', foreground: '#171717', primary: '#5B169D', secondary: '#EEE2D4', accent: '#F36B21' }, speakers: [], coordinators: ['Dr. Vivek Kapur'], contactInfo: 'Shraddha Park, Nagpur', createdAt: '2026-09-16T00:00:00+05:30', updatedAt: '2026-09-16T00:00:00+05:30',
  },
];

const statusOf = (event: DevEvent) => {
  const now = Date.now();
  if (now < new Date(event.startsAt).getTime()) return 'UPCOMING';
  if (now <= new Date(event.endsAt).getTime()) return 'ONGOING';
  return 'PAST';
};
const formatDate = (value: string) => new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));

export const LandingEventsSection: React.FC = () => {
  const { setActiveTab } = useAuth();
  const [events, setEvents] = useState<DevEvent[]>([]);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(API, { cache: 'no-store' });
      if (!response.ok) throw new Error('Events request failed');
      const body = await response.json();
      const next = Array.isArray(body.events) ? body.events as DevEvent[] : [];
      setEvents(next.length ? next : fallbackEvents);
    } catch {
      setEvents(fallbackEvents);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const root = document.querySelector('.dc-public');
    if (!root) return;
    const cflowSection = Array.from(root.querySelectorAll('section')).find((section) => section.textContent?.includes('Understand the flow.'));
    if (!cflowSection?.parentElement) return;

    const slot = document.createElement('div');
    slot.setAttribute('data-dc-landing-events-slot', 'true');
    cflowSection.parentElement.insertBefore(slot, cflowSection.nextElementSibling);
    setPortalTarget(slot);

    return () => {
      setPortalTarget(null);
      slot.remove();
    };
  }, []);

  const featured = useMemo(() => {
    const active = events.filter((event) => statusOf(event) !== 'PAST');
    return active.length ? active : events.slice(0, 3);
  }, [events]);
  const openEvents = () => setActiveTab('events');

  const section = (
    <section className="border-y-2 border-outline-variant bg-[#F3EBDD]" data-gsap-reveal>
      <div className="max-w-[1500px] mx-auto py-20 sm:py-28">
        <div className="px-5 sm:px-8 lg:px-12">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
            <div><p className="dc-mono text-[9px] uppercase tracking-[0.22em] text-[#171717]/55">[ 05 / CAMPUS EVENTS ]</p><h2 className="dc-display text-5xl sm:text-6xl lg:text-8xl text-[#171717] mt-3">WHAT'S<br /><span className="text-primary">HAPPENING.</span></h2><p className="mt-5 max-w-xl text-sm sm:text-base leading-relaxed text-[#171717]/65">Real college events, talks, hackathons and community gatherings — discovered, organised and kept alive inside DevCollective.</p></div>
            <button type="button" onClick={openEvents} className="inline-flex items-center gap-3 self-start lg:self-auto px-5 py-3 border-2 border-[#171717] bg-[#FFF9F0] text-[#171717] dc-mono text-[9px] uppercase font-bold shadow-[4px_4px_0_#171717] hover:-translate-y-0.5 transition-transform">Explore all events <ArrowRight className="w-4 h-4" /></button>
          </div>
        </div>

        <button type="button" onClick={openEvents} className="group w-full text-left border-y-2 border-[#171717] overflow-hidden bg-[#171717]">
          <div className="flex whitespace-nowrap py-3 border-b-2 border-[#171717] bg-[#E50914] text-white dc-mono text-[9px] uppercase tracking-[0.18em] overflow-hidden">
            <div className="flex shrink-0 animate-[marquee_22s_linear_infinite] group-hover:[animation-play-state:paused]">{[...featured, ...featured].map((event, index) => <React.Fragment key={`${event.id}-ticker-${index}`}><span className="px-6">{statusOf(event)} / {event.title} / {event.slug === 'shree-ganesh-utsav-2026' ? '15 SEP 2026' : formatDate(event.startsAt)}</span><span aria-hidden="true">◆</span></React.Fragment>)}</div>
          </div>

          <div className="grid lg:grid-cols-[1.3fr_.7fr] min-h-[360px]">
            <div className="p-7 sm:p-10 lg:p-14 text-white border-b-2 lg:border-b-0 lg:border-r-2 border-[#E50914] relative overflow-hidden"><div className="absolute -right-16 -top-16 w-56 h-56 border-[30px] border-[#E50914] rounded-full opacity-30 group-hover:scale-110 transition-transform duration-700" /><p className="relative dc-mono text-[9px] uppercase tracking-[0.2em] text-[#E50914]">LIVE CAMPUS CALENDAR / {featured.length} ACTIVE</p><h3 className="relative mt-7 font-black uppercase leading-[.88] tracking-[-.06em] text-[clamp(3.5rem,9vw,8rem)]">EVENTS<br /><span className="text-[#E50914]">IN MOTION.</span></h3><p className="relative mt-7 max-w-2xl text-sm sm:text-base text-white/65 leading-relaxed">Click anywhere to enter the Events desk. Every event carries its own visual identity — just like the people and ideas behind it.</p><div className="relative mt-9 inline-flex items-center gap-2 px-4 py-3 border-2 border-[#E50914] dc-mono text-[9px] uppercase text-white group-hover:bg-[#E50914] transition-colors">Open Events <ChevronRight className="w-4 h-4" /></div></div>
            <div className="bg-[#F3EBDD] text-[#171717] p-6 sm:p-8 flex flex-col gap-3">{featured.slice(0, 3).map((event) => <div key={event.id} className="border-2 border-[#171717] bg-[#FFF9F0] p-4 transition-transform group-hover:translate-x-1"><div className="flex items-center justify-between gap-3 dc-mono text-[8px] uppercase"><span style={{ color: event.theme.primary }}>{statusOf(event)}</span><span>{event.slug === 'shree-ganesh-utsav-2026' ? '15 Sep 2026' : formatDate(event.startsAt)}</span></div><div className="dc-display text-2xl mt-2">{event.title}</div><div className="dc-mono text-[8px] uppercase mt-1">{event.subtitle}</div><div className="mt-3 flex items-start gap-2 text-[10px] text-[#171717]/65"><MapPin className="w-3.5 h-3.5 shrink-0" /> <span>{event.venue}, {event.city}</span></div></div>)}{featured.length === 0 && <div className="flex-1 flex items-center justify-center text-center dc-mono text-[9px] uppercase text-[#171717]/50">No campus events listed yet.</div>}</div>
          </div>
        </button>
        <div className="px-5 sm:px-8 lg:px-12 mt-5 flex items-center gap-2 dc-mono text-[8px] uppercase tracking-[0.16em] text-[#171717]/45"><CalendarDays className="w-3.5 h-3.5" /> Event data is maintained regularly by DevCollective administrators.</div>
      </div>
    </section>
  );

  return portalTarget ? createPortal(section, portalTarget) : null;
};
