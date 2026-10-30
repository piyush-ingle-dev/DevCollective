import React, { useEffect, useMemo, useState } from 'react';
import { useAuth as useClerkAuth, useSignUp } from '@clerk/react';
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';


type InviteState = { email: string; college: string; expiresAt: string };

const inputClass = 'w-full bg-surface border-2 border-outline-variant rounded-[4px] px-4 py-3.5 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary transition-colors';
const labelClass = 'dc-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant';

const splitName = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') };
};

export const FacultyRegisterPage: React.FC = () => {
  const { setActiveTab } = useAuth();
  const { getToken, userId } = useClerkAuth();
  const { signUp, errors, fetchStatus } = useSignUp();
  const [inviteToken] = useState(() => new URLSearchParams(window.location.search).get('invite') || '');
  const [invite, setInvite] = useState<InviteState | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [verificationMode, setVerificationMode] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [designation, setDesignation] = useState('Assistant Professor');
  const [phone, setPhone] = useState('');
  const [subjects, setSubjects] = useState('');
  const [expertise, setExpertise] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [mentoringAreas, setMentoringAreas] = useState('');
  const [bio, setBio] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!inviteToken) { setLoadingInvite(false); setError('This page requires a faculty invitation link.'); return; }
    let cancelled = false;
    fetch('/api/faculty/invitations/' + encodeURIComponent(inviteToken))
      .then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.error || 'This invitation is invalid or expired.'); return data as InviteState; })
      .then((data) => { if (!cancelled) { setInvite(data); setError(null); } })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoadingInvite(false); });
    return () => { cancelled = true; };
  }, [inviteToken]);

  const clerkError = errors?.fields?.emailAddress?.message || errors?.fields?.password?.message || errors?.fields?.code?.message;
  const busy = fetchStatus === 'fetching';
  const email = invite?.email || '';

  const submitProfile = async () => {
    const token = await getToken();
    if (!token) throw new Error('Your verified faculty session could not be established. Please try again.');
    const response = await fetch('/api/auth/faculty/register', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inviteToken, email, name: fullName.trim(), employeeId: employeeId.trim(), department: department.trim(),
        designation: designation.trim(), phone: phone.trim(),
        subjects: subjects.split(',').map((v) => v.trim()).filter(Boolean),
        expertise: expertise.split(',').map((v) => v.trim()).filter(Boolean),
        yearsExperience: yearsExperience ? Number(yearsExperience) : null,
        mentoringAreas: mentoringAreas.split(',').map((v) => v.trim()).filter(Boolean),
        bio: bio.trim(),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Faculty registration could not be submitted.');
    setSuccess(data.message || 'Faculty registration submitted. Your account is pending admin approval.');
    if (userId) localStorage.removeItem(`devcollective_profile_cache:${userId}`);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(null); setSuccess(null);
    if (!invite) return setError('A valid faculty invitation is required.');
    if (!fullName.trim() || !employeeId.trim() || !department.trim() || !designation.trim() || !password) return setError('Complete all required faculty fields.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('The invitation must use a valid email address.');
    if (password.length < 8) return setError('Please choose a password with at least 8 characters.');
    const { firstName, lastName } = splitName(fullName);
    const { error: signUpError } = await signUp.password({ emailAddress: email, password });
    if (signUpError) return setError(signUpError.message || 'Could not create the faculty account.');
    if (firstName || lastName) {
      const { error: nameError } = await signUp.update({ firstName, lastName });
      if (nameError) return setError(nameError.message || 'Could not save your name.');
    }
    if (signUp.status === 'complete') {
      await signUp.finalize({ navigate: () => {} });
      try { await submitProfile(); window.location.href = '/'; } catch (err: any) { setError(err.message || 'Faculty profile submission failed.'); }
      return;
    }
    const { error: sendError } = await signUp.verifications.sendEmailCode();
    if (sendError) return setError(sendError.message || 'Could not send the verification code.');
    setVerificationMode(true);
    setSuccess(import.meta.env.DEV ? 'Verification code sent. Check the invited mailbox.' : 'Verification code sent to your invited email.');
  };

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault(); setError(null); setSuccess(null);
    const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code: verificationCode.trim() });
    if (verifyError) return setError(verifyError.message || 'That verification code is invalid.');
    if (signUp.status !== 'complete') return setError('Email verified, but Clerk has additional sign-up requirements. Check your Clerk configuration.');
    await signUp.finalize({ navigate: () => {} });
    try {
      await submitProfile();
      if (userId) localStorage.removeItem(`devcollective_profile_cache:${userId}`);
      window.location.href = '/?faculty-register-complete=1';
    } catch (err: any) {
      setError(err.message || 'Your account was verified, but faculty profile submission failed. Please contact an administrator.');
    }
  };

  const fields = useMemo(() => [
    ['Faculty / Employee ID', employeeId, setEmployeeId, 'FAC-001', 'text', true],
    ['Department', department, setDepartment, 'Computer Science & Engineering', 'text', true],
    ['Designation', designation, setDesignation, 'Assistant Professor', 'text', true],
    ['Phone Number', phone, setPhone, '+91...', 'tel', false],
    ['Subjects (comma separated)', subjects, setSubjects, 'DBMS, Networks, OS', 'text', false],
    ['Expertise (comma separated)', expertise, setExpertise, 'Web Development, AI/ML', 'text', false],
    ['Mentoring Areas (comma separated)', mentoringAreas, setMentoringAreas, 'Projects, Placements, Research', 'text', false],
    ['Years of Experience', yearsExperience, setYearsExperience, '8', 'number', false],
  ] as const, [employeeId, department, designation, phone, subjects, expertise, mentoringAreas, yearsExperience]);

  return (
    <div className="dc-public min-h-screen overflow-hidden bg-background text-on-background">
      <div className="max-w-[1500px] mx-auto px-5 sm:px-8 lg:px-12 py-8 sm:py-12">
        <div className="flex items-center justify-between border-b-2 border-outline-variant pb-4">
          <button onClick={() => setActiveTab('landing')} className="dc-mono text-[10px] sm:text-xs uppercase tracking-[0.16em] inline-flex items-center gap-2 hover:text-primary"><ArrowLeft className="w-4 h-4" /> DC / BACK</button>
          <span className="dc-mono text-[10px] sm:text-xs uppercase tracking-[0.18em] hidden sm:block">DC / 03 — FACULTY ONBOARDING</span>
          <span className="dc-mono text-[10px] uppercase tracking-[0.16em] flex items-center gap-2"><span className="dc-status-dot" /> {verificationMode ? 'VERIFY' : 'INVITED'}</span>
        </div>

        {loadingInvite ? (
          <div className="py-32 text-center dc-mono text-xs uppercase tracking-[0.16em]">Validating invitation...</div>
        ) : !invite ? (
          <div className="max-w-2xl mx-auto py-24 text-center">
            <div className="border-2 border-outline-variant bg-surface dc-hard-shadow p-8">
              <ShieldCheck className="w-10 h-10 mx-auto mb-5" />
              <h1 className="dc-display text-4xl sm:text-6xl">INVITATION REQUIRED.</h1>
              <p className="mt-5 text-sm text-on-surface-variant">Faculty access is provisioned by a DevCollective administrator. A public faculty role selector is intentionally not available.</p>
              <button onClick={() => setActiveTab('landing')} className="mt-7 bg-primary text-on-primary border-2 border-outline-variant px-6 py-3 font-bold uppercase dc-hard-shadow-sm">Return Home</button>
            </div>
          </div>
        ) : (
          <main className="grid lg:grid-cols-[0.72fr_1.28fr] gap-10 lg:gap-16 py-12 sm:py-16 lg:py-20">
            <aside className="lg:sticky lg:top-10 lg:self-start">
              <p className="dc-mono text-[10px] uppercase tracking-[0.22em] mb-6">[ INVITED FACULTY ]</p>
              <h1 className="dc-display text-[clamp(4rem,8vw,7.5rem)]">JOIN.<br /><span className="text-primary">GUIDE.</span><br />BUILD.</h1>
              <p className="mt-8 max-w-md text-base sm:text-lg leading-relaxed text-on-surface-variant">Your faculty account is created only from an administrator-issued invitation. Verify the invited email, complete your professional profile, then wait for administrator approval.</p>
              <div className="mt-10 border-2 border-outline-variant bg-surface dc-hard-shadow-sm">
                <div className="border-b-2 border-outline-variant px-4 py-3 dc-mono text-[9px] uppercase tracking-[0.16em]">INVITATION / STATUS</div>
                <div className="p-5 space-y-4 dc-mono text-[10px] uppercase">
                  <div className="flex justify-between gap-5"><span>EMAIL</span><span className="text-primary break-all text-right">{email}</span></div>
                  <div className="flex justify-between"><span>COLLEGE</span><span>{invite.college}</span></div>
                  <div className="flex justify-between"><span>ACCESS</span><span>FACULTY</span></div>
                  <div className="flex justify-between"><span>APPROVAL</span><span>PENDING ADMIN</span></div>
                </div>
              </div>
            </aside>

            <section className="border-2 border-outline-variant bg-surface dc-hard-shadow p-6 sm:p-8 lg:p-10">
              <div className="flex items-start justify-between gap-5 border-b-2 border-outline-variant pb-6 mb-8">
                <div><p className={labelClass}>01 / {verificationMode ? 'VERIFY' : 'PROFILE'}</p><h2 className="dc-display text-4xl sm:text-5xl">{verificationMode ? 'VERIFY EMAIL.' : 'FACULTY ACCESS.'}</h2></div>
                <Building2 className="w-7 h-7 shrink-0" />
              </div>
              {(error || clerkError) && <div className="mb-7 p-4 bg-dc-pink border-2 border-outline-variant flex items-start gap-3 text-[#171717] text-xs dc-mono"><AlertCircle className="w-5 h-5 shrink-0" /><span>{error || clerkError}</span></div>}
              {success && <div className="mb-7 p-4 bg-dc-mint border-2 border-outline-variant flex items-start gap-3 text-[#171717] text-xs dc-mono"><CheckCircle2 className="w-5 h-5 shrink-0" /><span>{success}</span></div>}

              {verificationMode ? (
                <form onSubmit={handleVerify} className="space-y-7">
                  <p className="text-sm leading-relaxed text-on-surface-variant">Enter the verification code sent to <strong className="text-on-surface">{email}</strong>.</p>
                  <input value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" className={inputClass + ' h-16 text-2xl tracking-[0.35em]'} required />
                  <button type="submit" disabled={busy} className="w-full dc-hard-shadow-sm inline-flex items-center justify-center gap-3 bg-primary text-on-primary border-2 border-outline-variant px-6 py-4 font-bold uppercase disabled:opacity-50">{busy ? 'VERIFYING...' : 'VERIFY & SUBMIT PROFILE'}<ArrowRight className="w-5 h-5" /></button>
                </form>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-2 sm:col-span-2"><label className={labelClass}>Invited Email</label><input value={email} readOnly className={inputClass + ' opacity-80'} /></div>
                    <div className="space-y-2 sm:col-span-2"><label className={labelClass}>Full Name</label><input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Dr. Jane Doe" className={inputClass} required /></div>
                    {fields.map(([label, value, setter, placeholder, type, required]) => <div key={label} className="space-y-2"><label className={labelClass}>{label}</label><input type={type} value={value} onChange={(e) => setter(e.target.value)} placeholder={placeholder} className={inputClass} required={required} /></div>)}
                    <div className="space-y-2 sm:col-span-2"><label className={labelClass}>Professional Bio</label><textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Teaching, research and mentoring interests." rows={4} className={inputClass + ' resize-none'} /></div>
                    <div className="space-y-2 sm:col-span-2"><label className={labelClass}>Account Password</label><div className="relative"><input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className={inputClass + ' pr-11'} required /><button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
                  </div>
                  <div className="border-t-2 border-outline-variant pt-7"><button type="submit" disabled={busy || Boolean(success)} className="w-full dc-hard-shadow-sm inline-flex items-center justify-center gap-3 bg-primary text-on-primary border-2 border-outline-variant px-6 py-4 font-bold uppercase disabled:opacity-50"><span>{busy ? 'CREATING FACULTY ACCOUNT...' : 'VERIFY EMAIL & CONTINUE'}</span><ArrowRight className="w-5 h-5" /></button></div>
                </form>
              )}
            </section>
          </main>
        )}

        <footer className="border-t-2 border-outline-variant pt-4 flex justify-between dc-mono text-[9px] uppercase tracking-[0.14em] text-on-surface-variant"><span>DEVCOLLECTIVE / FACULTY ACCESS</span><span>INVITE → VERIFY → PROFILE → APPROVE</span></footer>
      </div>
    </div>
  );
};
