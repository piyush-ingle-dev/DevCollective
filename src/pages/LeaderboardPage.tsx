import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Trophy, Flame, Search, Share2 } from 'lucide-react';
import { DcButton } from '../components/ui/DcButton';
import { DcCard } from '../components/ui/DcCard';
import { DcSectionHeader } from '../components/ui/DcSectionHeader';

export const LeaderboardPage: React.FC = () => {
  const { user, leaderboard } = useAuth();
  const [selectedTimeframe, setSelectedTimeframe] = useState<'weekly' | 'monthly' | 'alltime'>('weekly');
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const filteredLeaderboard = leaderboard.filter((entry) => {
    const branchMatch = selectedBranch === 'All' || entry.branch === selectedBranch;
    const query = searchQuery.toLowerCase();
    return branchMatch && (!query || entry.name.toLowerCase().includes(query) || entry.college.toLowerCase().includes(query));
  });
  const branches = ['All', ...Array.from(new Set(leaderboard.map((entry) => entry.branch).filter(Boolean)))];

  return <div className="space-y-8 pb-16">
    <DcSectionHeader className="border-b-2 border-outline-variant pb-7">
      <div><div className="inline-flex items-center gap-2 bg-dc-yellow border-2 border-outline-variant px-3 py-1 mb-3"><Trophy className="w-4 h-4" /><span className="font-label-mono text-[10px] font-bold uppercase tracking-wider">Live Standings</span></div><h2 className="dc-display text-5xl sm:text-6xl">LEADERBOARD.</h2><p className="text-sm text-on-surface-variant mt-3 max-w-xl">Rankings are generated from real DevCollective activity. No users are preloaded.</p></div>
      <div className="flex bg-surface border-2 border-outline-variant w-fit">{(['weekly','monthly','alltime'] as const).map((timeframe) => <DcButton key={timeframe} type="button" onClick={() => setSelectedTimeframe(timeframe)} variant={selectedTimeframe === timeframe ? 'primary' : 'secondary'} className="px-4 py-2">{timeframe}</DcButton>)}</div>
    </DcSectionHeader>

    {user && <DcCard shadow="md" className="p-6"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5"><div className="flex items-center gap-4">{user.avatar ? <img src={user.avatar} alt={user.name} className="w-16 h-16 border-2 border-outline-variant object-cover" /> : <div className="w-16 h-16 border-2 border-outline-variant bg-dc-blue flex items-center justify-center font-bold">{user.name.slice(0,1)}</div>}<div><h3 className="font-bold text-lg">{user.name}</h3><p className="font-label-mono text-[10px] uppercase text-on-surface-variant">LEVEL {user.level} · {user.branch || 'BRANCH NOT SET'}</p><p className="font-label-mono text-[10px] text-on-surface-variant">{user.rep.toLocaleString()} REP · {user.streakDays}d <Flame className="inline w-3 h-3" /></p></div></div><DcButton type="button" variant="secondary" className="px-5 py-3"><Share2 className="w-4 h-4" /> Share Rank</DcButton></div></DcCard>}

    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"><div className="flex flex-wrap gap-2">{branches.map((branch) => <DcButton key={branch} type="button" onClick={() => setSelectedBranch(branch)} variant={selectedBranch === branch ? 'primary' : 'secondary'} className="px-3 py-2">{branch}</DcButton>)}</div><div className="relative w-full sm:w-72"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" /><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search real members..." className="w-full bg-surface border-2 border-outline-variant pl-9 pr-4 py-3 text-xs font-label-mono" /></div></div>

    <section className="border-2 border-outline-variant bg-surface overflow-hidden dc-shadow-md">{filteredLeaderboard.length === 0 ? <div className="border-dashed p-12 text-center"><Trophy className="w-8 h-8 mx-auto mb-4 text-dc-yellow" /><h3 className="dc-display text-3xl">NO RANKINGS YET.</h3><p className="text-sm text-on-surface-variant mt-3 max-w-md mx-auto">The leaderboard will populate when real members earn REP. Your account starts at 0 REP and is never assigned a fake rank.</p></div> : <div className="overflow-x-auto"><table className="w-full text-left"><thead className="border-b-2 border-outline-variant font-label-mono text-[10px] uppercase text-on-surface-variant"><tr><th className="p-4">Rank</th><th className="p-4">Developer</th><th className="p-4">Branch</th><th className="p-4">REP</th><th className="p-4 text-right">Streak</th></tr></thead><tbody className="divide-y divide-outline-variant/30">{filteredLeaderboard.map((entry) => <tr key={entry.id} className={entry.isUser ? 'bg-primary/10' : ''}><td className="p-4 font-bold text-primary">#{entry.rank}</td><td className="p-4"><div className="flex items-center gap-3">{entry.avatar ? <img src={entry.avatar} alt={entry.name} className="w-9 h-9 border border-outline-variant object-cover" /> : <div className="w-9 h-9 border border-outline-variant bg-dc-blue flex items-center justify-center text-xs">{entry.name.slice(0,1)}</div>}<div><p className="font-bold">{entry.name}</p><p className="text-[10px] text-on-surface-variant font-label-mono">{entry.college}</p></div></div></td><td className="p-4 font-label-mono text-xs">{entry.branch}</td><td className="p-4 font-bold">{entry.rep.toLocaleString()}</td><td className="p-4 text-right font-label-mono text-xs">{entry.streakDays}d</td></tr>)}</tbody></table></div>}</section>
  </div>;
};
