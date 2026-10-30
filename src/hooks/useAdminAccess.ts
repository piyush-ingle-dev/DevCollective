import { useAuth as useClerkAuth, useUser } from '@clerk/react';
import { useCallback, useEffect, useState } from 'react';
import { isAllowedPlatformEmail } from '../lib/accessControl';

type AdminAccess = {
  checked: boolean;
  allowed: boolean;
  isAdmin: boolean;
  email: string;
  error: string | null;
};

let cached: { checkedAt: number; data: Omit<AdminAccess, 'checked'> } | null = null;
let pending: Promise<Omit<AdminAccess, 'checked'>> | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export const clearAdminAccessCache = () => { cached = null; };

export const useAdminAccess = () => {
  const { getToken, isSignedIn } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const [state, setState] = useState<AdminAccess>({ checked: false, allowed: false, isAdmin: false, email: '', error: null });

  const check = useCallback(async () => {
    if (!isSignedIn || !clerkUser) {
      const empty = { allowed: false, isAdmin: false, email: '', error: null };
      cached = { checkedAt: Date.now(), data: empty };
      setState({ checked: true, ...empty });
      return;
    }
    if (cached && Date.now() - cached.checkedAt < CACHE_TTL_MS && cached.data.email) {
      setState({ checked: true, ...cached.data });
      return;
    }
    if (!pending) {
      pending = (async () => {
        const token = await getToken();
        const email = String(clerkUser.primaryEmailAddress?.emailAddress || '').trim().toLowerCase();
        if (!token) return { allowed: false, isAdmin: false, email, error: 'Not authenticated.' };
        const response = await fetch('/api/admin/me', { headers: { Authorization: `Bearer ${token}` } });
        const body = await response.json().catch(() => ({}));
        if (response.ok) return { allowed: true, isAdmin: Boolean(body.isAdmin), email: String(body.email || email), error: null };
        if (response.status === 403) return { allowed: isAllowedPlatformEmail(email), isAdmin: false, email, error: null };
        return { allowed: false, isAdmin: false, email, error: typeof body?.error === 'string' ? body.error : 'Could not verify administrator access.' };
      })().finally(() => { pending = null; });
    }
    const result = await pending;
    cached = { checkedAt: Date.now(), data: result };
    setState({ checked: true, ...result });
  }, [clerkUser, getToken, isSignedIn]);

  useEffect(() => { void check(); }, [check]);
  return { ...state, refresh: check };
};
