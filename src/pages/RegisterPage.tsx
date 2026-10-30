import React, { useState } from 'react';
import { useSignUp } from '@clerk/react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, AlertCircle, UserRound, Mail, LockKeyhole, GraduationCap, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getPlatformEmailError, isAllowedPlatformEmail } from '../lib/accessControl';

const PENDING_REGISTRATION_KEY = 'devcollective_pending_registration';

const splitName = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') };
};

export const RegisterPage: React.FC = () => {
  const { setActiveTab, triggerOAuthLogin } = useAuth();
  const { signUp, errors, fetchStatus } = useSignUp();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [collegeName, setCollegeName] = useState('G H Raisoni College of Engineering & Management, Nagpur');
  const [branch, setBranch] = useState('Computer Science & Engineering');
  const [academicYear, setAcademicYear] = useState('4th Year');
  const [showPassword, setShowPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationMode, setVerificationMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const isBusy = fetchStatus === 'fetching';
  const clerkError = errors?.fields?.emailAddress?.message || errors?.fields?.password?.message || errors?.fields?.code?.message;
  const inputClass = 'w-full bg-surface border-2 border-outline-variant rounded-[4px] px-4 py-3.5 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary transition-colors';
  const labelClass = 'dc-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant';

  const savePendingRegistration = () => sessionStorage.setItem(PENDING_REGISTRATION_KEY, JSON.stringify({
    name: fullName.trim(), role: 'student', college: collegeName.trim(), branch: branch.trim(), academicYear,
  }));

  const navigateHome = async () => {
    await signUp.finalize({ navigate: ({ session, decorateUrl }) => { if (session?.currentTask) return; window.location.href = decorateUrl('/'); } });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(null); setSuccess(null);
    const name = fullName.trim(), normalizedEmail = email.trim(), college = collegeName.trim(), normalizedBranch = branch.trim();
    if (!name || !normalizedEmail || !password || !college || !normalizedBranch) return setError('Please complete all required fields before creating your account.');
    if (!isAllowedPlatformEmail(normalizedEmail)) return setError(getPlatformEmailError());
    if (password.length < 8) return setError('Please choose a password with at least 8 characters.');
    savePendingRegistration();
    const { firstName, lastName } = splitName(name);
    const { error: passwordError } = await signUp.password({ emailAddress: normalizedEmail, password });
    if (passwordError) return setError(passwordError.message || 'We could not create your account.');
    if (firstName || lastName) {
      const { error: nameError } = await signUp.update({ firstName, lastName });
      if (nameError) return setError(nameError.message || 'We could not save your name.');
    }
    if (signUp.status === 'complete') { await navigateHome(); return; }
    const { error: verificationError } = await signUp.verifications.sendEmailCode();
    if (verificationError) return setError(verificationError.message || 'We could not send the verification code.');
    setVerificationMode(true); setSuccess(`We sent a verification code to ${normalizedEmail}.`);
  };

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault(); setError(null); setSuccess(null);
    if (!verificationCode.trim()) return setError('Enter the verification code from your email.');
    const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code: verificationCode.trim() });
    if (verifyError) return setError(verifyError.message || 'That verification code is not valid.');
    if (signUp.status === 'complete') { await navigateHome(); return; }
    setError('Verification succeeded, but the account still has required Clerk setup steps.');
  };

  const resetRegistration = () => { signUp.reset(); setVerificationMode(false); setVerificationCode(''); setPassword(''); setError(null); setSuccess(null); };

  return (
    <div className="dc-public min-h-screen overflow-hidden bg-background text-on-background">
      <div className="max-w-[1500px] mx-auto px-5 sm:px-8 lg:px-12 py-8 sm:py-12">
        <div className="flex items-center justify-between border-b-2 border-outline-variant pb-4">
          <button onClick={() => setActiveTab('landing')} className="dc-mono text-[10px] sm:text-xs uppercase tracking-[0.16em] inline-flex items-center gap-2 hover:text-primary"><ArrowLeft className="w-4 h-4" /> DC / BACK</button>
          <span className="dc-mono text-[10px] sm:text-xs uppercase tracking-[0.18em] hidden sm:block">DC / 02 — PROFILE INITIALIZATION</span>
          <span className="dc-mono text-[10px] uppercase tracking-[0.16em] flex items-center gap-2"><span className="dc-status-dot" /> {verificationMode ? 'VERIFY' : 'STUDENT'}</span>
        </div>

        <main className="grid lg:grid-cols-[0.72fr_1.28fr] gap-10 lg:gap-16 py-12 sm:py-16 lg:py-20">
          <aside className="lg:sticky lg:top-10 lg:self-start">
            <p className="dc-mono text-[10px] uppercase tracking-[0.22em] mb-6">[ CREATE YOUR IDENTITY ]</p>
            <h1 className="dc-display text-[clamp(4rem,8vw,7.5rem)]">JOIN.<br /><span className="text-primary">BUILD.</span><br />SHIP.</h1>
            <p className="mt-8 max-w-md text-base sm:text-lg leading-relaxed text-on-surface-variant">Create your student developer account, verify your college email, and enter the collective.</p>
            <div className="mt-10 border-2 border-outline-variant bg-surface dc-hard-shadow-sm">
              <div className="border-b-2 border-outline-variant px-4 py-3 dc-mono text-[9px] uppercase tracking-[0.16em]">INITIALIZATION / STATUS</div>
              <div className="p-5 space-y-4 dc-mono text-[10px] uppercase"><div className="flex justify-between"><span>IDENTITY</span><span className="text-primary">ACTIVE</span></div><div className="flex justify-between"><span>ROLE</span><span>STUDENT</span></div><div className="flex justify-between"><span>ACCOUNT</span><span>{verificationMode ? 'VERIFY' : fullName ? 'READY' : 'PENDING'}</span></div></div>
            </div>
            <div className="mt-5 border-2 border-outline-variant bg-dc-mint p-4 text-xs dc-mono">FACULTY ACCESS IS INVITATION-ONLY.</div>
          </aside>

          <section className="border-2 border-outline-variant bg-surface dc-hard-shadow p-6 sm:p-8 lg:p-10">
            <div className="flex items-start justify-between gap-5 border-b-2 border-outline-variant pb-6 mb-8"><div><p className={labelClass}>01 / {verificationMode ? 'EMAIL VERIFICATION' : 'STUDENT ACCOUNT'}</p><h2 className="dc-display text-4xl sm:text-5xl">{verificationMode ? 'VERIFY EMAIL.' : 'CREATE ACCOUNT.'}</h2></div>{verificationMode ? <CheckCircle2 className="w-7 h-7 shrink-0" /> : <UserRound className="w-7 h-7 shrink-0" />}</div>
            {(error || clerkError) && <div className="mb-7 p-4 bg-dc-pink border-2 border-outline-variant flex items-start gap-3 text-[#171717] text-xs dc-mono"><AlertCircle className="w-5 h-5 shrink-0 mt-0.5" /><span>{error || clerkError}</span></div>}
            {success && <div className="mb-7 p-4 bg-dc-mint border-2 border-outline-variant flex items-start gap-3 text-[#171717] text-xs dc-mono"><CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /><span>{success}</span></div>}

            {verificationMode ? (
              <form onSubmit={handleVerify} className="space-y-7">
                <p className="text-sm leading-relaxed text-on-surface-variant">Enter the six-digit code sent to <strong className="text-on-surface">{email.trim()}</strong>.</p>
                <input value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" className={inputClass + ' h-16 text-2xl tracking-[0.35em]'} required />
                <button type="submit" disabled={isBusy} className="w-full dc-hard-shadow-sm inline-flex items-center justify-center gap-3 bg-primary text-on-primary border-2 border-outline-variant px-6 py-4 font-bold uppercase disabled:opacity-50">{isBusy ? 'VERIFYING EMAIL...' : 'VERIFY & ENTER WORKSPACE'}<ArrowRight className="w-5 h-5" /></button>
                <div className="flex justify-between pt-2"><button type="button" onClick={resetRegistration} className="dc-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant hover:text-on-surface">Start over</button></div>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-9">
                <div><p className={labelClass}>01 / Identity</p><div className="grid sm:grid-cols-2 gap-5 mt-4">
                  <div className="space-y-2"><label className={labelClass}>Full Name</label><div className="relative"><UserRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" /><input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" className={inputClass + ' pl-10'} required /></div></div>
                  <div className="space-y-2"><label className={labelClass}>College Email</label><div className="relative"><Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="firstname.surname.cse@ghrietn.raisoni.net" className={inputClass + ' pl-10'} required /></div></div>
                  <div className="space-y-2"><label className={labelClass}>Password</label><div className="relative"><LockKeyhole className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className={inputClass + ' pl-10 pr-11'} required /><button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
                  <div className="space-y-2"><label className={labelClass}>College</label><div className="relative"><GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" /><input value={collegeName} onChange={(e) => setCollegeName(e.target.value)} className={inputClass + ' pl-10'} required /></div></div>
                  <div className="space-y-2"><label className={labelClass}>Branch</label><input value={branch} onChange={(e) => setBranch(e.target.value)} className={inputClass} required /></div>
                  <div className="space-y-2"><label className={labelClass}>Academic Year</label><select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={inputClass}><option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option><option>Postgrad</option></select></div>
                </div></div>
                <div className="border-t-2 border-outline-variant pt-7"><button type="submit" disabled={isBusy} className="w-full dc-hard-shadow-sm inline-flex items-center justify-center gap-3 bg-primary text-on-primary border-2 border-outline-variant px-6 py-4 font-bold uppercase disabled:opacity-50">{isBusy ? 'CREATING ACCOUNT...' : 'CREATE STUDENT ACCOUNT'}<ArrowRight className="w-5 h-5" /></button></div>
                <div className="relative py-2"><div className="absolute inset-0 flex items-center"><div className="w-full border-t-2 border-outline-variant" /></div><div className="relative flex justify-center"><span className="bg-surface px-4 dc-mono text-[9px] uppercase tracking-[0.16em]">OR REGISTER WITH</span></div></div>
                <div className="grid sm:grid-cols-2 gap-3"><button type="button" onClick={() => triggerOAuthLogin('google', { name: fullName, email, role: 'student', college: collegeName, branch, academicYear })} className="h-12 border-2 border-outline-variant bg-background hover:bg-dc-blue font-bold uppercase text-xs dc-mono transition-colors">Google</button><button type="button" onClick={() => triggerOAuthLogin('github', { name: fullName, email, role: 'student', college: collegeName, branch, academicYear })} className="h-12 border-2 border-outline-variant bg-background hover:bg-dc-lavender font-bold uppercase text-xs dc-mono transition-colors">GitHub</button></div>
                <p className="text-center text-sm text-on-surface-variant">Already have an account? <button type="button" onClick={() => setActiveTab('login')} className="text-primary font-bold hover:underline ml-1">Log In</button></p>
                <p className="text-center text-xs text-on-surface-variant">Faculty member? <button type="button" onClick={() => setActiveTab('faculty-register')} className="text-primary font-bold hover:underline ml-1">Use your invitation</button></p>
                <div id="clerk-captcha" />
              </form>
            )}
          </section>
        </main>
        <footer className="border-t-2 border-outline-variant pt-4 flex justify-between dc-mono text-[9px] uppercase tracking-[0.14em] text-on-surface-variant"><span>DEVCOLLECTIVE / REGISTRATION</span><span>LEARN → BUILD → COLLABORATE → SHIP</span></footer>
      </div>
    </div>
  );
};
