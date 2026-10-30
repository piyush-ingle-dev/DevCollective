import { useAuth as useClerkAuth, useUser } from '@clerk/react';
import { useCallback, useEffect, useState } from 'react';
import { getPlatformEmailError, isAllowedPlatformEmail } from '../lib/accessControl';

export const usePlatformAccess = (enabled = true) => {
  const { getToken, isSignedIn, signOut } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const [checked, setChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    if (!enabled || !isSignedIn || !clerkUser) {
      setChecked(true); setAllowed(true); setEmail(''); setError(null); return;
    }
    const currentEmail = String(clerkUser.primaryEmailAddress?.emailAddress || '').trim().toLowerCase();
    setEmail(currentEmail);
    try {
      const token = await getToken();
      if (!token) throw new Error('Your session could not be verified.');
      const response = await fetch('/api/access/me', { headers: { Authorization: `Bearer ${token}` } });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof body?.error === 'string' ? body.error : getPlatformEmailError());
      setAllowed(true); setError(null);
    } catch (err) {
      setAllowed(false); setError(err instanceof Error ? err.message : 'Could not verify platform access.');
    } finally { setChecked(true); }
  }, [clerkUser, enabled, getToken, isSignedIn]);

  useEffect(() => { void check(); }, [check]);
  const rejectAndSignOut = useCallback(async () => { await signOut({ redirectUrl: '/' }); }, [signOut]);
  return { checked, allowed, email, error, rejectAndSignOut, refresh: check };
};
