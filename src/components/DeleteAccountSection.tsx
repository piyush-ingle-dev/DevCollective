import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth as useClerkAuth, useSession, useUser } from '@clerk/react';
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, ShieldAlert, X } from 'lucide-react';

const DELETION_FUNCTION = `${String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')}/functions/v1/account-deletion`;
type ModalStep = 'closed' | 'confirm' | 'code' | 'deleting' | 'success';

export const DeleteAccountSection: React.FC = () => {
  const { getToken } = useClerkAuth();
  const { session } = useSession();
  const { user: clerkUser } = useUser();
  const [step, setStep] = useState<ModalStep>('closed');
  const [confirmation, setConfirmation] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [deletionToken, setDeletionToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => setResendCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const closeModal = () => {
    if (busy) return;
    setStep('closed');
    setConfirmation('');
    setVerificationCode('');
    setDeletionToken(null);
    setError(null);
    setResendCooldown(0);
  };

  const deletionRequest = async (action: string, body: Record<string, unknown> = {}, includeAuth = false) => {
    if (!DELETION_FUNCTION.startsWith('http')) throw new Error('Account deletion service is not configured.');
    const headers = new Headers({ 'Content-Type': 'application/json' });
    if (includeAuth) {
      const token = await getToken();
      if (!token) throw new Error('Your session could not be verified. Please sign in again.');
      headers.set('Authorization', `Bearer ${token}`);
    }
    const response = await fetch(DELETION_FUNCTION, {
      method: 'POST', headers, body: JSON.stringify({ action, ...body }), keepalive: action === 'cleanup',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Account deletion request failed.');
    return data;
  };

  const findEmailFactor = (verification: any) => {
    const factors = verification?.firstFactorVerification?.supportedFirstFactors || verification?.supportedFirstFactors || [];
    return factors.find((factor: any) => factor?.strategy === 'email_code' && factor?.emailAddressId) || null;
  };

  const sendVerificationCode = async () => {
    if (!session || !clerkUser) return setError('Your Clerk session is not ready. Please refresh and try again.');
    if (confirmation !== 'DELETE') return setError('Type DELETE exactly to continue.');
    setBusy(true); setError(null);
    try {
      const prepared = await deletionRequest('prepare', {}, true);
      const token = String(prepared.token || '');
      if (!token) throw new Error('Could not prepare the deletion request. Your account was not deleted.');
      setDeletionToken(token);
      const verification = await (session as any).startVerification({ level: 'first_factor' });
      const emailFactor = findEmailFactor(verification);
      if (!emailFactor) throw new Error('Email-code verification is not available for this account. Your account was not deleted.');
      await (session as any).prepareFirstFactorVerification({ strategy: 'email_code', emailAddressId: emailFactor.emailAddressId });
      setVerificationCode(''); setResendCooldown(30); setStep('code');
    } catch (err: any) {
      setDeletionToken(null); setError(err?.message || 'Could not send the deletion verification code.');
    } finally { setBusy(false); }
  };

  const resendCode = async () => {
    if (!session || resendCooldown > 0 || busy) return;
    setBusy(true); setError(null);
    try {
      const verification = await (session as any).startVerification({ level: 'first_factor' });
      const emailFactor = findEmailFactor(verification);
      if (!emailFactor) throw new Error('Email-code verification is not available for this account.');
      await (session as any).prepareFirstFactorVerification({ strategy: 'email_code', emailAddressId: emailFactor.emailAddressId });
      setVerificationCode(''); setResendCooldown(30);
    } catch (err: any) { setError(err?.message || 'Could not resend the verification code.'); }
    finally { setBusy(false); }
  };

  const verifyAndDelete = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session || !clerkUser || !deletionToken || busy) return;
    if (!/^\d{6}$/.test(verificationCode)) return setError('Enter the 6-digit code sent to your email.');
    setBusy(true); setError(null); setStep('deleting');
    try {
      const verification = await (session as any).attemptFirstFactorVerification({ strategy: 'email_code', code: verificationCode });
      if (verification?.status && verification.status !== 'complete') throw new Error('Verification was not completed. Your account was not deleted.');
      await clerkUser.delete();
      try { await deletionRequest('cleanup', { token: deletionToken }); } catch (cleanupError) { console.error('Supabase account cleanup failed after Clerk deletion:', cleanupError); }
      localStorage.removeItem(`devcollective_profile_cache:${clerkUser.id}`);
      sessionStorage.removeItem('devcollective_pending_registration');
      setStep('success');
      window.setTimeout(() => window.location.assign('/'), 1600);
    } catch (err: any) {
      setStep('code'); setError(err?.message || 'The code could not be verified. Your account was not deleted.');
    } finally { setBusy(false); }
  };

  const modal = step !== 'closed' ? (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="presentation">
      <div className="relative flex w-full max-w-[560px] max-h-[calc(100vh-2rem)] flex-col overflow-hidden bg-surface border-2 border-red-500 shadow-[8px_8px_0_#171717]" role="dialog" aria-modal="true" aria-labelledby="delete-account-dialog-title">
        <button type="button" onClick={closeModal} disabled={busy || step === 'success'} className="absolute top-3 right-3 z-20 p-1.5 bg-surface border-2 border-outline-variant hover:bg-dc-blue disabled:opacity-40" aria-label="Close deletion dialog"><X className="w-5 h-5" /></button>

        {step === 'confirm' && <div className="flex min-h-0 flex-col">
          <div className="overflow-y-auto overscroll-contain p-6 sm:p-8 pr-14">
            <div className="w-11 h-11 border-2 border-red-500 bg-red-100 text-red-600 flex items-center justify-center"><AlertTriangle className="w-6 h-6" /></div>
            <p className="font-label-mono text-[10px] uppercase text-red-500 mt-5">FINAL ACTION / VERIFY OWNERSHIP</p>
            <h4 id="delete-account-dialog-title" className="dc-display text-4xl mt-1 leading-none">THIS CANNOT BE UNDONE.</h4>
            <p className="text-sm text-on-surface-variant mt-4 leading-relaxed">Your Clerk account and DevCollective application data will be permanently removed. We will first send a one-time verification code to <strong className="break-all">{clerkUser?.primaryEmailAddress?.emailAddress || 'your email'}</strong>.</p>
            <label className="block mt-6"><span className="font-label-mono text-[10px] uppercase text-on-surface-variant">Type DELETE to continue</span><input type="text" name="account-delete-confirmation" value={confirmation} onChange={(e) => setConfirmation(e.target.value.replace(/\s/g, '').slice(0, 6).toUpperCase())} autoFocus autoComplete="off" spellCheck={false} inputMode="text" data-lpignore="true" data-1p-ignore="true" placeholder="DELETE" className="mt-2 w-full bg-surface border-2 border-outline-variant p-3.5 font-label-mono text-sm uppercase" /></label>
            {error && <p className="mt-3 text-xs text-error">{error}</p>}
          </div>
          <div className="shrink-0 border-t-2 border-outline-variant bg-surface p-4 sm:p-5 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <button type="button" onClick={closeModal} disabled={busy} className="sm:min-w-[120px] border-2 border-outline-variant py-3 font-label-mono text-[10px] uppercase">Cancel</button>
            <button type="button" onClick={() => void sendVerificationCode()} disabled={busy || confirmation !== 'DELETE'} className="sm:min-w-[220px] bg-red-500 text-white border-2 border-outline-variant py-3 font-label-mono text-[10px] uppercase font-bold shadow-[3px_3px_0_#171717] flex items-center justify-center gap-2 disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />} Continue &amp; send code</button>
          </div>
        </div>}

        {step === 'code' && <form onSubmit={verifyAndDelete} className="flex min-h-0 flex-col">
          <div className="overflow-y-auto overscroll-contain p-6 sm:p-8 pr-14">
            <p className="font-label-mono text-[10px] uppercase text-on-surface-variant">SECURITY / EMAIL VERIFICATION</p>
            <h4 className="dc-display text-4xl mt-1 leading-none">ENTER THE CODE.</h4>
            <p className="text-sm text-on-surface-variant mt-4 leading-relaxed">We sent a 6-digit verification code to <strong className="break-all">{clerkUser?.primaryEmailAddress?.emailAddress || 'your email'}</strong>. Enter it below to authorize permanent deletion.</p>
            <input type="text" name="account-delete-otp" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus autoComplete="one-time-code" spellCheck={false} inputMode="numeric" maxLength={6} data-lpignore="true" data-1p-ignore="true" placeholder="000000" className="mt-6 w-full bg-surface border-2 border-outline-variant p-4 text-center font-label-mono text-2xl tracking-[0.5em]" />
            {error && <p className="mt-3 text-xs text-error">{error}</p>}
            <div className="flex items-center justify-between gap-4 mt-4"><button type="button" onClick={() => void resendCode()} disabled={busy || resendCooldown > 0} className="font-label-mono text-[10px] uppercase text-primary disabled:opacity-40">{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}</button><span className="font-label-mono text-[9px] uppercase text-on-surface-variant">Required to continue</span></div>
          </div>
          <div className="shrink-0 border-t-2 border-outline-variant bg-surface p-4 sm:p-5 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <button type="button" onClick={closeModal} disabled={busy} className="sm:min-w-[120px] border-2 border-outline-variant py-3 font-label-mono text-[10px] uppercase">Cancel</button>
            <button type="submit" disabled={busy || verificationCode.length !== 6} className="sm:min-w-[220px] bg-red-500 text-white border-2 border-outline-variant py-3 font-label-mono text-[10px] uppercase font-bold shadow-[3px_3px_0_#171717] flex items-center justify-center gap-2 disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />} Delete my account</button>
          </div>
        </form>}

        {step === 'deleting' && <div className="p-10 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-red-500" /><p className="font-label-mono text-xs uppercase mt-4">Deleting account...</p><p className="text-sm text-on-surface-variant mt-2">Please keep this window open.</p></div>}
        {step === 'success' && <div className="p-10 text-center"><CheckCircle2 className="w-12 h-12 mx-auto text-dc-mint" /><p className="dc-display text-3xl mt-4">ACCOUNT DELETED.</p><p className="text-sm text-on-surface-variant mt-2">Redirecting you now.</p></div>}
      </div>
    </div>
  ) : null;

  return (
    <section className="relative overflow-hidden border-2 border-red-500/60 bg-surface shadow-[5px_5px_0_#171717]">
      <div className="h-2 bg-red-400" />
      <div className="p-6 md:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="min-w-0 max-w-3xl">
            <p className="font-label-mono text-[10px] uppercase tracking-[0.18em] text-red-500">PROFILE / DANGER ZONE</p>
            <h3 className="dc-display text-3xl mt-1">DELETE ACCOUNT PERMANENTLY</h3>
            <p className="text-sm text-on-surface-variant mt-3 leading-relaxed">Permanently remove your DevCollective profile and account. Verification is required before anything is deleted.</p>
          </div>
          <button type="button" onClick={() => { setError(null); setConfirmation(''); setStep('confirm'); }} className="w-full lg:w-auto shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 bg-red-500 text-white border-2 border-outline-variant shadow-[4px_4px_0_#171717] font-label-mono text-[10px] uppercase font-bold hover:-translate-y-0.5 transition-transform"><ShieldAlert className="w-4 h-4" /> Delete permanently</button>
        </div>
      </div>
      {typeof document !== 'undefined' && modal ? createPortal(modal, document.body) : null}
    </section>
  );
};