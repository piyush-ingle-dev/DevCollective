import React, { useEffect, useRef, useState } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, Mail, Send, ShieldCheck, Upload, X } from 'lucide-react';

type MentorAccessModalProps = { open: boolean; onClose: () => void };
type ApplicationDraft = { name: string; email: string; college: string; branch: string; skills: string; experience: string; message: string };

const INITIAL_DRAFT: ApplicationDraft = { name: '', email: '', college: '', branch: '', skills: '', experience: '', message: '' };
const MAX_RESUME_BYTES = 5 * 1024 * 1024;

export const MentorAccessModal: React.FC<MentorAccessModalProps> = ({ open, onClose }) => {
  const { setActiveTab } = useAuth();
  const { getToken, isSignedIn } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const [view, setView] = useState<'gate' | 'application' | 'sent'>('gate');
  const [draft, setDraft] = useState<ApplicationDraft>(INITIAL_DRAFT);
  const [resume, setResume] = useState<File | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const email = String(clerkUser?.primaryEmailAddress?.emailAddress || clerkUser?.emailAddresses?.[0]?.emailAddress || '').trim();
    const name = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ');
    setView('gate');
    setNotice(null);
    setResume(null);
    setDraft({ ...INITIAL_DRAFT, name, email });
  }, [clerkUser, open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !isSubmitting) onClose(); };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = previousOverflow; };
  }, [isSubmitting, onClose, open]);

  if (!open) return null;

  const updateDraft = (field: keyof ApplicationDraft, value: string) => setDraft((current) => ({ ...current, [field]: value }));
  const openApplication = () => {
    if (!isSignedIn || !clerkUser) {
      setNotice('Please sign in with your official college account before applying.');
      return;
    }
    setNotice(null);
    setView('application');
    window.setTimeout(() => scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' }), 0);
  };

  const handleSignIn = () => {
    onClose();
    setActiveTab('login');
  };

  const handleResume = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) { setResume(null); return; }
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) { setResume(null); setNotice('Please choose your resume as a PDF file.'); event.target.value = ''; return; }
    if (file.size > MAX_RESUME_BYTES) { setResume(null); setNotice('Please keep the resume under 5 MB.'); event.target.value = ''; return; }
    setNotice(null);
    setResume(file);
  };

  const handleModalWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.stopPropagation();
    const element = event.currentTarget;
    const atTop = element.scrollTop <= 0;
    const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight <= 1;
    if ((atTop && event.deltaY < 0) || (atBottom && event.deltaY > 0)) event.preventDefault();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice(null);
    if (!isSignedIn || !clerkUser) { setNotice('Please sign in with your official college account before applying.'); return; }
    if (!resume) { setNotice('Please attach your resume PDF before submitting.'); return; }
    const values: ApplicationDraft = {
      ...draft,
      name: draft.name.trim(),
      email: draft.email.trim(),
      college: draft.college.trim(),
      branch: draft.branch.trim(),
      skills: draft.skills.trim(),
      experience: draft.experience.trim(),
      message: draft.message.trim(),
    };
    if (!values.name || !values.college || !values.branch || !values.skills || !values.experience || !values.message) {
      setNotice('Please complete every required application field before submitting.');
      return;
    }
    const token = await getToken();
    if (!token) { setNotice('Your session could not be verified. Please sign in again.'); return; }
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) => formData.append(key, value));
      formData.append('resume', resume, resume.name);
      const response = await fetch('/api/mentor/applications', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'We could not submit your application right now.');
      setView('sent');
      setResume(null);
      setNotice(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'We could not submit your mentor application right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="mentor-access-title" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSubmitting) onClose(); }}>
      <div ref={scrollRef} onWheel={handleModalWheel} className="w-full max-w-3xl max-h-[90vh] overflow-y-auto overscroll-contain touch-pan-y border-2 border-outline-variant bg-surface dc-hard-shadow" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-outline-variant bg-surface px-5 py-4 sm:px-7">
          <div><p className="dc-mono text-[9px] uppercase tracking-[0.2em] text-on-surface-variant">DEVCOLLECTIVE / MENTOR ACCESS</p><h2 id="mentor-access-title" className="dc-display text-2xl sm:text-3xl mt-1">MENTOR APPLICATION.</h2></div>
          <button type="button" onClick={onClose} disabled={isSubmitting} aria-label="Close mentor application" className="p-2 border-2 border-outline-variant hover:bg-dc-pink transition-colors disabled:opacity-50"><X className="w-5 h-5" /></button>
        </div>

        {view === 'gate' && (
          <div className="p-6 sm:p-8 space-y-7">
            {!isSignedIn ? (
              <>
                <div className="flex gap-4 p-5 bg-dc-yellow border-2 border-outline-variant text-[#171717]"><ShieldCheck className="w-6 h-6 shrink-0 mt-0.5" /><div><p className="dc-mono text-[10px] uppercase tracking-[0.16em] font-bold">SIGN IN BEFORE APPLYING</p><p className="mt-2 text-sm leading-relaxed">Mentor applications are available only after you sign in with your official college account. Your college identity verifies that you belong to the DevCollective community.</p></div></div>
                {notice && <div className="p-4 bg-dc-pink border-2 border-outline-variant text-xs dc-mono" role="alert">{notice}</div>}
                <button type="button" onClick={handleSignIn} className="w-full inline-flex items-center justify-center gap-3 bg-primary text-on-primary border-2 border-outline-variant px-6 py-4 font-bold uppercase dc-hard-shadow-sm"><Mail className="w-5 h-5" /> SIGN IN TO APPLY <ArrowRight className="w-5 h-5" /></button>
                <div className="border-t-2 border-outline-variant pt-5 flex items-center gap-3 text-xs text-on-surface-variant"><CheckCircle2 className="w-4 h-4 shrink-0" /><span>After signing in, open your Profile and use the Mentor Access card to continue the application.</span></div>
              </>
            ) : (
              <>
                <div className="flex gap-4 p-5 bg-dc-mint border-2 border-outline-variant text-[#171717]"><ShieldCheck className="w-6 h-6 shrink-0 mt-0.5" /><div><p className="dc-mono text-[10px] uppercase tracking-[0.16em] font-bold">COLLEGE IDENTITY VERIFIED</p><p className="mt-2 text-sm leading-relaxed">You are signed in. Your official college identity will be recorded as the verified applicant identity. You can use another email below for contact updates.</p></div></div>
                {notice && <div className="p-4 bg-dc-blue border-2 border-outline-variant text-xs dc-mono" role="status">{notice}</div>}
                <button type="button" onClick={openApplication} className="w-full inline-flex items-center justify-center gap-3 bg-primary text-on-primary border-2 border-outline-variant px-6 py-4 font-bold uppercase dc-hard-shadow-sm">APPLY TO BECOME A MENTOR <ArrowRight className="w-5 h-5" /></button>
                <div className="border-t-2 border-outline-variant pt-5 flex items-center gap-3 text-xs text-on-surface-variant"><CheckCircle2 className="w-4 h-4 shrink-0" /><span>Your application is reviewed by the DevCollective developer/admin team before mentor access is granted.</span></div>
              </>
            )}
          </div>
        )}

        {view === 'application' && (
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3"><button type="button" onClick={() => { setView('gate'); setNotice(null); }} disabled={isSubmitting} className="inline-flex items-center gap-2 dc-mono text-[9px] uppercase tracking-[0.14em] hover:text-primary disabled:opacity-50"><ArrowLeft className="w-4 h-4" /> Back</button><span className="text-on-surface-variant">/</span><span className="dc-mono text-[9px] uppercase tracking-[0.14em]">APPLICATION</span></div>
            <div className="p-4 sm:p-5 bg-dc-blue border-2 border-outline-variant text-[#171717]"><div className="flex items-start gap-3"><FileText className="w-5 h-5 shrink-0 mt-0.5" /><p className="text-sm leading-relaxed">Complete the required application fields and attach a PDF resume. Your verified college account identifies you to the reviewer; the contact email below is optional.</p></div></div>
            <div className="grid sm:grid-cols-2 gap-5">
              <div className="space-y-2"><label className="dc-mono text-[9px] uppercase tracking-[0.16em] text-on-surface-variant">Full Name <span className="text-primary">*</span></label><input type="text" value={draft.name} onChange={(event) => updateDraft('name', event.target.value)} placeholder="Your name" required className="w-full bg-background border-2 border-outline-variant px-4 py-3 text-sm text-on-surface" /></div>
              <div className="space-y-2"><label className="dc-mono text-[9px] uppercase tracking-[0.16em] text-on-surface-variant">Contact Email <span className="text-on-surface-variant">(optional)</span></label><input type="email" value={draft.email} onChange={(event) => updateDraft('email', event.target.value)} placeholder="yourname@gmail.com" className="w-full bg-background border-2 border-outline-variant px-4 py-3 text-sm text-on-surface" /><p className="text-[11px] leading-relaxed text-on-surface-variant">Leave this blank to use your verified college email. Use another address when you prefer mentor updates there.</p></div>
              <div className="space-y-2"><label className="dc-mono text-[9px] uppercase tracking-[0.16em] text-on-surface-variant">College <span className="text-primary">*</span></label><input type="text" value={draft.college} onChange={(event) => updateDraft('college', event.target.value)} placeholder="Institute / university" required className="w-full bg-background border-2 border-outline-variant px-4 py-3 text-sm text-on-surface" /></div>
              <div className="space-y-2"><label className="dc-mono text-[9px] uppercase tracking-[0.16em] text-on-surface-variant">Branch <span className="text-primary">*</span></label><input type="text" value={draft.branch} onChange={(event) => updateDraft('branch', event.target.value)} placeholder="Computer Science" required className="w-full bg-background border-2 border-outline-variant px-4 py-3 text-sm text-on-surface" /></div>
              <div className="space-y-2 sm:col-span-2"><label className="dc-mono text-[9px] uppercase tracking-[0.16em] text-on-surface-variant">Skills <span className="text-primary">*</span></label><input value={draft.skills} onChange={(event) => updateDraft('skills', event.target.value)} placeholder="React, Node.js, Python, system design..." required className="w-full bg-background border-2 border-outline-variant px-4 py-3 text-sm text-on-surface" /></div>
              <div className="space-y-2 sm:col-span-2"><label className="dc-mono text-[9px] uppercase tracking-[0.16em] text-on-surface-variant">Mentoring / Technical Experience <span className="text-primary">*</span></label><textarea value={draft.experience} onChange={(event) => updateDraft('experience', event.target.value)} placeholder="Projects, internships, open source, teaching, leadership..." rows={4} required className="w-full bg-background border-2 border-outline-variant px-4 py-3 text-sm text-on-surface resize-y" /></div>
              <div className="space-y-2 sm:col-span-2"><label className="dc-mono text-[9px] uppercase tracking-[0.16em] text-on-surface-variant">Why do you want to mentor? <span className="text-primary">*</span></label><textarea value={draft.message} onChange={(event) => updateDraft('message', event.target.value)} placeholder="Tell the developer team what you can contribute to the collective." rows={4} required className="w-full bg-background border-2 border-outline-variant px-4 py-3 text-sm text-on-surface resize-y" /></div>
            </div>
            <div className="border-2 border-dashed border-outline-variant bg-background p-5"><div className="flex items-start gap-4"><Upload className="w-5 h-5 shrink-0" /><div className="flex-1 min-w-0"><p className="font-bold text-sm">Resume PDF <span className="text-primary">*</span></p><p className="text-xs text-on-surface-variant mt-1">Required · PDF only · up to 5 MB.</p><label className="inline-flex items-center gap-2 mt-4 border-2 border-outline-variant bg-surface px-4 py-2.5 text-xs font-bold uppercase cursor-pointer hover:bg-dc-blue transition-colors"><Upload className="w-4 h-4" /> Choose PDF<input type="file" accept="application/pdf,.pdf" onChange={handleResume} required className="hidden" /></label>{resume && <p className="mt-3 text-xs dc-mono flex items-center gap-2"><FileText className="w-4 h-4" /> {resume.name}</p>}</div></div></div>
            {notice && <div className="p-4 bg-dc-pink border-2 border-outline-variant text-xs dc-mono" role="alert">{notice}</div>}
            <div className="border-t-2 border-outline-variant pt-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between"><p className="text-xs text-on-surface-variant">Your resume is stored securely with the application. Nothing is opened in your email app.</p><button type="submit" disabled={isSubmitting} className="shrink-0 inline-flex items-center justify-center gap-3 bg-primary text-on-primary border-2 border-outline-variant px-6 py-4 font-bold uppercase dc-hard-shadow-sm disabled:opacity-50"><Send className="w-4 h-4" /> {isSubmitting ? 'SUBMITTING...' : 'SUBMIT APPLICATION'}</button></div>
          </form>
        )}

        {view === 'sent' && <div className="p-8 sm:p-12 text-center space-y-5"><div className="w-16 h-16 mx-auto bg-dc-mint border-2 border-outline-variant flex items-center justify-center dc-hard-shadow-sm"><CheckCircle2 className="w-8 h-8" /></div><h3 className="dc-display text-4xl">APPLICATION RECEIVED.</h3><p className="max-w-xl mx-auto text-sm leading-relaxed text-on-surface-variant">Your mentor application has been stored for administrator review. You will receive an email when a decision is made.</p><button type="button" onClick={onClose} className="inline-flex items-center justify-center gap-3 bg-primary text-on-primary border-2 border-outline-variant px-6 py-3 font-bold uppercase">DONE <ArrowRight className="w-4 h-4" /></button></div>}
      </div>
    </div>
  );
};
