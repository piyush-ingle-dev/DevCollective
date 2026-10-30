import React, { useEffect, useState } from 'react';
import { Link2, Loader2, UserPlus, Users } from 'lucide-react';
import { useSocial, type SocialSummary } from '../context/SocialContext';

export const SocialNetworkPanel: React.FC<{ userId: string }> = ({ userId }) => {
  const { loadSocialSummary, openProfile } = useSocial();
  const [summary, setSummary] = useState<SocialSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void loadSocialSummary(userId)
      .then((data) => { if (!cancelled) setSummary(data); })
      .catch(() => { if (!cancelled) setSummary(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [loadSocialSummary, userId]);

  return (
    <section className="relative overflow-hidden border-2 border-outline-variant bg-surface p-6 md:p-8 shadow-[5px_5px_0_#171717]">
      <div className="absolute inset-x-0 top-0 h-2 bg-dc-blue" />
      <div className="flex items-end justify-between border-b-2 border-outline-variant pb-4 mb-6 pt-1">
        <div className="flex items-end gap-3"><div className="w-9 h-9 border-2 border-outline-variant bg-dc-blue flex items-center justify-center"><Link2 className="w-4 h-4" /></div><div><p className="font-label-mono text-[10px] uppercase text-on-surface-variant">NETWORK / SOCIAL GRAPH</p><h3 className="dc-display text-3xl mt-1">MY NETWORK.</h3></div></div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-on-surface-variant" />}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          ['FOLLOWERS', summary?.followerCount ?? 0, 'bg-dc-mint'],
          ['FOLLOWING', summary?.followingCount ?? 0, 'bg-dc-blue'],
          ['CONNECTIONS', summary?.connectionCount ?? 0, 'bg-dc-yellow'],
        ].map(([label, value, tone]) => <div key={label} className="relative overflow-hidden border-2 border-outline-variant bg-surface-container-low p-4"><div className={`absolute inset-x-0 top-0 h-1.5 ${tone}`} /><p className="font-label-mono text-[8px] uppercase text-on-surface-variant mt-1">{label}</p><p className="dc-display text-2xl mt-2">{value}</p></div>)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
        <div className="border-2 border-outline-variant/60 p-4 bg-surface-container-low">
          <div className="flex items-center justify-between gap-3 mb-3"><p className="font-label-mono text-[9px] uppercase flex items-center gap-2"><UserPlus className="w-3.5 h-3.5" /> Recent followers</p><span className="font-label-mono text-[8px] text-on-surface-variant">{summary?.followerCount ?? 0}</span></div>
          <div className="flex flex-wrap gap-2">{summary?.followers.length ? summary.followers.slice(0, 8).map((person) => <button key={person.id} type="button" onClick={() => openProfile(person.id)} className="group flex items-center gap-2 border-2 border-outline-variant bg-surface px-2 py-1.5 hover:bg-dc-mint"><span className="w-7 h-7 border border-outline-variant bg-dc-yellow overflow-hidden flex items-center justify-center text-[10px] font-bold">{person.avatar ? <img src={person.avatar} alt={person.name} className="w-full h-full object-cover" /> : person.name.slice(0,1)}</span><span className="font-label-mono text-[8px] uppercase max-w-[130px] truncate">{person.name}</span></button>) : <p className="font-label-mono text-[9px] uppercase text-on-surface-variant">No followers yet.</p>}</div>
        </div>
        <div className="border-2 border-outline-variant/60 p-4 bg-surface-container-low">
          <div className="flex items-center justify-between gap-3 mb-3"><p className="font-label-mono text-[9px] uppercase flex items-center gap-2"><Users className="w-3.5 h-3.5" /> Connections</p><span className="font-label-mono text-[8px] text-on-surface-variant">{summary?.connectionCount ?? 0}</span></div>
          <div className="flex flex-wrap gap-2">{summary?.connections.length ? summary.connections.slice(0, 8).map((person) => <button key={person.id} type="button" onClick={() => openProfile(person.id)} className="group flex items-center gap-2 border-2 border-outline-variant bg-surface px-2 py-1.5 hover:bg-dc-yellow"><span className="w-7 h-7 border border-outline-variant bg-dc-mint overflow-hidden flex items-center justify-center text-[10px] font-bold">{person.avatar ? <img src={person.avatar} alt={person.name} className="w-full h-full object-cover" /> : person.name.slice(0,1)}</span><span className="font-label-mono text-[8px] uppercase max-w-[130px] truncate">{person.name}</span></button>) : <p className="font-label-mono text-[9px] uppercase text-on-surface-variant">No connections yet.</p>}</div>
        </div>
      </div>
    </section>
  );
};
