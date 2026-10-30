import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BriefcaseBusiness, CheckCircle2, MessageSquare, Pencil, Save, ShieldCheck, Handshake } from 'lucide-react';
import { useAuth, } from '../context/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/react';
import { FacultyProfile } from '../types';
import { openMessagingForUser } from '../components/MessagingOverlay';
import { DcButton } from '../components/ui/DcButton';
import { DcCard } from '../components/ui/DcCard';

const splitInput = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 30);

export const FacultyProfilePage: React.FC = () => {
  const { user, setActiveTab } = useAuth();
  const { getToken } = useClerkAuth();
  const [profile, setProfile] = useState<FacultyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestTopic, setRequestTopic] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [requestBusy, setRequestBusy] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    designation: '', department: '', phone: '', subjects: '', expertise: '', yearsExperience: '',
    mentoringAreas: '', bio: '', availabilityStatus: 'available' as FacultyProfile['availabilityStatus'], availabilityNote: '',
  });

  const targetId = useMemo(() => new URLSearchParams(window.location.search).get('faculty') || user?.id || '', [user?.id]);
  const isSelf = Boolean(user?.id && targetId && user.id === targetId);

  const authFetch = async (url: string, init: RequestInit = {}) => {
    const token = await getToken();
    if (!token) throw new Error('Authentication session unavailable.');
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    if (init.body) headers.set('Content-Type', 'application/json');
    const response = await fetch(url, { ...init, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Request failed.');
    return data;
  };

  const load = async () => {
    if (!targetId) return;
    setLoading(true);
    try {
      const data = await authFetch('/api/faculty/' + encodeURIComponent(targetId));
      const next = data.profile as FacultyProfile;
      setProfile(next);
      setForm({
        designation: next.designation || '', department: next.department || '', phone: next.phone || '',
        subjects: next.subjects.join(', '), expertise: next.expertise.join(', '),
        yearsExperience: next.yearsExperience == null ? '' : String(next.yearsExperience),
        mentoringAreas: next.mentoringAreas.join(', '), bio: next.bio || '',
        availabilityStatus: next.availabilityStatus, availabilityNote: next.availabilityNote || '',
      });
    } catch (error: any) {
      setMessage(error.message || 'Could not load faculty profile.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [targetId]);

  useEffect(() => {
    if (!isSelf) return;
    void authFetch('/api/faculty/mentoring-requests?mode=received').then((data) => setRequests(Array.isArray(data.requests) ? data.requests : [])).catch(() => setRequests([]));
  }, [isSelf]);

  const sendMentoringRequest = async () => {
    if (!requestTopic.trim() || !requestMessage.trim()) { setMessage('Add a topic and a short message first.'); return; }
    setRequestBusy(true);
    try {
      await authFetch('/api/faculty/' + encodeURIComponent(profile?.id || targetId) + '/mentoring-requests', { method: 'POST', body: JSON.stringify({ topic: requestTopic, message: requestMessage }) });
      setRequestOpen(false); setRequestTopic(''); setRequestMessage(''); setMessage('Mentoring request sent.');
    } catch (error: any) { setMessage(error.message || 'Could not send mentoring request.'); }
    finally { setRequestBusy(false); }
  };

  const decideRequest = async (requestId: string, decision: 'accept' | 'decline') => {
    try {
      await authFetch('/api/faculty/mentoring-requests/' + encodeURIComponent(requestId) + '/decision', { method: 'POST', body: JSON.stringify({ decision }) });
      setRequests((current) => current.map((item) => item.id === requestId ? { ...item, status: decision === 'accept' ? 'accepted' : 'declined' } : item));
    } catch (error: any) { setMessage(error.message || 'Could not update mentoring request.'); }
  };

  const save = async () => {
    setSaving(true); setMessage('');
    try {
      const data = await authFetch('/api/faculty/me', {
        method: 'PUT',
        body: JSON.stringify({
          designation: form.designation, department: form.department, phone: form.phone,
          subjects: splitInput(form.subjects), expertise: splitInput(form.expertise),
          yearsExperience: form.yearsExperience, mentoringAreas: splitInput(form.mentoringAreas),
          bio: form.bio, availabilityStatus: form.availabilityStatus, availabilityNote: form.availabilityNote,
        }),
      });
      setMessage('Faculty profile updated.');
      setEditing(false);
      setProfile((current) => current ? {
        ...current, designation: data.faculty.designation, department: data.faculty.department,
        subjects: data.faculty.subjects || [], expertise: data.faculty.expertise || [],
        yearsExperience: data.faculty.years_experience ?? null, mentoringAreas: data.faculty.mentoring_areas || [],
        bio: data.faculty.bio || '', availabilityStatus: data.faculty.availability_status,
        availabilityNote: data.faculty.availability_note || '',
      } : current);
    } catch (error: any) { setMessage(error.message || 'Could not update faculty profile.'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="border-2 border-outline-variant bg-surface px-5 py-4 dc-hard-shadow-sm font-label-mono text-[10px] uppercase">Loading faculty profile...</div></div>;
  if (!profile) return <div className="max-w-xl mx-auto mt-12"><DcCard className="p-8 text-center"><h2 className="dc-display text-4xl">PROFILE NOT FOUND.</h2><p className="text-sm text-on-surface-variant mt-3">{message || 'This faculty profile is unavailable.'}</p><DcButton className="mt-6" onClick={() => setActiveTab('mentors')}>Back to mentors</DcButton></DcCard></div>;

  return <div className="space-y-6 pb-16">
    <div className="flex items-center justify-between gap-4">
      <DcButton variant="secondary" onClick={() => setActiveTab('mentors')}><ArrowLeft className="w-4 h-4" /> Faculty Directory</DcButton>
      {isSelf && <DcButton onClick={() => setEditing((value) => !value)} variant={editing ? 'secondary' : 'primary'}><Pencil className="w-4 h-4" /> {editing ? 'Cancel' : 'Edit Profile'}</DcButton>}
    </div>

    <DcCard shadow="lg" className="p-7 md:p-9">
      <div className="flex flex-col md:flex-row gap-7">
        <div className="w-28 h-28 shrink-0 border-2 border-outline-variant bg-dc-lavender overflow-hidden flex items-center justify-center font-bold text-4xl">
          {profile.avatar ? <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" /> : profile.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-label-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">FACULTY / VERIFIED PROFILE</p>
            {profile.verified && <span className="inline-flex items-center gap-1 border-2 border-outline-variant bg-dc-mint px-2 py-1 font-label-mono text-[9px] uppercase font-bold"><ShieldCheck className="w-3 h-3" /> Approved Faculty</span>}
          </div>
          <h1 className="dc-display text-5xl md:text-6xl mt-2">{profile.name}.</h1>
          <p className="text-lg mt-2">{profile.designation}</p>
          <p className="font-label-mono text-[10px] uppercase text-on-surface-variant mt-1">{profile.department} · {profile.college}</p>
          <div className="flex flex-wrap gap-2 mt-5">
            <span className="border-2 border-outline-variant bg-dc-blue px-2 py-1 font-label-mono text-[9px] uppercase">{profile.availabilityStatus}</span>
            {profile.yearsExperience != null && <span className="border-2 border-outline-variant bg-dc-yellow px-2 py-1 font-label-mono text-[9px] uppercase">{profile.yearsExperience} years experience</span>}
          </div>
        </div>
        {!isSelf && <div className="flex flex-wrap gap-2"><DcButton onClick={() => openMessagingForUser(profile.id)}><MessageSquare className="w-4 h-4" /> Message Faculty</DcButton><DcButton variant="secondary" onClick={() => setRequestOpen(true)}><Handshake className="w-4 h-4" /> Request Mentoring</DcButton></div>}
      </div>
    </DcCard>

    {message && <div className="border-2 border-outline-variant bg-dc-mint p-3 font-label-mono text-[9px] uppercase">{message}</div>}

    {editing && isSelf ? <DcCard shadow="md" className="p-7">
      <div className="flex items-center gap-2 mb-5"><Pencil className="w-4 h-4" /><h2 className="font-label-mono text-xs uppercase font-bold">Faculty profile editor</h2></div>
      <div className="grid md:grid-cols-2 gap-4">
        {[
          ['designation','Designation'],['department','Department'],['phone','Phone'],
          ['yearsExperience','Years of experience'],['subjects','Subjects (comma separated)'],['expertise','Expertise (comma separated)'],
          ['mentoringAreas','Mentoring areas (comma separated)'],['availabilityNote','Availability note'],
        ].map(([key,label]) => <label key={key} className="block text-xs font-label-mono uppercase">
          {label}<input value={(form as any)[key]} onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))} className="mt-1 w-full bg-background border-2 border-outline-variant px-3 py-2 text-sm font-sans" />
        </label>)}
      </div>
      <label className="block text-xs font-label-mono uppercase mt-4">Availability
        <select value={form.availabilityStatus} onChange={(e) => setForm((prev) => ({ ...prev, availabilityStatus: e.target.value as FacultyProfile['availabilityStatus'] }))} className="mt-1 w-full bg-background border-2 border-outline-variant px-3 py-2 text-sm font-sans">
          <option value="available">Available for mentoring</option><option value="busy">Busy</option><option value="offline">Offline</option>
        </select>
      </label>
      <label className="block text-xs font-label-mono uppercase mt-4">Bio<textarea value={form.bio} onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))} rows={5} className="mt-1 w-full bg-background border-2 border-outline-variant px-3 py-2 text-sm font-sans" /></label>
      <DcButton disabled={saving} className="mt-5" onClick={() => void save()}><Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save faculty profile'}</DcButton>
    </DcCard> : <div className="grid lg:grid-cols-2 gap-5">
      <DcCard shadow="sm" className="p-6"><p className="font-label-mono text-[9px] uppercase text-on-surface-variant">About</p><p className="mt-3 text-sm leading-relaxed">{profile.bio || 'No faculty bio provided yet.'}</p></DcCard>
      <DcCard shadow="sm" className="p-6"><p className="font-label-mono text-[9px] uppercase text-on-surface-variant">Mentoring availability</p><p className="mt-3 font-bold uppercase">{profile.availabilityStatus}</p><p className="text-sm text-on-surface-variant mt-2">{profile.availabilityNote || 'No availability note provided.'}</p></DcCard>
    </div>}

    <div className="grid lg:grid-cols-2 gap-5">
      <DcCard shadow="sm" className="p-6"><div className="flex items-center gap-2"><BriefcaseBusiness className="w-4 h-4" /><p className="font-label-mono text-[9px] uppercase">Subjects</p></div><div className="flex flex-wrap gap-2 mt-4">{profile.subjects.length ? profile.subjects.map((item) => <span key={item} className="border-2 border-outline-variant bg-dc-blue px-2 py-1 font-label-mono text-[9px] uppercase">{item}</span>) : <span className="text-xs text-on-surface-variant">No subjects listed.</span>}</div></DcCard>
      <DcCard shadow="sm" className="p-6"><div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /><p className="font-label-mono text-[9px] uppercase">Expertise</p></div><div className="flex flex-wrap gap-2 mt-4">{profile.expertise.length ? profile.expertise.map((item) => <span key={item} className="border-2 border-outline-variant bg-dc-mint px-2 py-1 font-label-mono text-[9px] uppercase">{item}</span>) : <span className="text-xs text-on-surface-variant">No expertise listed.</span>}</div></DcCard>
      <DcCard shadow="sm" className="p-6 lg:col-span-2"><p className="font-label-mono text-[9px] uppercase">Mentoring areas</p><div className="flex flex-wrap gap-2 mt-4">{profile.mentoringAreas.length ? profile.mentoringAreas.map((item) => <span key={item} className="border-2 border-outline-variant bg-dc-yellow px-2 py-1 font-label-mono text-[9px] uppercase">{item}</span>) : <span className="text-xs text-on-surface-variant">No mentoring areas listed.</span>}</div></DcCard>
    </div>

    <div className="flex flex-wrap gap-3">
      <DcButton variant="secondary" onClick={() => setActiveTab('mentors')}><ArrowLeft className="w-4 h-4" /> Back to Directory</DcButton>
      {!isSelf && <><DcButton onClick={() => openMessagingForUser(profile.id)}><MessageSquare className="w-4 h-4" /> Message Faculty</DcButton><DcButton variant="secondary" onClick={() => setRequestOpen(true)}><Handshake className="w-4 h-4" /> Request Mentoring</DcButton></>}
    </div>
    {isSelf && requests.length > 0 && <DcCard shadow="sm" className="p-6"><div className="flex items-center gap-2"><Handshake className="w-4 h-4" /><p className="font-label-mono text-[9px] uppercase">Mentoring requests</p></div><div className="space-y-3 mt-4">{requests.map((request) => <div key={request.id} className="border-2 border-outline-variant p-4"><div className="flex justify-between gap-3"><strong>{request.participant?.name || 'Student'}</strong><span className="font-label-mono text-[8px] uppercase">{request.status}</span></div><p className="font-bold mt-2">{request.topic}</p><p className="text-xs text-on-surface-variant mt-1">{request.message}</p>{request.status === 'pending' && <div className="flex gap-2 mt-3"><button onClick={() => void decideRequest(request.id, 'accept')} className="border-2 border-outline-variant bg-dc-mint px-3 py-2 font-label-mono text-[9px] uppercase font-bold">Accept</button><button onClick={() => void decideRequest(request.id, 'decline')} className="border-2 border-outline-variant bg-dc-pink px-3 py-2 font-label-mono text-[9px] uppercase font-bold">Decline</button></div>}</div>)}</div></DcCard>}

    {requestOpen && !isSelf && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md"><div className="bg-surface border-2 border-outline-variant p-6 max-w-lg w-full dc-shadow-lg"><p className="font-label-mono text-[10px] uppercase text-on-surface-variant">FACULTY / MENTORING REQUEST</p><h3 className="dc-display text-4xl mt-2">REQUEST A SESSION.</h3><label className="block font-label-mono text-[9px] uppercase mt-5">Topic<input value={requestTopic} onChange={(e) => setRequestTopic(e.target.value)} maxLength={160} placeholder="e.g. DSA placement preparation" className="mt-1 w-full border-2 border-outline-variant bg-background px-3 py-3 text-sm font-sans" /></label><label className="block font-label-mono text-[9px] uppercase mt-4">Message<textarea value={requestMessage} onChange={(e) => setRequestMessage(e.target.value)} maxLength={2000} rows={5} placeholder="Tell the faculty member what you need help with..." className="mt-1 w-full border-2 border-outline-variant bg-background px-3 py-3 text-sm font-sans" /></label><div className="flex gap-2 mt-5"><DcButton disabled={requestBusy} onClick={() => void sendMentoringRequest()}><Handshake className="w-4 h-4" /> {requestBusy ? 'Sending...' : 'Send Request'}</DcButton><DcButton variant="secondary" onClick={() => setRequestOpen(false)}>Cancel</DcButton></div></div></div>}

  </div>;
};
