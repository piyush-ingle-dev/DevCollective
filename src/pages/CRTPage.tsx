import React, { useCallback, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { loadJson, saveJson } from '../lib/aiClient';
import { AptitudeTest, AptitudeResult } from '../components/crt/AptitudeTest';
import { InterviewRound, InterviewKind, InterviewResult } from '../components/crt/InterviewRound';

type Module = 'home' | 'aptitude' | 'hr' | 'technical' | 'camera';
type Saved = Partial<Record<'aptitude' | InterviewKind, { label: string; date: number }>>;

const ROUNDS: { id: Exclude<Module, 'home'>; title: string; desc: string }[] = [
  { id: 'aptitude', title: 'Aptitude test', desc: '15 timed questions on quantitative, logical and verbal skills. Switching tabs during the test is flagged.' },
  { id: 'hr', title: 'HR round', desc: 'Five common HR questions. You answer in text or voice and get a score and feedback on each answer.' },
  { id: 'technical', title: 'Technical interview', desc: 'Five questions from your own domain, scored with hints on what you missed.' },
  { id: 'camera', title: 'Camera mock interview', desc: 'Answer by voice on camera. You get a report on eye contact, face position, filler words and answer quality.' },
];

export const CRTPage: React.FC = () => {
  const { user } = useAuth();
  const uid = user?.id || null;
  const resultsKey = uid ? `devcollective_crt_results_${uid}` : null;
  const [module, setModule] = useState<Module>('home');
  const [saved, setSaved] = useState<Saved>(() => loadJson<Saved>(resultsKey, {}));

  const roadmap = useMemo(() => loadJson<any>(uid ? `devcollective_ai_roadmap_${uid}` : null, null), [uid]);
  const domain = roadmap?.roadmapTitle || roadmap?.targetRole || '';

  const checks = useMemo(() => [
    { label: 'Profile completed', done: !!(user as any)?.hasCompletedOnboarding },
    { label: 'Roadmap generated', done: !!roadmap },
    { label: 'Project started', done: !!loadJson<any>(uid ? `devcollective_project_plan_${uid}` : null, null) },
    { label: 'First project phase finished', done: (loadJson<any>(uid ? `devcollective_project_progress_${uid}` : null, { completedPhases: 0 }).completedPhases || 0) > 0 },
  ], [user, uid, roadmap]);
  const ready = checks.filter((c) => c.done).length;

  const remember = useCallback((key: 'aptitude' | InterviewKind, label: string) => {
    setSaved((prev) => { const next = { ...prev, [key]: { label, date: Date.now() } }; saveJson(resultsKey, next); return next; });
  }, [resultsKey]);
  const onApt = useCallback((r: AptitudeResult) => remember('aptitude', `${r.score}/${r.total} (${r.percent}%)`), [remember]);
  const onInterview = useCallback((r: InterviewResult) => remember(r.kind, `${r.average}/10 average`), [remember]);
  const back = () => setModule('home');

  if (module === 'aptitude') return <div className="pb-16"><AptitudeTest onFinish={onApt} onExit={back} /></div>;
  if (module === 'hr' || module === 'technical' || module === 'camera') return <div className="pb-16"><InterviewRound kind={module} defaultDomain={domain} level={undefined} onFinish={onInterview} onExit={back} /></div>;

  return (
    <div className="space-y-8 pb-16 max-w-3xl">
      <div>
        <h2 className="font-headline-lg text-3xl sm:text-4xl font-bold text-on-surface mb-2">CRT</h2>
        <p className="text-on-surface-variant text-base">Campus recruitment training. Practise the same rounds companies use when they hire from campus.</p>
      </div>

      <section className="bg-surface-container border-2 border-outline-variant rounded-[18px] p-6">
        <h3 className="font-bold text-on-surface mb-3">Your preparation ({ready} of {checks.length} done)</h3>
        <ul className="space-y-2">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center gap-3 text-sm">
              <span className={`w-5 h-5 rounded-full border-2 border-outline-variant flex items-center justify-center ${c.done ? 'bg-secondary-container text-on-secondary' : ''}`}>{c.done && <Check className="w-3 h-3" />}</span>
              <span className={c.done ? 'text-on-surface' : 'text-on-surface-variant'}>{c.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="font-bold text-on-surface mb-4">Practice rounds</h3>
        <ul className="divide-y-2 divide-outline-variant border-y-2 border-outline-variant">
          {ROUNDS.map((r) => (
            <li key={r.id} className="py-4 flex flex-wrap items-center gap-4">
              <div className="min-w-0 flex-1 basis-64"><p className="font-bold text-on-surface">{r.title}</p><p className="text-sm text-on-surface-variant mt-0.5">{r.desc}</p>{saved[r.id] && <p className="text-xs text-on-surface-variant mt-1">Last result: {saved[r.id]!.label}, {new Date(saved[r.id]!.date).toLocaleDateString()}</p>}</div>
              <button onClick={() => setModule(r.id)} className="px-5 py-2.5 rounded-xl bg-primary-container text-on-primary border-2 border-outline-variant font-bold text-sm hover:brightness-95">{saved[r.id] ? 'Practise again' : 'Start'}</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
