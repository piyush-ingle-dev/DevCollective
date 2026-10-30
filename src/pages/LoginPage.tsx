import React, { useEffect, useState } from 'react';
import { useSignIn } from '@clerk/react';
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, Github, Mail, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PENDING_EMAIL_KEY = 'devcollective_registration_email';
const CREDENTIAL_MISMATCH_CODES = new Set(['form_password_incorrect', 'form_password_or_identifier_incorrect', 'form_password_validation_failed']);

export const LoginPage: React.FC = () => {
  const { setActiveTab, triggerOAuthLogin } = useAuth();
  const { signIn, errors, fetchStatus } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verificationMode, setVerificationMode] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotCode, setForgotCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState<'email' | 'code' | 'password'>('email');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isBusy = fetchStatus === 'fetching';
  const clerkError = errors?.fields?.identifier?.message || errors?.fields?.password?.message || errors?.fields?.code?.message;

  useEffect(() => {
    const savedEmail = sessionStorage.getItem(PENDING_EMAIL_KEY);
    if (savedEmail) {
      setEmail(savedEmail);
      sessionStorage.removeItem(PENDING_EMAIL_KEY);
    }
  }, []);

  const navigateHome = async () => {
    if (signIn.status !== 'complete') return;
    await signIn.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) return;
        window.location.href = decorateUrl('/');
      },
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setError('Enter your email address and password.');
      return;
    }

    setError(null);
    setSuccess(null);
    setSubmittedEmail(normalizedEmail);

    const { error: signInError } = await signIn.password({ emailAddress: normalizedEmail, password });
    if (signInError) {
      if (signInError.code === 'form_identifier_not_found') {
        sessionStorage.setItem(PENDING_EMAIL_KEY, normalizedEmail);
        setActiveTab('register');
        return;
      }
      if (signInError.code && CREDENTIAL_MISMATCH_CODES.has(signInError.code)) {
        setError('The email or password is incorrect. Check your details or use Forgot Password to recover access.');
        setPassword('');
        return;
      }
      setError(signInError.message || 'We could not sign you in. Please try again.');
      return;
    }

    if (signIn.status === 'complete') {
      await navigateHome();
      return;
    }

    if (signIn.status === 'needs_client_trust') {
      const emailFactor = signIn.supportedSecondFactors?.find((factor) => factor.strategy === 'email_code');
      if (!emailFactor) {
        setError('This device needs verification, but no email verification method is enabled for this account.');
        return;
      }
      const { error: sendError } = await signIn.mfa.sendEmailCode();
      if (sendError) {
        setError(sendError.message || 'We could not send the device verification code.');
        return;
      }
      setVerificationMode(true);
      setSuccess(`We sent a verification code to ${normalizedEmail}.`);
      return;
    }

    if (signIn.status === 'needs_second_factor') {
      setError('This account has multi-factor authentication enabled. Complete MFA to continue.');
      return;
    }

    setError('Your sign-in needs an additional security step. Please try again or use another sign-in method.');
  };

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!verificationCode.trim()) {
      setError('Enter the verification code from your email.');
      return;
    }
    setError(null);
    setSuccess(null);
    const { error: verifyError } = await signIn.mfa.verifyEmailCode({ code: verificationCode.trim() });
    if (verifyError) {
      setError(verifyError.message || 'That verification code is invalid.');
      return;
    }
    if (signIn.status === 'complete') await navigateHome();
    else setError('Verification succeeded, but the sign-in is not complete yet.');
  };

  const startForgotPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError('Enter your account email first.');
      return;
    }
    setError(null);
    setSuccess(null);
    const { error: createError } = await signIn.create({ identifier: normalizedEmail });
    if (createError) {
      setError('We could not start password recovery. Please check the email and try again.');
      return;
    }
    const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
    if (sendError) {
      setError(sendError.message || 'We could not send a password reset code.');
      return;
    }
    setSubmittedEmail(normalizedEmail);
    setForgotStep('code');
    setSuccess(`We sent a password reset code to ${normalizedEmail}.`);
  };

  const verifyForgotCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!forgotCode.trim()) {
      setError('Enter the reset code from your email.');
      return;
    }
    setError(null);
    setSuccess(null);
    const { error: verifyError } = await signIn.resetPasswordEmailCode.verifyCode({ code: forgotCode.trim() });
    if (verifyError) {
      setError(verifyError.message || 'That reset code is invalid.');
      return;
    }
    setForgotStep('password');
  };

  const submitNewPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 8) {
      setError('Choose a new password with at least 8 characters.');
      return;
    }
    setError(null);
    setSuccess(null);
    const { error: passwordError } = await signIn.resetPasswordEmailCode.submitPassword({ password: newPassword, signOutOfOtherSessions: true });
    if (passwordError) {
      setError(passwordError.message || 'We could not update your password.');
      return;
    }
    if (signIn.status === 'complete') await navigateHome();
    else setError('Your password was updated. Please sign in again.');
  };

  const resetLogin = () => {
    signIn.reset();
    setVerificationMode(false);
    setForgotMode(false);
    setForgotStep('email');
    setVerificationCode('');
    setForgotCode('');
    setNewPassword('');
    setPassword('');
    setError(null);
    setSuccess(null);
  };

  const renderFeedback = () => {
    const message = error || clerkError;
    if (!message && !success) return null;
    return <>{message && <div className="mb-6 p-4 border-2 border-outline-variant bg-dc-pink text-[#171717] flex items-start gap-3 text-xs dc-mono"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{message}</span></div>}{success && !message && <div className="mb-6 p-4 border-2 border-outline-variant bg-dc-mint text-[#171717] flex items-start gap-3 text-xs dc-mono"><CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /><span>{success}</span></div>}</>;
  };

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col pt-20">
      <main className="flex-1 w-full max-w-[1320px] mx-auto px-5 sm:px-8 lg:px-12 py-12 sm:py-16 lg:py-20">
        <div className="grid lg:grid-cols-[0.72fr_1.28fr] gap-10 lg:gap-16 items-start">
          <aside className="lg:sticky lg:top-10">
            <p className="dc-mono text-[10px] uppercase tracking-[0.22em] mb-6">[ YOUR WORKSPACE AWAITS ]</p>
            <h1 className="dc-display text-[clamp(4rem,7vw,7rem)] leading-[0.82]">SIGN.<br /><span className="text-primary">IN.</span><br />BUILD.</h1>
            <p className="mt-8 max-w-md text-base sm:text-lg leading-relaxed text-on-surface-variant">Return to your DevCollective workspace. Your projects, progress, collaborations, and profile are waiting for you.</p>
            <div className="mt-10 border-2 border-outline-variant bg-surface dc-hard-shadow-sm"><div className="border-b-2 border-outline-variant px-4 py-3 dc-mono text-[9px] uppercase tracking-[0.16em]">ACCESS / STATUS</div><div className="p-5 space-y-4 dc-mono text-[10px] uppercase"><div className="flex justify-between"><span>IDENTITY</span><span className="text-primary">READY</span></div><div className="flex justify-between"><span>SESSION</span><span>{verificationMode ? 'VERIFY' : forgotMode ? 'RECOVERY' : 'STANDBY'}</span></div><div className="flex justify-between"><span>DESTINATION</span><span>WORKSPACE</span></div></div></div>
          </aside>

          <section className="border-2 border-outline-variant bg-surface dc-hard-shadow p-6 sm:p-8 lg:p-10">
            <div className="flex items-start justify-between gap-5 border-b-2 border-outline-variant pb-6 mb-8"><div><p className="dc-mono text-[10px] uppercase tracking-[0.18em] mb-3">01 / ACCOUNT ACCESS</p><h2 className="dc-display text-4xl sm:text-5xl">{verificationMode ? 'VERIFY DEVICE.' : forgotMode ? 'RECOVER ACCESS.' : 'SIGN IN.'}</h2></div>{verificationMode ? <CheckCircle2 className="w-7 h-7 shrink-0" /> : <Mail className="w-7 h-7 shrink-0" />}</div>
            {renderFeedback()}

            {verificationMode ? <form onSubmit={handleVerify} className="space-y-7"><div><p className="dc-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">02 / DEVICE VERIFICATION</p><p className="mt-3 text-sm leading-relaxed text-on-surface-variant">Enter the code we sent to <strong className="text-on-surface">{submittedEmail}</strong>.</p></div><div className="space-y-2"><label className="dc-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">Verification Code</label><input value={verificationCode} onChange={(event) => setVerificationCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" className="w-full h-[68px] bg-surface border-2 border-outline-variant px-5 text-2xl tracking-[0.35em] text-on-surface" required /></div><button type="submit" disabled={isBusy} className="w-full h-[68px] dc-hard-shadow-sm bg-primary text-on-primary border-2 border-outline-variant font-black uppercase text-sm flex items-center justify-center gap-4 disabled:opacity-50">{isBusy ? 'VERIFYING...' : 'VERIFY & CONTINUE'} <CheckCircle2 className="w-5 h-5" /></button><button type="button" onClick={resetLogin} className="w-full dc-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant hover:text-on-surface">Start over</button></form> : forgotMode ? <div className="space-y-7"><div className="flex items-center justify-between border-b-2 border-outline-variant pb-4"><span className="dc-mono text-[10px] uppercase tracking-[0.16em]">PASSWORD RESET / {forgotStep === 'email' ? '01' : forgotStep === 'code' ? '02' : '03'}</span><span className="dc-status-dot bg-dc-yellow" /></div>{forgotStep === 'email' && <form onSubmit={startForgotPassword} className="space-y-5"><p className="text-sm leading-relaxed text-on-surface-variant">Enter your account email and we will send a secure password reset code.</p><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="architect@devcollective.edu" autoComplete="email" className="w-full h-[68px] bg-surface border-2 border-outline-variant px-5 text-lg text-on-surface" required /><button type="submit" disabled={isBusy} className="w-full h-[68px] dc-hard-shadow-sm bg-primary text-on-primary border-2 border-outline-variant font-black uppercase text-sm flex items-center justify-center gap-4 disabled:opacity-50">{isBusy ? 'SENDING...' : 'SEND RESET CODE'} <ArrowRight className="w-5 h-5" /></button></form>}{forgotStep === 'code' && <form onSubmit={verifyForgotCode} className="space-y-5"><p className="text-sm leading-relaxed text-on-surface-variant">Enter the password reset code sent to <strong className="text-on-surface">{submittedEmail}</strong>.</p><input value={forgotCode} onChange={(event) => setForgotCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" className="w-full h-[68px] bg-surface border-2 border-outline-variant px-5 text-2xl tracking-[0.35em] text-on-surface" required /><button type="submit" disabled={isBusy} className="w-full h-[68px] dc-hard-shadow-sm bg-primary text-on-primary border-2 border-outline-variant font-black uppercase text-sm flex items-center justify-center gap-4 disabled:opacity-50">{isBusy ? 'VERIFYING...' : 'VERIFY CODE'} <ArrowRight className="w-5 h-5" /></button></form>}{forgotStep === 'password' && <form onSubmit={submitNewPassword} className="space-y-5"><p className="text-sm leading-relaxed text-on-surface-variant">Choose a new password for your account.</p><div className="relative"><input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" placeholder="New password" className="w-full h-[68px] bg-surface border-2 border-outline-variant px-5 pr-16 text-lg text-on-surface" required /><button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-5 top-1/2 -translate-y-1/2 text-on-surface-variant" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button></div><button type="submit" disabled={isBusy} className="w-full h-[68px] dc-hard-shadow-sm bg-primary text-on-primary border-2 border-outline-variant font-black uppercase text-sm flex items-center justify-center gap-4 disabled:opacity-50">{isBusy ? 'UPDATING...' : 'UPDATE PASSWORD'} <CheckCircle2 className="w-5 h-5" /></button></form>}<button type="button" onClick={resetLogin} className="w-full dc-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant hover:text-on-surface inline-flex items-center justify-center gap-2"><RotateCcw className="w-4 h-4" /> Back to sign in</button></div> : <form onSubmit={handleSubmit} className="space-y-8"><div className="space-y-2"><label className="dc-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">Email Address</label><input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(null); }} placeholder="architect@devcollective.edu" autoComplete="email" className="w-full h-[68px] bg-surface border-2 border-outline-variant px-5 text-lg text-on-surface" required /></div><div className="space-y-2"><div className="flex justify-between items-center gap-4"><label className="dc-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">Password</label><button type="button" onClick={() => { setForgotMode(true); setForgotStep('email'); setError(null); setSuccess(null); }} className="dc-mono text-[10px] uppercase tracking-[0.12em] text-primary hover:underline">Forgot Password?</button></div><div className="relative"><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => { setPassword(event.target.value); setError(null); }} autoComplete="current-password" className="w-full h-[68px] bg-surface border-2 border-outline-variant px-5 pr-16 text-lg text-on-surface" required /><button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button></div></div><button type="submit" disabled={isBusy} className="w-full h-[68px] dc-hard-shadow-sm bg-primary text-on-primary border-2 border-outline-variant font-black uppercase text-sm flex items-center justify-center gap-4 disabled:opacity-50">{isBusy ? 'AUTHENTICATING...' : 'CONTINUE TO WORKSPACE'} <ArrowRight className="w-5 h-5" /></button><div className="relative py-2"><div className="absolute inset-0 flex items-center"><div className="w-full border-t-2 border-outline-variant" /></div><div className="relative flex justify-center"><span className="bg-surface px-4 dc-mono text-[9px] uppercase tracking-[0.16em]">OR CONTINUE WITH</span></div></div><div className="grid sm:grid-cols-2 gap-3"><button type="button" onClick={() => triggerOAuthLogin('google')} className="h-12 border-2 border-outline-variant bg-background hover:bg-dc-yellow font-bold uppercase text-xs dc-mono transition-colors">Google</button><button type="button" onClick={() => triggerOAuthLogin('github')} className="h-12 border-2 border-outline-variant bg-background hover:bg-dc-mint font-bold uppercase text-xs dc-mono transition-colors"><Github className="w-4 h-4 inline mr-2" />GitHub</button></div><p className="text-center text-sm text-on-surface-variant">Don't have an account? <button type="button" onClick={() => setActiveTab('register')} className="text-primary font-bold uppercase text-xs ml-1 hover:underline">Register Here</button></p></form>}
          </section>
        </div>
        <footer className="border-t-2 border-outline-variant pt-4 mt-12 flex justify-between dc-mono text-[9px] uppercase tracking-[0.14em] text-on-surface-variant"><span>DEVCOLLECTIVE / AUTHENTICATION</span><span>LEARN → BUILD → COLLABORATE → SHIP</span></footer>
      </main>
    </div>
  );
};
