import React, { useMemo, useState } from 'react';
import { ArrowRight, Check, Circle, RotateCcw, ShieldCheck, Sparkles, Terminal } from 'lucide-react';

interface Level0ActivityProps {
  onVerify: () => Promise<void> | void;
  verified: boolean;
  verifying?: boolean;
}

const architectureSteps = [
  'Browser',
  'DNS',
  'Network',
  'Server',
  'Application',
  'Database',
  'Response',
];

const shuffledSteps = ['Application', 'DNS', 'Response', 'Browser', 'Database', 'Server', 'Network'];

export const Level0Activity: React.FC<Level0ActivityProps> = ({ onVerify, verified, verifying = false }) => {
  const [ordered, setOrdered] = useState<string[]>(shuffledSteps);
  const [orderChecked, setOrderChecked] = useState(false);
  const [orderPassed, setOrderPassed] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [practicalPassed, setPracticalPassed] = useState(false);

  const answerOptions = useMemo(() => ['Runtime', 'Database', 'Network / HTTP', 'Operating System'], []);
  const practicalAnswers = {
    run: 'Runtime',
    store: 'Database',
    request: 'Network / HTTP',
    files: 'Operating System',
  };

  const move = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setOrdered(next);
    setOrderChecked(false);
    setOrderPassed(false);
  };

  const checkOrder = () => {
    const passed = ordered.every((step, index) => step === architectureSteps[index]);
    setOrderChecked(true);
    setOrderPassed(passed);
  };

  const setAnswer = (key: string, value: string) => {
    setAnswers((current) => ({ ...current, [key]: value }));
    setPracticalPassed(false);
  };

  const checkPractical = () => {
    const passed = Object.entries(practicalAnswers).every(([key, value]) => answers[key] === value);
    setPracticalPassed(passed);
  };

  const ready = orderPassed && practicalPassed;

  return (
    <div className="mt-5 space-y-4">
      <div className="border-2 border-primary/25 bg-primary/5 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 font-label-mono text-[10px] uppercase text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Guided activity
            </div>
            <h4 className="mt-1 text-base font-black">From idea to running application</h4>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-on-surface-variant">
              The 25 minutes is an estimate for learning, not a timer. Learn the model, try the interaction, then prove you understand it.
            </p>
          </div>
          <span className="dc-level0-label">~25 min</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['01', 'Learn', '~8 min'],
            ['02', 'Interact', '~10 min'],
            ['03', 'Practice', '~5 min'],
            ['04', 'Verify', '~2 min'],
          ].map(([number, label, time]) => (
            <div key={number} className="border border-outline-variant bg-surface p-2.5">
              <span className="font-label-mono text-[9px] text-primary">{number}</span>
              <div className="mt-1 text-xs font-black">{label}</div>
              <div className="font-label-mono text-[9px] text-outline">{time}</div>
            </div>
          ))}
        </div>
      </div>

      <section className="border-2 border-outline-variant bg-surface">
        <div className="border-b border-outline-variant px-4 py-3">
          <div className="font-label-mono text-[9px] uppercase text-outline">01 / Learn</div>
          <h4 className="mt-1 text-sm font-black">The layers behind a simple web request</h4>
        </div>
        <div className="grid gap-2 p-3 sm:grid-cols-7">
          {architectureSteps.map((step, index) => (
            <React.Fragment key={step}>
              <div className="border border-outline-variant bg-surface-container-low p-3 text-center">
                <div className="font-label-mono text-[9px] text-primary">0{index + 1}</div>
                <div className="mt-1 text-xs font-black">{step}</div>
              </div>
              {index < architectureSteps.length - 1 && <div className="hidden items-center justify-center sm:flex"><ArrowRight className="h-4 w-4 text-outline" /></div>}
            </React.Fragment>
          ))}
        </div>
      </section>

      <section className="border-2 border-outline-variant bg-surface">
        <div className="border-b border-outline-variant px-4 py-3">
          <div className="font-label-mono text-[9px] uppercase text-outline">02 / Interact</div>
          <h4 className="mt-1 text-sm font-black">Put the request in the right order</h4>
          <p className="mt-1 text-xs text-on-surface-variant">Move each block up or down until the browser-to-database flow is correct.</p>
        </div>
        <div className="space-y-2 p-3">
          {ordered.map((step, index) => (
            <div key={step} className="flex items-center gap-2 border border-outline-variant bg-surface-container-low p-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-outline-variant bg-surface font-label-mono text-[10px]">0{index + 1}</span>
              <span className="flex-1 text-sm font-bold">{step}</span>
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="border border-outline-variant px-2 py-1 text-xs disabled:opacity-25" aria-label={`Move ${step} up`}>↑</button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === ordered.length - 1} className="border border-outline-variant px-2 py-1 text-xs disabled:opacity-25" aria-label={`Move ${step} down`}>↓</button>
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <span className={`text-xs font-bold ${orderPassed ? 'text-tertiary' : 'text-on-surface-variant'}`}>
              {orderChecked ? (orderPassed ? '✓ Correct request flow.' : 'Not quite. Trace the request again.') : 'Try the sequence before checking.'}
            </span>
            <button type="button" onClick={checkOrder} className="border-2 border-outline bg-primary px-4 py-2 text-xs font-black uppercase">Check order</button>
          </div>
        </div>
      </section>

      <section className="border-2 border-outline-variant bg-surface">
        <div className="border-b border-outline-variant px-4 py-3">
          <div className="font-label-mono text-[9px] uppercase text-outline">03 / Practice</div>
          <h4 className="mt-1 text-sm font-black">Map the responsibility</h4>
          <p className="mt-1 text-xs text-on-surface-variant">You are building a student dashboard. Pick the layer responsible for each job.</p>
        </div>
        <div className="space-y-3 p-3">
          {[
            ['run', 'A', 'Running your JavaScript'],
            ['store', 'B', 'Storing users'],
            ['request', 'C', 'Sending requests'],
            ['files', 'D', 'Managing files and memory'],
          ].map(([key, letter, label]) => (
            <div key={key} className="grid gap-2 sm:grid-cols-[1fr_220px] sm:items-center">
              <div className="flex items-center gap-2 text-sm"><span className="flex h-7 w-7 items-center justify-center border border-outline-variant bg-primary/10 font-label-mono text-[10px]">{letter}</span>{label}</div>
              <select value={answers[key] || ''} onChange={(event) => setAnswer(key, event.target.value)} className="border border-outline-variant bg-surface px-3 py-2 text-xs font-bold text-on-surface">
                <option value="">Choose a layer</option>
                {answerOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <span className={`text-xs font-bold ${practicalPassed ? 'text-tertiary' : 'text-on-surface-variant'}`}>
              {practicalPassed ? '✓ Practical mapping is correct.' : 'Complete all four mappings.'}
            </span>
            <button type="button" onClick={checkPractical} className="border-2 border-outline bg-surface px-4 py-2 text-xs font-black uppercase"><Terminal className="mr-1 inline h-3.5 w-3.5" /> Check practice</button>
          </div>
        </div>
      </section>

      <section className={`border-2 p-4 ${ready ? 'border-tertiary/50 bg-tertiary/10' : 'border-primary/20 bg-primary/5'}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-black"><ShieldCheck className="h-4 w-4" /> Verification checkpoint</div>
            <p className="mt-1 text-xs text-on-surface-variant">{verified ? 'This sub-module is verified.' : ready ? 'Both activities passed. You can verify the sub-module.' : 'Pass the interaction and practical exercise first.'}</p>
          </div>
          <button type="button" onClick={() => void onVerify()} disabled={!ready || verified || verifying} className="border-2 border-outline bg-primary px-5 py-2.5 text-xs font-black uppercase disabled:cursor-not-allowed disabled:opacity-40">
            {verified ? <><Check className="mr-1 inline h-4 w-4" /> Verified</> : verifying ? 'Verifying…' : 'Verify sub-module'}
          </button>
        </div>
      </section>

      <button type="button" onClick={() => { setOrdered(shuffledSteps); setOrderChecked(false); setOrderPassed(false); setAnswers({}); setPracticalPassed(false); }} className="inline-flex items-center gap-2 text-[10px] font-bold uppercase text-outline hover:text-on-surface">
        <RotateCcw className="h-3.5 w-3.5" /> Reset activity
      </button>
    </div>
  );
};
