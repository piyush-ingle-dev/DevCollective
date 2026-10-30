import React, { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Level0Gate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, setActiveTab, activeTab } = useAuth();
  const [loading, setLoading] = useState(true);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadProgress = async () => {
      if (!user) { setComplete(false); setLoading(false); return; }
      setLoading(true);
      try {
        const response = await fetch('/api/learning/level-0');
        if (!response.ok) { setComplete(false); return; }
        const data = await response.json();
        const levelProgress = data.levelProgress;
        const isComplete = Boolean(levelProgress?.completed_at || levelProgress?.completedAt);
        if (!cancelled) setComplete(isComplete);
      } catch (error) {
        console.error('Failed to load Level 0 gate state:', error);
        if (!cancelled) setComplete(false);
      } finally { if (!cancelled) setLoading(false); }
    };
    void loadProgress();
    return () => { cancelled = true; };
  }, [user, activeTab]);

  if (loading || !user || complete || activeTab === 'level-0') return <>{children}</>;

  return <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/95 p-6 backdrop-blur-md"><div className="w-full max-w-2xl rounded-3xl border-2 border-primary/30 bg-surface-container p-7 shadow-2xl sm:p-9"><div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase text-primary font-label-mono"><LockKeyhole className="h-3.5 w-3.5" /> Level 0 Required</div><div className="mt-5 flex items-start gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary"><BookOpen className="h-7 w-7" /></div><div><h2 className="text-3xl font-black text-white">Complete your CSE foundation first.</h2><p className="mt-2 text-sm leading-relaxed text-on-surface-variant">Level 0 is mandatory for every student. Finish all six foundation modules before continuing to specialization and later progression.</p></div></div><div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-outline-variant bg-surface p-4"><div className="text-2xl font-black text-white">6</div><div className="mt-1 text-[10px] uppercase text-outline font-label-mono">Modules</div></div><div className="rounded-2xl border border-outline-variant bg-surface p-4"><div className="text-2xl font-black text-white">∞</div><div className="mt-1 text-[10px] uppercase text-outline font-label-mono">Practice</div></div><div className="rounded-2xl border border-outline-variant bg-surface p-4"><div className="text-2xl font-black text-primary">✓</div><div className="mt-1 text-[10px] uppercase text-outline font-label-mono">Verified checkpoints</div></div></div><button type="button" onClick={() => setActiveTab('level-0')} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-6 py-4 text-sm font-bold uppercase text-white font-label-mono">Enter Level 0 <ArrowRight className="h-5 w-5" /></button><div className="mt-4 flex items-center justify-center gap-2 text-[10px] uppercase text-outline font-label-mono"><ShieldCheck className="h-3.5 w-3.5" /> Your access state is re-evaluated from stored progress</div></div></div>;
};
