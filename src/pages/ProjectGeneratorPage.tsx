import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Lock, ImagePlus, Loader2, X, PanelLeftClose, PanelLeftOpen, MessagesSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AiChatPanel, renderFormattedText } from '../components/AiChatPanel';
import { fileToChatImage, loadJson, postJson, saveJson, ChatImagePayload } from '../lib/aiClient';

interface Phase { title: string; goal: string; tasks: string[]; youWillLearn: string; checkpoint: string; xp: number }
interface ProjectPlan { title: string; tagline?: string; problemStatement: string; whoItHelps?: string; expectedOutput: string; difficulty?: string; whyRecruitersCare?: string; techStack: string[]; architecture: string; phases: Phase[] }
interface Progress { completedPhases: number; doneTasks: Record<string, boolean>; rep: number }

const EMPTY: Progress = { completedPhases: 0, doneTasks: {}, rep: 0 };
const WELCOME = "Hi, I help you build a real project one small phase at a time. Each phase you finish earns REP, and you end up with something recruiters want to see.\n\nAsk me for ideas, or pick one of the suggestions below.";

// The inner page is keyed by user id, so every account gets its own saved plan and chat.
export const ProjectGeneratorPage: React.FC = () => {
  const { user } = useAuth();
  return <ProjectGenerator key={user?.id || 'guest'} />;
};

const ProjectGenerator: React.FC = () => {
  const { user, awardRep } = useAuth();
  const uid = user?.id || null;
  const planKey = uid ? `devcollective_project_plan_${uid}` : null;
  const progKey = uid ? `devcollective_project_progress_${uid}` : null;
  const reviewKey = uid ? `devcollective_project_review_${uid}` : null;
  const roadmap = useMemo(() => loadJson<any>(uid ? `devcollective_ai_roadmap_${uid}` : null, null), [uid]);

  // State starts from what is saved, and is saved again on every change.
  const [plan, setPlan] = useState<ProjectPlan | null>(() => loadJson<ProjectPlan | null>(planKey, null));
  const [progress, setProgress] = useState<Progress>(() => { const p: any = loadJson<any>(progKey, EMPTY); return { completedPhases: p.completedPhases || 0, doneTasks: p.doneTasks || {}, rep: p.rep ?? p.xp ?? 0 }; });
  const [tab, setTab] = useState<'board' | 'review'>('board');
  const [tipFor, setTipFor] = useState<number | null>(null);
  const agentKey = 'devcollective_project_agent_open';
  const [agentOpen, setAgentOpenState] = useState<boolean>(() => loadJson<boolean>(agentKey, true));
  const setAgentOpen = (v: boolean) => { setAgentOpenState(v); saveJson(agentKey, v); };
  useEffect(() => { saveJson(progKey, progress); }, [progress, progKey]);

  const onData = (data: any) => {
    if (data?.plan?.phases?.length) { setPlan(data.plan); saveJson(planKey, data.plan); setProgress(EMPTY); setTab('board'); }
  };

  const toggleTask = (pi: number, ti: number) => { if (pi !== progress.completedPhases) return; const k = `${pi}-${ti}`; setProgress((p) => ({ ...p, doneTasks: { ...p.doneTasks, [k]: !p.doneTasks[k] } })); };
  const phaseReady = (pi: number) => !!plan && plan.phases[pi].tasks.every((_, ti) => progress.doneTasks[`${pi}-${ti}`]);
  // Real REP is added to the profile once per phase of a project. The list of paid phases is kept so redoing a project does not pay twice.
  const paidKey = uid ? `devcollective_project_rep_paid_${uid}` : null;
  const completePhase = (pi: number) => {
    if (!plan || pi !== progress.completedPhases || !phaseReady(pi)) return;
    const reward = plan.phases[pi].xp || 100;
    const paid = loadJson<string[]>(paidKey, []); const id = `${plan.title}|${pi}`;
    if (!paid.includes(id)) { saveJson(paidKey, [...paid, id]); void awardRep(reward); }
    setProgress((p) => ({ ...p, completedPhases: p.completedPhases + 1, rep: p.rep + reward }));
  };
  const resetProject = () => { if (!window.confirm('Start a new project? Your current plan and project REP will be cleared.')) return; setPlan(null); setProgress(EMPTY); saveJson(planKey, null); };

  const buildContext = () => ({
    profile: user ? { name: user.name, branch: user.branch, academicYear: user.academicYear, skills: (user as any).skills, rep: user.rep, level: user.level } : undefined,
    roadmap,
    project: plan ? { title: plan.title, completedPhases: progress.completedPhases, totalPhases: plan.phases.length } : undefined,
    plan,
  });

  // ---- review
  const [desc, setDesc] = useState(''); const [repo, setRepo] = useState('');
  const [shot, setShot] = useState<ChatImagePayload | null>(null);
  const [reviewing, setReviewing] = useState(false); const [reviewErr, setReviewErr] = useState<string | null>(null);
  const [review, setReview] = useState<string>(() => loadJson<string>(reviewKey, ''));
  const fileRef = useRef<HTMLInputElement>(null);
  const runReview = async () => {
    if (!desc.trim() && !repo.trim() && !shot) { setReviewErr('Add a short description, a GitHub link, or a screenshot first.'); return; }
    setReviewing(true); setReviewErr(null);
    try {
      const data = await postJson<{ reply: string }>('/api/ai/project-review', { message: desc.trim() || 'Please review my project.', repoUrl: repo.trim(), context: buildContext(), image: shot ? { mimeType: shot.mimeType, data: shot.data } : undefined });
      setReview(data.reply); saveJson(reviewKey, data.reply);
    } catch (e: any) { setReviewErr(e.message); } finally { setReviewing(false); }
  };

  const card = 'bg-surface-container border-2 border-outline-variant rounded-[18px]';
  const label = 'text-xs font-bold text-on-surface-variant mb-1';
  const total = plan?.phases.length || 0;

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h2 className="font-headline-lg text-3xl sm:text-4xl font-bold text-on-surface mb-2">Project Generator</h2>
          <p className="text-on-surface-variant text-base">Pick a project that matches what companies hire for, build it one small phase at a time, then ask for a review of your work.</p>
        </div>
        <div className={`${card} px-5 py-4 min-w-[14rem]`}>
          <p className="text-sm text-on-surface"><span className="text-2xl font-black">{progress.rep}</span> REP earned from projects</p>
          {plan && <><div className="mt-2 h-2 rounded-full bg-surface-container-highest border border-outline-variant overflow-hidden"><div className="h-full bg-primary-container transition-all" style={{ width: `${(progress.completedPhases / total) * 100}%` }} /></div><p className="mt-1.5 text-xs text-on-surface-variant">{progress.completedPhases} of {total} phases finished</p></>}
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-6 items-start ${agentOpen ? 'xl:grid-cols-5' : 'xl:grid-cols-[76px_minmax(0,1fr)]'}`}>
        {/* Agent panel: collapses to a narrow rail, the same way the main sidebar does */}
        <div className={`${card} overflow-hidden ${agentOpen ? 'xl:col-span-2' : ''}`}>
          {!agentOpen && (
            <div className="flex xl:flex-col items-center gap-3 p-3">
              <button onClick={() => setAgentOpen(true)} title="Open project agent" aria-label="Open project agent" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-outline-variant/60 text-on-surface-variant transition-colors hover:border-primary/50 hover:bg-surface-container-high hover:text-primary"><PanelLeftOpen className="h-4 w-4" /></button>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant" aria-hidden="true"><MessagesSquare className="h-[18px] w-[18px]" /></span>
              <span className="text-sm font-bold text-on-surface xl:hidden">Project agent</span>
            </div>
          )}
          <div className={agentOpen ? '' : 'hidden'}>
            <div className="px-5 py-4 border-b-2 border-outline-variant bg-surface-container-low flex items-start justify-between gap-3">
              <div className="min-w-0"><h3 className="font-bold text-on-surface">Project agent</h3><p className="text-xs text-on-surface-variant">Finishing a phase adds REP to your profile. Ask for ideas and pick one. Photos and voice work. Shift+Enter adds a new line. Your chat is saved.</p></div>
              <button onClick={() => setAgentOpen(false)} title="Collapse project agent" aria-label="Collapse project agent" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-outline-variant/60 text-on-surface-variant transition-colors hover:border-primary/50 hover:bg-surface-container-high hover:text-primary"><PanelLeftClose className="h-4 w-4" /></button>
            </div>
            <AiChatPanel heightClass="h-[36rem]" storageKey={uid ? `devcollective_projectgen_chat_${uid}` : null} welcome={WELCOME} endpoint="/api/ai/project-chat" buildContext={buildContext} onData={onData} placeholder="Ask for ideas or answer the agent"
              suggestions={['Suggest 3 project ideas for my roadmap', 'Give me a beginner warm-up project', 'Show me a job-ready idea']} />
          </div>
        </div>

        <div className={`min-w-0 space-y-4 ${agentOpen ? 'xl:col-span-3' : ''}`}>
          <div className="flex gap-2 border-b-2 border-outline-variant">
            {([['board', 'Project board'], ['review', 'Project review']] as const).map(([id, text]) => (
              <button key={id} onClick={() => setTab(id)} className={`px-4 py-2.5 text-sm font-bold -mb-0.5 border-b-4 transition-colors ${tab === id ? 'border-primary text-on-surface' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>{text}</button>
            ))}
          </div>

          {tab === 'board' && (!plan ? (
            <div className={`${card} p-8`}>
              <h3 className="text-xl font-bold text-on-surface mb-1">No project yet</h3>
              <p className="text-sm text-on-surface-variant max-w-md">Tell the agent what you want to build. When you choose an idea, the problem statement, phases and tasks show up here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`${card} p-6 space-y-5`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><h3 className="text-2xl font-bold text-on-surface">{plan.title}</h3>{plan.tagline && <p className="text-sm text-on-surface-variant mt-0.5">{plan.tagline}</p>}{plan.difficulty && <p className="text-xs text-on-surface-variant mt-1">Difficulty: {plan.difficulty}</p>}</div>
                  <button onClick={resetProject} className="text-sm font-bold text-on-surface-variant underline underline-offset-4 hover:text-on-surface">Start a new project</button>
                </div>
                <div className="grid sm:grid-cols-2 gap-6 text-sm">
                  <div><p className={label}>The problem</p><p className="text-on-surface leading-relaxed">{plan.problemStatement}</p>{plan.whoItHelps && <p className="text-on-surface-variant mt-2">Who it helps: {plan.whoItHelps}</p>}</div>
                  <div><p className={label}>What you will have at the end</p><p className="text-on-surface leading-relaxed">{plan.expectedOutput}</p>{plan.whyRecruitersCare && <p className="text-on-surface-variant mt-2">Why recruiters care: {plan.whyRecruitersCare}</p>}</div>
                </div>
                <div className="text-sm"><p className={label}>Tech stack</p><p className="text-on-surface">{plan.techStack.join(', ')}</p></div>
                <div className="text-sm space-y-0.5"><p className={label}>How it fits together</p><div className="text-on-surface">{renderFormattedText(plan.architecture)}</div></div>
              </div>

              <div className={`grid gap-4 items-start ${agentOpen ? '' : '2xl:grid-cols-2'}`}>
              {plan.phases.map((ph, pi) => {
                const done = pi < progress.completedPhases; const current = pi === progress.completedPhases; const locked = pi > progress.completedPhases;
                return (
                  <div key={pi} className={`${card} p-5 ${locked ? 'opacity-60' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 shrink-0 rounded-full border-2 border-outline-variant flex items-center justify-center text-sm font-black ${done ? 'bg-secondary-container text-on-secondary' : current ? 'bg-primary-container text-on-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>{done ? <Check className="w-4 h-4" /> : locked ? <Lock className="w-3.5 h-3.5" /> : pi + 1}</div>
                      <div className="min-w-0 flex-1"><h4 className="font-bold text-on-surface">{ph.title}</h4><p className="text-xs text-on-surface-variant">{done ? 'Finished' : current ? 'Current phase' : 'Locked until the previous phase is finished'}</p></div>
                      <span className="text-sm font-bold text-on-surface whitespace-nowrap">{ph.xp} REP</span>
                    </div>
                    {!locked && (
                      <div className="mt-4 space-y-3">
                        <p className="text-sm text-on-surface-variant">{ph.goal}</p>
                        <ul className="space-y-2">{ph.tasks.map((t, ti) => { const on = done || !!progress.doneTasks[`${pi}-${ti}`]; return (
                          <li key={ti}><label className={`flex items-start gap-3 p-3 rounded-xl border border-outline-variant/60 bg-surface-container-low ${current ? 'cursor-pointer hover:border-primary' : ''}`}><input type="checkbox" checked={on} disabled={!current} onChange={() => toggleTask(pi, ti)} className="mt-0.5 w-4 h-4" /><span className={`text-sm ${on ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>{t}</span></label></li>); })}</ul>
                        <p className="text-sm text-on-surface-variant"><strong className="text-on-surface">You will learn:</strong> {ph.youWillLearn}</p>
                        {current && (
                          <div className="flex flex-wrap items-center gap-3">
                            <button onClick={() => setTipFor(tipFor === pi ? null : pi)} className="text-sm font-bold text-on-surface-variant underline underline-offset-4 hover:text-on-surface">{tipFor === pi ? 'Hide checkpoint question' : 'Show checkpoint question'}</button>
                            <button disabled={!phaseReady(pi)} onClick={() => completePhase(pi)} className="ml-auto px-5 py-2.5 rounded-xl bg-primary-container text-on-primary border-2 border-outline-variant font-bold text-sm disabled:opacity-50 hover:brightness-95">{phaseReady(pi) ? `Finish phase and earn ${ph.xp} REP` : 'Tick every task to finish this phase'}</button>
                          </div>
                        )}
                        {current && tipFor === pi && <div className="p-3 rounded-xl bg-tertiary-container text-on-tertiary border border-outline-variant text-sm">{ph.checkpoint}<p className="text-xs mt-1">Type your answer in the chat and the agent will check it.</p></div>}
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            </div>
          ))}

          {tab === 'review' && (
            <div className={`${card} p-6 space-y-4`}>
              <div><h3 className="text-xl font-bold text-on-surface">Review my project</h3><p className="text-sm text-on-surface-variant">Describe what you built. The agent explains how it is made, what is good, what to improve and what to do next.</p></div>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={5} placeholder="What does it do, which tools did you use, and which part are you unsure about?" className="w-full bg-surface-container-lowest border-2 border-outline-variant rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary" />
              <input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="GitHub link (optional, public repositories only)" className="w-full bg-surface-container-lowest border-2 border-outline-variant rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary" />
              <div className="flex flex-wrap items-center gap-3">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { try { setShot(await fileToChatImage(f)); } catch (er: any) { setReviewErr(er.message); } } }} />
                <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-outline-variant text-sm font-bold text-on-surface hover:bg-surface-container-high"><ImagePlus className="w-4 h-4" />Add a screenshot</button>
                {shot && <div className="relative"><img src={shot.preview} alt="screenshot" className="h-12 rounded-lg border border-outline-variant" /><button onClick={() => setShot(null)} aria-label="Remove screenshot" className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-surface-container-highest border border-outline-variant flex items-center justify-center"><X className="w-3 h-3" /></button></div>}
                <button onClick={runReview} disabled={reviewing} className="ml-auto px-6 py-2.5 rounded-xl bg-primary-container text-on-primary border-2 border-outline-variant font-bold text-sm disabled:opacity-60 flex items-center gap-2 hover:brightness-95">{reviewing ? <><Loader2 className="w-4 h-4 animate-spin" />Reviewing</> : 'Review my project'}</button>
              </div>
              {reviewErr && <div className="p-3 rounded-xl bg-error-container text-on-error border border-outline-variant text-sm">{reviewErr}</div>}
              {review && <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/60 text-sm text-on-surface space-y-0.5 leading-relaxed">{renderFormattedText(review)}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};