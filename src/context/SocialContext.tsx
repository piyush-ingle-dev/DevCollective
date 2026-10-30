import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Github, Linkedin } from 'lucide-react';
import { useAuth as useClerkAuth } from '@clerk/react';
import type { UserProfile } from '../types';

export type SocialProfile = Pick<UserProfile, 'id' | 'name' | 'role' | 'college' | 'branch' | 'academicYear' | 'avatar' | 'bio' | 'rep' | 'level' | 'streakDays' | 'githubUrl' | 'linkedinUrl' | 'skills' | 'selectedDomains'>;

export interface SocialSummary {
  profile: SocialProfile;
  followerCount: number;
  followingCount: number;
  connectionCount: number;
  isFollowing: boolean;
  connectionStatus: 'none' | 'outgoing_pending' | 'incoming_pending' | 'connected';
  connectionRequestId: string | null;
  followers: Pick<UserProfile, 'id' | 'name' | 'avatar' | 'role' | 'college'>[];
  connections: Pick<UserProfile, 'id' | 'name' | 'avatar' | 'role' | 'college'>[];
}

interface SocialContextValue {
  viewedProfileId: string | null;
  openProfile: (userId: string) => void;
  closeProfile: () => void;
  loadSocialSummary: (userId: string) => Promise<SocialSummary>;
  toggleFollow: (userId: string) => Promise<SocialSummary>;
  requestConnection: (userId: string) => Promise<SocialSummary>;
  respondToConnection: (requestId: string, action: 'accept' | 'reject') => Promise<SocialSummary | null>;
  removeConnection: (userId: string) => Promise<SocialSummary>;
}

const SocialContext = createContext<SocialContextValue | null>(null);

export const useSocial = () => {
  const context = useContext(SocialContext);
  if (!context) throw new Error('useSocial must be used inside SocialProvider.');
  return context;
};

const SocialProfileLinksPanel: React.FC = () => {
  const { viewedProfileId, loadSocialSummary } = useSocial();
  const [summary, setSummary] = useState<SocialSummary | null>(null);

  useEffect(() => {
    if (!viewedProfileId) {
      setSummary(null);
      return;
    }
    let cancelled = false;
    void loadSocialSummary(viewedProfileId)
      .then((next) => { if (!cancelled) setSummary(next); })
      .catch(() => { if (!cancelled) setSummary(null); });
    return () => { cancelled = true; };
  }, [viewedProfileId, loadSocialSummary]);

  if (!viewedProfileId || !summary) return null;

  const { githubUrl, linkedinUrl, name } = summary.profile;
  if (!githubUrl && !linkedinUrl) return null;

  const openExternal = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed left-4 bottom-5 sm:left-6 sm:bottom-6 z-[85] border-2 border-outline-variant bg-surface shadow-[5px_5px_0_#171717] p-3 max-w-[calc(100vw-32px)]">
      <p className="font-label-mono text-[9px] uppercase text-on-surface-variant mb-2">SOCIAL LINKS / {name}</p>
      <div className="flex flex-wrap gap-2">
        {githubUrl && (
          <button type="button" onClick={() => openExternal(githubUrl)} className="inline-flex items-center gap-2 px-3 py-2 bg-surface border-2 border-outline-variant font-label-mono text-[9px] uppercase font-bold hover:bg-dc-blue shadow-[2px_2px_0_#171717]">
            <Github className="w-3.5 h-3.5" /> GitHub
          </button>
        )}
        {linkedinUrl && (
          <button type="button" onClick={() => openExternal(linkedinUrl)} className="inline-flex items-center gap-2 px-3 py-2 bg-surface border-2 border-outline-variant font-label-mono text-[9px] uppercase font-bold hover:bg-dc-lavender shadow-[2px_2px_0_#171717]">
            <Linkedin className="w-3.5 h-3.5" /> LinkedIn
          </button>
        )}
      </div>
    </div>
  );
};

export const SocialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getToken } = useClerkAuth();
  const [viewedProfileId, setViewedProfileId] = useState<string | null>(null);

  const socialFetch = useCallback(async (path: string, init: RequestInit = {}) => {
    const baseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
    if (!baseUrl) throw new Error('Supabase URL is not configured.');
    const token = await getToken();
    if (!token) throw new Error('Not authenticated.');
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Content-Type', 'application/json');
    const response = await fetch(`${baseUrl}/functions/v1/social-graph${path}`, { ...init, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Social request failed.');
    return data;
  }, [getToken]);

  const loadSocialSummary = useCallback(async (userId: string) => {
    const data = await socialFetch(`?action=summary&userId=${encodeURIComponent(userId)}`);
    return data.summary as SocialSummary;
  }, [socialFetch]);

  const toggleFollow = useCallback(async (userId: string) => {
    const data = await socialFetch('?action=toggle-follow', { method: 'POST', body: JSON.stringify({ userId }) });
    return data.summary as SocialSummary;
  }, [socialFetch]);

  const requestConnection = useCallback(async (userId: string) => {
    const data = await socialFetch('?action=request-connection', { method: 'POST', body: JSON.stringify({ userId }) });
    return data.summary as SocialSummary;
  }, [socialFetch]);

  const respondToConnection = useCallback(async (requestId: string, action: 'accept' | 'reject') => {
    const data = await socialFetch('?action=respond-connection', { method: 'POST', body: JSON.stringify({ requestId, action }) });
    return data.summary ? data.summary as SocialSummary : null;
  }, [socialFetch]);

  const removeConnection = useCallback(async (userId: string) => {
    const data = await socialFetch('?action=remove-connection', { method: 'POST', body: JSON.stringify({ userId }) });
    return data.summary as SocialSummary;
  }, [socialFetch]);

  const value = useMemo(() => ({
    viewedProfileId,
    openProfile: (userId: string) => setViewedProfileId(userId),
    closeProfile: () => setViewedProfileId(null),
    loadSocialSummary,
    toggleFollow,
    requestConnection,
    respondToConnection,
    removeConnection,
  }), [viewedProfileId, loadSocialSummary, toggleFollow, requestConnection, respondToConnection, removeConnection]);

  return <SocialContext.Provider value={value}>{children}<SocialProfileLinksPanel /></SocialContext.Provider>;
};
