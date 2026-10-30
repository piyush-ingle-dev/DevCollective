import React, { useEffect, useState } from 'react';
import { useAuth as useClerkAuth } from '@clerk/react';
import { useAuth } from '../context/AuthContext';
import { X, ShieldCheck, Trash2 } from 'lucide-react';
import type { DevEvent } from '../types';

const API = `${String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')}/functions/v1/events`;

const blank = {
  title: '', subtitle: '', description: '', startsAt: '', endsAt: '', venue: '', city: 'Nagpur', organizer: '',
  registrationUrl: '', sourceUrl: '', ticketInfo: '', speakers: '', coordinators: '', contactInfo: '',
  detailsJson: '{}',
  background: '#050505', foreground: '#FFFFFF', primary: '#E50914', secondary: '#171717', accent: '#FF1A1A'
};

type FormState = typeof blank;

export const AdminEventsManager: React.FC = () => {
  const { activeTab } = useAuth();
  const { getToken } = useClerkAuth();
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<DevEvent[]>([]);
  const [form, setForm] = useState<FormState>(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const response = await fetch(API, { cache: 'no-store' });
      const body = await response.json();
      setEvents(Array.isArray(body.events) ? body.events : []);
    } catch {
      setMessage('Could not load events.');
    }
  };

  const auth = async () => {
    const token = await getToken();
    if (!token) throw new Error('Authentication required.');
    return token;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const token = await auth();
      let details: unknown = {};
      try {
        details = JSON.parse(form.detailsJson || '{}');
        if (!details || Array.isArray(details) || typeof details !== 'object') throw new Error('Event details must be a JSON object.');
      } catch (error) {
        throw new Error(error instanceof Error && error.message.includes('JSON') ? `Invalid event details JSON: ${error.message}` : 'Event details must be a JSON object.');
      }

      const payload = {
        ...form,
        id: editing || undefined,
        details,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        speakers: form.speakers.split(',').map(v => v.trim()).filter(Boolean),
        coordinators: form.coordinators.split(',').map(v => v.trim()).filter(Boolean),
        theme: {
          background: form.background,
          foreground: form.foreground,
          primary: form.primary,
          secondary: form.secondary,
          accent: form.accent
        }
      };

      const response = await fetch(API, {
        method: editing ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not save event.');

      setMessage(editing ? 'Event updated.' : 'Event created.');
      setForm(blank);
      setEditing(null);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save event.');
    } finally {
      setBusy(false);
    }
  };

  const edit = (event: DevEvent) => {
    setEditing(event.id);
    setForm({
      title: event.title,
      subtitle: event.subtitle,
      description: event.description,
      startsAt: event.startsAt.slice(0, 16),
      endsAt: event.endsAt.slice(0, 16),
      venue: event.venue,
      city: event.city,
      organizer: event.organizer,
      registrationUrl: event.registrationUrl || '',
      sourceUrl: event.sourceUrl || '',
      ticketInfo: event.ticketInfo || '',
      speakers: event.speakers.join(', '),
      coordinators: event.coordinators.join(', '),
      contactInfo: event.contactInfo || '',
      detailsJson: JSON.stringify(event.details || {}, null, 2),
      background: event.theme.background,
      foreground: event.theme.foreground,
      primary: event.theme.primary,
      secondary: event.theme.secondary,
      accent: event.theme.accent
    });
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this event?')) return;
    setBusy(true);
    try {
      const token = await auth();
      const response = await fetch(`${API}?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not delete event.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not delete event.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'admin') void load();
  }, [activeTab]);

  if (activeTab !== 'admin') return null;

  const reset = () => {
    setEditing(null);
    setForm(blank);
    setMessage('');
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-[90] inline-flex items-center gap-2 px-4 py-3 border-2 border-outline-variant bg-dc-yellow shadow-[4px_4px_0_#171717] font-mono text-[9px] uppercase font-bold"
      >
        <ShieldCheck className="w-4 h-4" /> Event Control
      </button>

      {open && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
          <div className="max-w-[1300px] mx-auto bg-background border-2 border-outline-variant shadow-[9px_9px_0_#171717] max-h-[calc(100vh-1.5rem)] overflow-y-auto">
            <header className="flex items-center justify-between p-5 border-b-2 border-outline-variant">
              <div>
                <p className="font-mono text-[9px] uppercase text-primary">RBAC / ADMIN ONLY</p>
                <h2 className="dc-display text-4xl">EVENT CONTROL.</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-9 h-9 border-2 border-outline-variant flex items-center justify-center"
                aria-label="Close event control"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="p-4 sm:p-5">
              {message && (
                <div className="mb-3 p-3 border-2 border-outline-variant bg-dc-blue text-xs">
                  {message}
                </div>
              )}

              <div className="grid lg:grid-cols-2 gap-5">
                <form onSubmit={submit} className="border-2 border-outline-variant bg-surface p-4 space-y-2">
                  <div className="flex items-center gap-2 font-mono text-[9px] uppercase">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    {editing ? 'Edit event' : 'Create event'}
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    {[
                      ['title', 'Title'], ['subtitle', 'Theme / subtitle'], ['organizer', 'Organizer'],
                      ['venue', 'Venue'], ['city', 'City'], ['registrationUrl', 'Registration URL'],
                      ['sourceUrl', 'Official/source URL'], ['ticketInfo', 'Ticket info'], ['contactInfo', 'Contact info'],
                      ['speakers', 'Speakers, comma separated'], ['coordinators', 'Coordinators, comma separated']
                    ].map(([key, label]) => (
                      <label key={key} className="block">
                        <span className="font-mono text-[7px] uppercase text-on-surface-variant">{label}</span>
                        <input
                          required={['title', 'subtitle', 'organizer', 'venue', 'city'].includes(key)}
                          value={form[key as keyof FormState]}
                          onChange={event => setForm({ ...form, [key]: event.target.value })}
                          className="mt-0.5 w-full border-2 border-outline-variant bg-background px-2 py-1.5 text-xs"
                        />
                      </label>
                    ))}
                  </div>

                  <label className="block">
                    <span className="font-mono text-[7px] uppercase">Description</span>
                    <textarea
                      required
                      value={form.description}
                      onChange={event => setForm({ ...form, description: event.target.value })}
                      rows={2}
                      className="mt-0.5 w-full border-2 border-outline-variant bg-background px-2 py-1.5 text-xs"
                    />
                  </label>

                  <label className="block">
                    <span className="font-mono text-[7px] uppercase">Structured details JSON</span>
                    <textarea
                      value={form.detailsJson}
                      onChange={event => setForm({ ...form, detailsJson: event.target.value })}
                      rows={4}
                      spellCheck={false}
                      className="mt-0.5 w-full border-2 border-outline-variant bg-background px-2 py-1.5 text-[9px] font-mono leading-relaxed"
                      placeholder='{"specialNote":"...","instructions":["..."],"schedule":[]}'
                    />
                    <span className="block mt-0.5 text-[8px] text-on-surface-variant">Optional event-specific content used by themed detail pages.</span>
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <label>
                      <span className="font-mono text-[7px] uppercase">Starts</span>
                      <input type="datetime-local" required value={form.startsAt} onChange={event => setForm({ ...form, startsAt: event.target.value })} className="mt-0.5 w-full border-2 border-outline-variant bg-background px-2 py-1.5 text-xs" />
                    </label>
                    <label>
                      <span className="font-mono text-[7px] uppercase">Ends</span>
                      <input type="datetime-local" required value={form.endsAt} onChange={event => setForm({ ...form, endsAt: event.target.value })} className="mt-0.5 w-full border-2 border-outline-variant bg-background px-2 py-1.5 text-xs" />
                    </label>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5">
                    {(['background', 'foreground', 'primary', 'secondary', 'accent'] as const).map(key => (
                      <label key={key}>
                        <span className="font-mono text-[6px] uppercase">{key}</span>
                        <input type="color" value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} className="mt-0.5 w-full h-7" />
                      </label>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button disabled={busy} className="px-4 py-2 bg-primary text-on-primary border-2 border-outline-variant font-mono text-[9px] uppercase font-bold">
                      {editing ? 'Update event' : 'Create event'}
                    </button>
                    {editing && (
                      <button type="button" onClick={reset} className="px-4 py-2 border-2 border-outline-variant font-mono text-[9px] uppercase">
                        Cancel
                      </button>
                    )}
                  </div>
                </form>

                <div className="space-y-3">
                  {events.map(event => (
                    <article key={event.id} className="border-2 border-outline-variant bg-surface p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-mono text-[8px] uppercase" style={{ color: event.theme.primary }}>{event.title}</p>
                          <p className="text-xs text-on-surface-variant mt-1">{new Date(event.startsAt).toLocaleString('en-IN')} · {event.venue}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => edit(event)} className="px-3 py-2 border-2 border-outline-variant font-mono text-[8px] uppercase">Edit</button>
                          <button disabled={busy} onClick={() => void remove(event.id)} className="px-3 py-2 border-2 border-outline-variant bg-dc-pink" aria-label={`Delete ${event.title}`}>
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
