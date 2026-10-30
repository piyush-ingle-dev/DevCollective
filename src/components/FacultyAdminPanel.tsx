import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clipboard, History, MailPlus, RefreshCw, ShieldCheck, UserRound, XCircle } from 'lucide-react';
import { useAuth as useClerkAuth } from '@clerk/react';

type FacultyInvite = { id: string; email: string; college: string; status: string; expires_at: string; created_at: string; accepted_at?: string | null };
type FacultyProfile = {
  clerk_user_id: string; employee_id: string; department: string; designation: string;
  approval_status: string; created_at: string; availability_status?: string;
  profile?: { name?: string; email?: string; college?: string; account_status?: string; avatar?: string };
};
type AuditEvent = { id: string; action: string; actor_clerk_user_id: string; details: Record<string, unknown>; created_at: string };

export const FacultyAdminPanel: React.FC = () => {
  const { getToken } = useClerkAuth();
  const [email, setEmail] = useState('');
  const [invites, setInvites] = useState<FacultyInvite[]>([]);
  const [profiles, setProfiles] = useState<FacultyProfile[]>([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditEvent[]>([]);

  const authFetch = async (url: string, init: RequestInit = {}) => {
    const token = await getToken();
    if (!token) throw new Error('Admin session is unavailable.');
    const headers = new Headers(init.headers); headers.set('Authorization', 'Bearer ' + token);
    if (init.body) headers.set('Content-Type', 'application/json');
    const res = await fetch(url, { ...init, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed.');
    return data;
  };

  const load = async () => {
    const [inviteData, facultyData] = await Promise.all([authFetch('/api/admin/faculty-invitations'), authFetch('/api/admin/faculty')]);
    setInvites(inviteData.invitations || []);
    setProfiles(facultyData.profiles || []);
  };

  useEffect(() => { void load().catch((err) => setMessage(err.message)); }, []);

  const createInvite = async () => {
    setMessage(''); setBusy(true);
    try {
      const data = await authFetch('/api/admin/faculty-invitations', { method: 'POST', body: JSON.stringify({ email }) });
      await navigator.clipboard?.writeText(data.inviteUrl);
      setMessage(data.emailSent ? 'Invitation sent. Link copied.' : 'Invitation created. Email is not configured, so the link was copied for manual sharing.');
      setEmail(''); await load();
    } catch (err: any) { setMessage(err.message); } finally { setBusy(false); }
  };

  const invitationAction = async (id: string, action: 'revoke' | 'resend') => {
    setMessage(''); setBusy(true);
    try {
      const data = await authFetch('/api/admin/faculty-invitations/' + encodeURIComponent(id) + '/' + action, { method: 'POST' });
      if (action === 'resend' && data.inviteUrl) await navigator.clipboard?.writeText(data.inviteUrl);
      setMessage(action === 'resend' ? 'Invitation resent. Replacement link copied.' : 'Invitation revoked.');
      await load();
    } catch (err: any) { setMessage(err.message); } finally { setBusy(false); }
  };

  const decide = async (clerkUserId: string, decision: 'approve' | 'reject' | 'suspend' | 'reinstate') => {
    setMessage(''); setBusy(true);
    try { await authFetch('/api/admin/faculty/' + encodeURIComponent(clerkUserId) + '/decision', { method: 'POST', body: JSON.stringify({ decision }) }); setMessage('Faculty access updated.'); await load(); }
    catch (err: any) { setMessage(err.message); } finally { setBusy(false); }
  };

  const loadAudit = async (id: string) => {
    if (auditId === id) { setAuditId(null); return; }
    try { const data = await authFetch('/api/admin/faculty-audit/' + encodeURIComponent(id)); setAudit(Array.isArray(data.events) ? data.events : []); setAuditId(id); }
    catch (err: any) { setMessage(err.message); }
  };

  const filteredProfiles = useMemo(() => statusFilter === 'all' ? profiles : profiles.filter((profile) => profile.approval_status === statusFilter), [profiles, statusFilter]);
  const counts = useMemo(() => profiles.reduce<Record<string, number>>((acc, item) => { acc[item.approval_status] = (acc[item.approval_status] || 0) + 1; return acc; }, {}), [profiles]);

  return <section className="border-2 border-outline-variant bg-surface p-6 shadow-[4px_4px_0_#171717]">
    <div className="flex items-start justify-between gap-5 mb-6"><div><p className="dc-mono text-[9px] uppercase tracking-[0.16em] text-on-surface-variant">FACULTY / ACCESS CONTROL</p><h3 className="dc-display text-3xl mt-2">INVITE. VERIFY. APPROVE.</h3><p className="text-sm text-on-surface-variant mt-2">Faculty access is invitation-only, email-verified, and admin-approved. Approved faculty can manage their professional profile and availability.</p></div><MailPlus className="w-6 h-6 shrink-0" /></div>
    <div className="flex flex-col sm:flex-row gap-3"><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="faculty@example.com or temporary test email" className="flex-1 bg-background border-2 border-outline-variant px-4 py-3 text-sm" /><button disabled={busy || !email.trim()} onClick={() => void createInvite()} className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary border-2 border-outline-variant px-5 py-3 font-bold uppercase dc-mono text-[10px] disabled:opacity-50">Create Invitation</button></div>
    {message && <p className="mt-4 text-xs dc-mono bg-dc-mint border-2 border-outline-variant p-3">{message}</p>}

    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-7">{[['pending','Pending'],['approved','Approved'],['rejected','Rejected'],['suspended','Suspended'],['all','All']].map(([value,label]) => <button key={value} onClick={() => setStatusFilter(value)} className={`border-2 border-outline-variant px-3 py-2 text-left font-label-mono text-[9px] uppercase ${statusFilter === value ? 'bg-dc-blue' : 'bg-background'}`}><strong>{value === 'all' ? profiles.length : counts[value] || 0}</strong><span className="block mt-1">{label}</span></button>)}</div>

    <div className="grid lg:grid-cols-2 gap-5 mt-7">
      <div><div className="flex items-center justify-between mb-3"><h4 className="dc-mono text-[10px] uppercase tracking-[0.14em]">Recent Invitations</h4><span className="font-label-mono text-[9px]">{invites.length}</span></div><div className="space-y-2">{invites.length ? invites.map((invite) => <div key={invite.id} className="border-2 border-outline-variant p-3 text-xs"><div className="flex justify-between gap-3"><strong>{invite.email}</strong><span className="uppercase">{invite.status}</span></div><p className="text-on-surface-variant mt-1">Expires {new Date(invite.expires_at).toLocaleDateString()}</p>{invite.status === 'pending' && <div className="flex gap-2 mt-3"><button disabled={busy} onClick={() => void invitationAction(invite.id, 'resend')} className="inline-flex items-center gap-1 bg-dc-blue border-2 border-outline-variant px-3 py-2 font-bold uppercase"><RefreshCw className="w-3.5 h-3.5" /> Resend</button><button disabled={busy} onClick={() => void invitationAction(invite.id, 'revoke')} className="inline-flex items-center gap-1 bg-dc-pink border-2 border-outline-variant px-3 py-2 font-bold uppercase"><XCircle className="w-3.5 h-3.5" /> Revoke</button></div>}</div>) : <p className="text-xs text-on-surface-variant">No invitations yet.</p>}</div></div>

      <div><div className="flex items-center justify-between mb-3"><h4 className="dc-mono text-[10px] uppercase tracking-[0.14em]">Faculty Management</h4><span className="font-label-mono text-[9px]">{filteredProfiles.length}</span></div><div className="space-y-2">{filteredProfiles.length ? filteredProfiles.map((profile) => <div key={profile.clerk_user_id} className="border-2 border-outline-variant p-3 text-xs"><div className="flex items-start gap-3"><div className="w-10 h-10 shrink-0 border-2 border-outline-variant bg-dc-lavender flex items-center justify-center font-bold overflow-hidden">{profile.profile?.avatar ? <img src={profile.profile.avatar} alt="" className="w-full h-full object-cover" /> : <UserRound className="w-4 h-4" />}</div><div className="min-w-0 flex-1"><strong>{profile.profile?.name || profile.employee_id}</strong><p className="text-on-surface-variant mt-1">{profile.designation} · {profile.department}</p><p className="font-label-mono text-[9px] uppercase mt-1">{profile.profile?.email || 'No email'} · {profile.approval_status} · {profile.availability_status || 'available'}</p></div><ShieldCheck className="w-4 h-4 shrink-0" /></div>
        <div className="flex flex-wrap gap-2 mt-3">{profile.approval_status === 'pending' && <><button disabled={busy} onClick={() => void decide(profile.clerk_user_id, 'approve')} className="inline-flex items-center gap-1 bg-dc-mint border-2 border-outline-variant px-3 py-2 font-bold uppercase"><CheckCircle2 className="w-3.5 h-3.5" /> Approve</button><button disabled={busy} onClick={() => void decide(profile.clerk_user_id, 'reject')} className="inline-flex items-center gap-1 bg-dc-pink border-2 border-outline-variant px-3 py-2 font-bold uppercase"><XCircle className="w-3.5 h-3.5" /> Reject</button></>}{profile.approval_status === 'approved' && <button disabled={busy} onClick={() => void decide(profile.clerk_user_id, 'suspend')} className="inline-flex items-center gap-1 bg-dc-yellow border-2 border-outline-variant px-3 py-2 font-bold uppercase"><XCircle className="w-3.5 h-3.5" /> Suspend</button>}{profile.approval_status === 'suspended' && <button disabled={busy} onClick={() => void decide(profile.clerk_user_id, 'reinstate')} className="inline-flex items-center gap-1 bg-dc-mint border-2 border-outline-variant px-3 py-2 font-bold uppercase"><CheckCircle2 className="w-3.5 h-3.5" /> Reinstate</button>}<button onClick={() => void loadAudit(profile.clerk_user_id)} className="inline-flex items-center gap-1 bg-background border-2 border-outline-variant px-3 py-2 font-bold uppercase"><History className="w-3.5 h-3.5" /> Audit</button></div>
        {auditId === profile.clerk_user_id && <div className="mt-3 border-t-2 border-outline-variant pt-3 space-y-2">{audit.length ? audit.map((event) => <div key={event.id} className="text-[9px] font-label-mono uppercase"><strong>{event.action}</strong> · {new Date(event.created_at).toLocaleString()}</div>) : <p className="text-[9px] text-on-surface-variant">No audit events.</p>}</div>}
      </div>) : <p className="text-xs text-on-surface-variant">No faculty records in this state.</p>}</div></div>
    </div>
  </section>;
};
