import React, { useCallback, useEffect, useState } from 'react';
import { useAuth as useClerkAuth } from '@clerk/react';
import { Activity, AlertTriangle, CheckCircle2, ExternalLink, FileText, Loader2, ShieldCheck, Users, UserCheck, XCircle } from 'lucide-react';
import { useAdminAccess } from '../hooks/useAdminAccess';
import { AdminEventsManager } from '../components/AdminEventsManager';
import { FacultyAdminPanel } from '../components/FacultyAdminPanel';

type Overview = { students: number; mentors: number; faculty: number; admins: number; posts: number; pendingApplications: number; reports: number; liveUsers: number };
type Application = { id: string; applicant_email: string; applicant_name: string; college: string; branch: string; skills: string; experience: string; motivation: string; resume_file_name: string; status: 'pending' | 'approved' | 'rejected'; review_note?: string | null; created_at: string };

export const AdminPage: React.FC = () => {
  const { getToken } = useClerkAuth();
  const { checked, isAdmin, email, refresh } = useAdminAccess();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const adminFetch = useCallback(async (path: string, init?: RequestInit) => {
    const token = await getToken();
    if (!token) throw new Error('Your session has expired. Please sign in again.');
    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(path, { ...init, headers, cache: 'no-store' });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof body?.error === 'string' ? body.error : 'Admin request failed.');
    return body;
  }, [getToken]);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true); setMessage(null);
    try {
      const [nextOverview, nextApplications] = await Promise.all([
        adminFetch('/api/admin/overview'),
        adminFetch(`/api/admin/applications?status=${statusFilter}`),
      ]);
      setOverview(nextOverview as Overview);
      setApplications(Array.isArray(nextApplications.applications) ? nextApplications.applications : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load the admin dashboard.');
    } finally { setLoading(false); }
  }, [adminFetch, isAdmin, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const review = async (application: Application, decision: 'approve' | 'reject') => {
    setBusyId(application.id); setMessage(null);
    try {
      await adminFetch(`/api/admin/applications/${application.id}/review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: decision }) });
      await load();
      await refresh();
      setMessage(decision === 'approve' ? `${application.applicant_name} is now a verified mentor.` : `${application.applicant_name}'s application was rejected.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not review the application.');
    } finally { setBusyId(null); }
  };

  const openResume = async (application: Application) => {
    setBusyId(application.id); setMessage(null);
    try {
      const body = await adminFetch(`/api/admin/applications/${application.id}/resume`);
      window.open(body.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not open the resume.');
    } finally { setBusyId(null); }
  };

  if (!checked) return <div className="min-h-[50vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!isAdmin) return <div className="max-w-xl mx-auto p-8 bg-surface border-2 border-outline-variant dc-hard-shadow-sm text-center space-y-4"><ShieldCheck className="w-10 h-10 mx-auto text-error" /><h2 className="dc-display text-3xl">ACCESS DENIED.</h2><p className="text-sm text-on-surface-variant">This administrative workspace is restricted to approved DevCollective administrators.</p></div>;

  const cards = [
    ['STUDENTS', overview?.students ?? 0, Users], ['MENTORS', overview?.mentors ?? 0, UserCheck], ['FACULTY', overview?.faculty ?? 0, ShieldCheck],
    ['ADMINS', overview?.admins ?? 0, ShieldCheck], ['POSTS', overview?.posts ?? 0, FileText], ['LIVE USERS', overview?.liveUsers ?? 0, Activity],
  ] as const;

  return <div className="space-y-8 pb-16">
    <header className="border-b-2 border-outline-variant pb-7 space-y-3">
      <div className="inline-flex items-center gap-2 bg-dc-mint px-3 py-1 border-2 border-outline-variant font-label-mono text-[10px] uppercase"><ShieldCheck className="w-3.5 h-3.5" /> Admin access / granted</div>
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5"><div><p className="dc-display text-5xl sm:text-6xl">ADMIN CONTROL.</p><p className="text-sm text-on-surface-variant max-w-2xl mt-3">Verified platform administration, mentor review, moderation records, and live platform counts.</p></div><div className="border-2 border-outline-variant bg-surface px-4 py-3 dc-hard-shadow-sm"><p className="font-label-mono text-[9px] uppercase text-on-surface-variant">Authenticated administrator</p><p className="font-bold mt-1">{email}</p><p className="font-label-mono text-[9px] uppercase text-primary mt-1">RBAC / ADMIN</p></div></div>
    </header>
    <AdminEventsManager />
    {message && <div className="p-4 border-2 border-outline-variant bg-dc-blue text-[#171717] text-xs dc-mono" role="status">{message}</div>}
    <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">{cards.map(([label, value, Icon]) => <div key={label} className="border-2 border-outline-variant bg-surface p-5 shadow-[4px_4px_0_#171717]"><p className="font-label-mono text-[10px] text-on-surface-variant uppercase mb-2">{label}</p><div className="flex items-center justify-between"><strong className="dc-display text-2xl">{value}</strong><Icon className="w-4 h-4 text-primary" /></div></div>)}</section>
    <section className="border-2 border-outline-variant bg-surface shadow-[5px_5px_0_#171717]"><div className="p-5 border-b-2 border-outline-variant flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"><div><h3 className="dc-display text-3xl">MENTOR VERIFICATION.</h3><p className="font-label-mono text-[10px] uppercase text-on-surface-variant mt-1">Review official college applicants before granting mentor access</p></div><div className="flex gap-2">{(['pending','approved','rejected'] as const).map((status) => <button key={status} onClick={() => setStatusFilter(status)} className={`px-3 py-2 border-2 border-outline-variant font-label-mono text-[9px] uppercase ${statusFilter === status ? 'bg-primary text-on-primary' : 'bg-background'}`}>{status}</button>)}</div></div><div className="p-5 space-y-4">{loading ? <div className="p-10 text-center"><Loader2 className="w-6 h-6 mx-auto animate-spin" /></div> : applications.length === 0 ? <div className="p-10 text-center border-2 border-dashed border-outline-variant"><CheckCircle2 className="w-7 h-7 mx-auto mb-3 text-on-surface-variant" /><p className="font-label-mono text-xs uppercase font-bold">NO {statusFilter.toUpperCase()} APPLICATIONS</p><p className="text-xs text-on-surface-variant mt-2">New authenticated college applications will appear here.</p></div> : applications.map((application) => <article key={application.id} style={{ contentVisibility: 'auto', containIntrinsicSize: '360px' }} className="border-2 border-outline-variant bg-background p-5"><div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="bg-dc-yellow border-2 border-outline-variant px-2 py-1 font-label-mono text-[9px] uppercase">{application.status}</span><span className="font-label-mono text-[9px] text-on-surface-variant">{new Date(application.created_at).toLocaleString()}</span></div><h4 className="dc-display text-3xl mt-3 break-words">{application.applicant_name}</h4><p className="text-sm mt-1 break-all">{application.applicant_email}</p><p className="text-xs text-on-surface-variant mt-1 break-words">{application.college} · {application.branch}</p></div><div className="flex flex-wrap gap-2 shrink-0"><button type="button" onClick={() => void openResume(application)} disabled={busyId === application.id} className="inline-flex items-center gap-2 px-3 py-2 border-2 border-outline-variant bg-surface font-label-mono text-[9px] uppercase"><ExternalLink className="w-3.5 h-3.5" /> Resume</button>{application.status === 'pending' && <><button type="button" onClick={() => void review(application, 'approve')} disabled={busyId === application.id} className="inline-flex items-center gap-2 px-3 py-2 border-2 border-outline-variant bg-dc-mint font-label-mono text-[9px] uppercase font-bold"><CheckCircle2 className="w-3.5 h-3.5" /> Approve</button><button type="button" onClick={() => void review(application, 'reject')} disabled={busyId === application.id} className="inline-flex items-center gap-2 px-3 py-2 border-2 border-outline-variant bg-dc-pink font-label-mono text-[9px] uppercase font-bold"><XCircle className="w-3.5 h-3.5" /> Reject</button></>}</div></div><div className="grid lg:grid-cols-3 gap-4 mt-5"><div><p className="font-label-mono text-[9px] uppercase text-on-surface-variant mb-1">Skills</p><p className="text-sm whitespace-pre-wrap break-words">{application.skills}</p></div><div><p className="font-label-mono text-[9px] uppercase text-on-surface-variant mb-1">Experience</p><p className="text-sm whitespace-pre-wrap break-words">{application.experience}</p></div><div><p className="font-label-mono text-[9px] uppercase text-on-surface-variant mb-1">Motivation</p><p className="text-sm whitespace-pre-wrap break-words">{application.motivation}</p></div></div></article>)}</div></section>
    <FacultyAdminPanel />
    <section className="border-2 border-outline-variant bg-surface p-6 shadow-[4px_4px_0_#171717]"><div className="flex items-center justify-between mb-5"><div><h3 className="dc-display text-2xl">ADMIN RESPONSIBILITY.</h3><p className="font-label-mono text-[10px] uppercase text-on-surface-variant mt-1">Use verified access for platform integrity</p></div><AlertTriangle className="w-5 h-5 text-primary" /></div><div className="grid md:grid-cols-3 gap-4"><div className="border-2 border-outline-variant p-4"><strong className="font-label-mono text-[10px] uppercase">1 / Verify</strong><p className="text-xs text-on-surface-variant mt-2">Review the applicant's college identity, resume, technical experience, and mentoring ability.</p></div><div className="border-2 border-outline-variant p-4"><strong className="font-label-mono text-[10px] uppercase">2 / Approve</strong><p className="text-xs text-on-surface-variant mt-2">Approval changes the account role to mentor and records the verification timestamp.</p></div><div className="border-2 border-outline-variant p-4"><strong className="font-label-mono text-[10px] uppercase">3 / Moderate</strong><p className="text-xs text-on-surface-variant mt-2">Review reports and keep mentor/student interactions within the platform's code of conduct.</p></div></div></section>
  </div>;
};
