import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Link2, Loader2, ShieldCheck, UserPlus, Users, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocial, type SocialSummary } from '../context/SocialContext';

export const SocialProfileOverlay: React.FC = () => {
  const { user, posts } = useAuth();
  const { viewedProfileId, openProfile, closeProfile, loadSocialSummary, toggleFollow, requestConnection, respondToConnection, removeConnection } = useSocial();
  const [summary, setSummary] = useState<SocialSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionMenuOpen, setConnectionMenuOpen] = useState(false);

  useEffect(() => {
    if (!user || viewedProfileId) return;

    const wireCommunityAuthors = () => {
      const articles = Array.from(document.querySelectorAll<HTMLElement>('.dc-page-community article'));
      articles.forEach((article) => {
        const authorHeading = article.querySelector<HTMLElement>('h4.font-bold');
        if (!authorHeading) return;
        const authorName = authorHeading.textContent?.trim() || '';
        const post = posts.find((item) => item.authorName === authorName && (item.title ? article.textContent?.includes(item.title) : article.textContent?.includes(item.content.slice(0, 40))));
        if (!post) return;

        const targets = [authorHeading, article.querySelector<HTMLElement>('img.w-11.h-11')].filter(Boolean) as HTMLElement[];
        targets.forEach((target) => {
          target.dataset.dcProfileId = post.authorId;
          target.classList.add('dc-social-profile-link');
          target.setAttribute('title', `View ${post.authorName}'s profile`);
          target.setAttribute('role', 'button');
          target.setAttribute('tabindex', '0');
        });
      });
    };

    wireCommunityAuthors();
    const observer = new MutationObserver(wireCommunityAuthors);
    observer.observe(document.body, { subtree: true, childList: true });

    const onClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-dc-profile-id]');
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      const profileId = target.dataset.dcProfileId;
      if (profileId) openProfile(profileId);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-dc-profile-id]');
      if (!target) return;
      event.preventDefault();
      const profileId = target.dataset.dcProfileId;
      if (profileId) openProfile(profileId);
    };
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      observer.disconnect();
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown, true);
      document.querySelectorAll<HTMLElement>('[data-dc-profile-id]').forEach((element) => {
        delete element.dataset.dcProfileId;
        element.classList.remove('dc-social-profile-link');
        element.removeAttribute('title');
        element.removeAttribute('role');
        element.removeAttribute('tabindex');
      });
    };
  }, [user, viewedProfileId, posts, openProfile]);

  useEffect(() => {
    if (!viewedProfileId || viewedProfileId === user?.id) {
      setSummary(null);
      setConnectionMenuOpen(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setConnectionMenuOpen(false);
    void loadSocialSummary(viewedProfileId)
      .then((next) => { if (!cancelled) setSummary(next); })
      .catch((err: any) => { if (!cancelled) setError(err?.message || 'Could not load this profile.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [viewedProfileId, user?.id, loadSocialSummary]);

  if (!viewedProfileId || viewedProfileId === user?.id) return null;

  const profile = summary?.profile;
  const isActing = action !== null;

  const doFollow = async () => {
    if (!profile || isActing) return;
    setAction('follow'); setError(null);
    try { setSummary(await toggleFollow(profile.id)); } catch (err: any) { setError(err?.message || 'Could not update follow.'); } finally { setAction(null); }
  };

  const doConnect = async () => {
    if (!profile || isActing) return;
    setAction('connect'); setError(null);
    try { setSummary(await requestConnection(profile.id)); } catch (err: any) { setError(err?.message || 'Could not send connection request.'); } finally { setAction(null); }
  };

  const doRespond = async (response: 'accept' | 'reject') => {
    if (!summary?.connectionRequestId || isActing) return;
    setAction(response); setError(null);
    try { setSummary(await respondToConnection(summary.connectionRequestId, response) || summary); } catch (err: any) { setError(err?.message || 'Could not update connection request.'); } finally { setAction(null); }
  };

  const doRemoveConnection = async () => {
    if (!profile || isActing) return;
    if (!window.confirm(`Remove ${profile.name} from your connections?`)) return;
    setAction('remove'); setError(null); setConnectionMenuOpen(false);
    try { setSummary(await removeConnection(profile.id)); } catch (err: any) { setError(err?.message || 'Could not remove this connection.'); } finally { setAction(null); }
  };

  return (
    <div data-lenis-prevent-wheel className="fixed inset-0 z-[70] overflow-y-auto overscroll-contain touch-pan-y bg-background text-on-background">
      <div className="min-h-screen p-4 sm:p-6 lg:p-10">
        <div className="max-w-6xl mx-auto pb-16">
          <div className="flex items-center justify-between mb-5">
            <button type="button" onClick={closeProfile} className="inline-flex items-center gap-2 border-2 border-outline-variant bg-surface px-4 py-3 shadow-[3px_3px_0_#171717] font-label-mono text-[10px] uppercase font-bold"><ArrowLeft className="w-4 h-4" /> Back to community</button>
            <button type="button" onClick={closeProfile} className="border-2 border-outline-variant bg-surface p-3 shadow-[3px_3px_0_#171717]" aria-label="Close profile"><X className="w-5 h-5" /></button>
          </div>

          {loading ? (
            <div className="min-h-[65vh] flex items-center justify-center"><div className="border-2 border-outline-variant bg-surface px-5 py-4 shadow-[4px_4px_0_#171717] flex items-center gap-3"><Loader2 className="w-4 h-4 animate-spin" /><span className="font-label-mono text-[10px] uppercase">Loading member profile...</span></div></div>
          ) : error ? (
            <div className="border-2 border-outline-variant bg-surface p-8 shadow-[5px_5px_0_#171717]"><p className="text-sm text-error">{error}</p></div>
          ) : profile && (
            <div className="space-y-6">
              <section className="relative overflow-hidden border-2 border-outline-variant bg-surface shadow-[7px_7px_0_#171717]">
                <div className="h-32 sm:h-44 bg-[linear-gradient(135deg,var(--dc-blue),var(--dc-lavender),var(--dc-mint))] border-b-2 border-outline-variant" />
                <div className="p-5 sm:p-8 -mt-12 relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                  <div className="flex items-end gap-4 min-w-0">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 border-2 border-outline-variant bg-surface overflow-hidden shadow-[4px_4px_0_#171717] flex items-center justify-center">
                      {profile.avatar ? <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" /> : <span className="dc-display text-3xl">{profile.name.slice(0,1).toUpperCase()}</span>}
                    </div>
                    <div className="min-w-0 pb-1">
                      <p className="font-label-mono text-[10px] uppercase text-on-surface-variant">MEMBER / {profile.role}</p>
                      <h1 className="dc-display text-4xl sm:text-5xl truncate">{profile.name}</h1>
                      {profile.role === 'mentor' && <span className="mt-2 inline-flex items-center gap-1.5 border-2 border-outline-variant bg-dc-mint px-2 py-1 font-label-mono text-[9px] uppercase font-bold text-[#171717]"><ShieldCheck className="w-3.5 h-3.5" /> Verified Mentor</span>}
                      <p className="font-label-mono text-[10px] uppercase text-primary font-bold mt-2">{profile.college} · {profile.branch}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {summary && <button type="button" onClick={() => void doFollow()} disabled={isActing} className={`inline-flex items-center gap-2 px-4 py-3 border-2 border-outline-variant font-label-mono text-[10px] uppercase font-bold shadow-[3px_3px_0_#171717] ${summary.isFollowing ? 'bg-dc-mint' : 'bg-dc-blue'}`}>{action === 'follow' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}{summary.isFollowing ? 'Following' : 'Follow'}</button>}
                    {summary?.connectionStatus === 'connected' && <div className="relative">
                      <button type="button" onClick={() => setConnectionMenuOpen((open) => !open)} disabled={isActing} className="inline-flex items-center gap-2 px-4 py-3 border-2 border-outline-variant bg-dc-lavender font-label-mono text-[10px] uppercase font-bold shadow-[3px_3px_0_#171717]">
                        {action === 'remove' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {action === 'remove' ? 'Removing...' : 'Connected'}
                      </button>
                      {connectionMenuOpen && !isActing && <div className="absolute right-0 top-full mt-2 min-w-[190px] z-10 border-2 border-outline-variant bg-surface shadow-[4px_4px_0_#171717] p-1">
                        <button type="button" onClick={() => void doRemoveConnection()} className="w-full text-left px-3 py-2.5 font-label-mono text-[9px] uppercase font-bold hover:bg-dc-pink/60">Remove connection</button>
                      </div>}
                    </div>}
                    {summary?.connectionStatus === 'outgoing_pending' && <button type="button" disabled className="px-4 py-3 border-2 border-outline-variant bg-surface-container-low font-label-mono text-[10px] uppercase font-bold">Request sent</button>}
                    {summary?.connectionStatus === 'none' && <button type="button" onClick={() => void doConnect()} disabled={isActing} className="inline-flex items-center gap-2 px-4 py-3 bg-primary text-on-primary border-2 border-outline-variant font-label-mono text-[10px] uppercase font-bold shadow-[3px_3px_0_#171717]">{action === 'connect' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />} Connect</button>}
                    {summary?.connectionStatus === 'incoming_pending' && <><button type="button" onClick={() => void doRespond('accept')} disabled={isActing} className="inline-flex items-center gap-2 px-4 py-3 bg-dc-mint border-2 border-outline-variant font-label-mono text-[10px] uppercase font-bold shadow-[3px_3px_0_#171717]"><Check className="w-4 h-4" /> {action === 'accept' ? 'Accepting...' : 'Accept'}</button><button type="button" onClick={() => void doRespond('reject')} disabled={isActing} className="px-4 py-3 bg-surface border-2 border-outline-variant font-label-mono text-[10px] uppercase font-bold">{action === 'reject' ? 'Ignoring...' : 'Ignore'}</button></>}
                  </div>
                </div>
              </section>

              {error && <p className="text-xs text-error">{error}</p>}

              <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                  ['REP', profile.rep.toLocaleString(), 'bg-dc-lavender'],
                  ['LEVEL', String(profile.level), 'bg-dc-blue'],
                  ['FOLLOWERS', String(summary?.followerCount || 0), 'bg-dc-mint'],
                  ['CONNECTIONS', String(summary?.connectionCount || 0), 'bg-dc-yellow'],
                ].map(([label, value, tone]) => <div key={label} className="relative overflow-hidden border-2 border-outline-variant bg-surface p-4 sm:p-5 shadow-[3px_3px_0_#171717]"><div className={`absolute inset-x-0 top-0 h-2 ${tone}`} /><p className="font-label-mono text-[9px] uppercase text-on-surface-variant mt-1">{label}</p><p className="dc-display text-2xl sm:text-3xl mt-2">{value}</p></div>)}
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="border-2 border-outline-variant bg-surface p-6 shadow-[5px_5px_0_#171717]">
                  <p className="font-label-mono text-[10px] uppercase text-on-surface-variant">ABOUT / SIGNAL</p>
                  <h2 className="dc-display text-3xl mt-2">{profile.bio || 'BUILDING IN PUBLIC.'}</h2>
                  <div className="mt-5 flex flex-wrap gap-2">{profile.skills.length ? profile.skills.map((skill) => <span key={skill} className="px-3 py-2 bg-dc-blue border-2 border-outline-variant font-label-mono text-[9px] uppercase">{skill}</span>) : <span className="font-label-mono text-[9px] uppercase text-on-surface-variant">No skills listed yet.</span>}</div>
                  {profile.selectedDomains.length > 0 && <div className="mt-5"><p className="font-label-mono text-[9px] uppercase text-on-surface-variant mb-2">INTERESTED IN</p><div className="flex flex-wrap gap-2">{profile.selectedDomains.map((domain) => <span key={domain} className="px-3 py-2 bg-dc-lavender border-2 border-outline-variant font-label-mono text-[9px] uppercase">{domain}</span>)}</div></div>}
                </div>
                <div className="border-2 border-outline-variant bg-surface p-6 shadow-[5px_5px_0_#171717]">
                  <div className="flex items-end justify-between border-b-2 border-outline-variant pb-4 mb-4"><div><p className="font-label-mono text-[10px] uppercase text-on-surface-variant">NETWORK / GRAPH</p><h2 className="dc-display text-3xl mt-1">SOCIAL SIGNAL</h2></div><Link2 className="w-5 h-5" /></div>
                  <div className="space-y-4">
                    <div><div className="flex items-center justify-between mb-2"><p className="font-label-mono text-[9px] uppercase">FOLLOWERS</p><span className="font-label-mono text-[9px]">{summary?.followerCount || 0}</span></div><div className="flex flex-wrap gap-2">{summary?.followers.length ? summary.followers.slice(0, 6).map((person) => <button key={person.id} type="button" onClick={() => openProfile(person.id)} className="w-9 h-9 border-2 border-outline-variant overflow-hidden bg-dc-yellow" title={person.name}>{person.avatar ? <img src={person.avatar} alt={person.name} className="w-full h-full object-cover" /> : <span className="font-bold text-xs">{person.name.slice(0,1)}</span>}</button>) : <span className="font-label-mono text-[9px] uppercase text-on-surface-variant">No followers yet.</span>}</div></div>
                    <div><div className="flex items-center justify-between mb-2"><p className="font-label-mono text-[9px] uppercase">CONNECTIONS</p><span className="font-label-mono text-[9px]">{summary?.connectionCount || 0}</span></div><div className="flex flex-wrap gap-2">{summary?.connections.length ? summary.connections.slice(0, 6).map((person) => <button key={person.id} type="button" onClick={() => openProfile(person.id)} className="w-9 h-9 border-2 border-outline-variant overflow-hidden bg-dc-mint" title={person.name}>{person.avatar ? <img src={person.avatar} alt={person.name} className="w-full h-full object-cover" /> : <span className="font-bold text-xs flex h-full items-center justify-center">{person.name.slice(0,1)}</span>}</button>) : <span className="font-label-mono text-[9px] uppercase text-on-surface-variant">No connections yet.</span>}</div></div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
