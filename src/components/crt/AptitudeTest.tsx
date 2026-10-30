import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { postJson } from '../../lib/aiClient';

interface Q { category: string; question: string; options: string[]; answerIndex: number; explanation: string }
export interface AptitudeResult { score: number; total: number; percent: number; switches: number; byCategory: Record<string, { right: number; total: number }>; date: number }

const DURATION_SECONDS = 15 * 60;
const MAX_SWITCHES = 3;
const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export const AptitudeTest: React.FC<{ onFinish: (r: AptitudeResult) => void; onExit: () => void }> = ({ onFinish, onExit }) => {
  const [stage, setStage] = useState<'intro' | 'loading' | 'test' | 'result'>('intro');
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(DURATION_SECONDS);
  const [switches, setSwitches] = useState(0);
  const [warn, setWarn] = useState<string | null>(null);
  const [result, setResult] = useState<AptitudeResult | null>(null);
  const finished = useRef(false);
  const answersRef = useRef<(number | null)[]>([]);
  answersRef.current = answers;

  const start = async () => {
    setStage('loading'); setError(null);
    try {
      const data = await postJson<{ questions: Q[] }>('/api/crt/aptitude', {});
      setQuestions(data.questions); setAnswers(data.questions.map(() => null));
      setIndex(0); setSecondsLeft(DURATION_SECONDS); setSwitches(0); finished.current = false; setStage('test');
    } catch (e: any) { setError(e.message); setStage('intro'); }
  };

  const submit = useCallback((forcedSwitches?: number) => {
    if (finished.current) return; finished.current = true;
    const ans = answersRef.current;
    const byCategory: AptitudeResult['byCategory'] = {}; let right = 0;
    questions.forEach((q, i) => { const c = (byCategory[q.category] ||= { right: 0, total: 0 }); c.total++; if (ans[i] === q.answerIndex) { c.right++; right++; } });
    const r: AptitudeResult = { score: right, total: questions.length, percent: Math.round((right / Math.max(1, questions.length)) * 100), switches: forcedSwitches ?? switches, byCategory, date: Date.now() };
    setResult(r); setStage('result'); onFinish(r);
  }, [questions, switches, onFinish]);

  // timer
  useEffect(() => {
    if (stage !== 'test') return;
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [stage]);
  useEffect(() => { if (stage === 'test' && secondsLeft <= 0) submit(); }, [secondsLeft, stage, submit]);

  // tab-switch detection
  useEffect(() => {
    if (stage !== 'test') return;
    const flag = () => {
      setSwitches((n) => {
        const next = n + 1;
        if (next >= MAX_SWITCHES) { setWarn('You left the test too many times. It has been submitted.'); setTimeout(() => submit(next), 0); }
        else setWarn(`You left the test window. Warning ${next} of ${MAX_SWITCHES - 1}. The test is submitted automatically on the ${MAX_SWITCHES}rd time.`);
        return next;
      });
    };
    const onVis = () => { if (document.hidden) flag(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [stage, submit]);

  const card = 'bg-surface-container border-2 border-outline-variant rounded-[18px] p-6';
  if (stage === 'intro' || stage === 'loading') return (
    <div className={`${card} space-y-4 max-w-2xl`}>
      <h3 className="text-xl font-bold text-on-surface">Aptitude test</h3>
      <ul className="text-sm text-on-surface-variant space-y-1.5 list-disc pl-5">
        <li>15 questions: 5 quantitative, 5 logical, 5 verbal.</li>
        <li>You get 15 minutes. The test is submitted when the time ends.</li>
        <li>Stay on this tab. Leaving it counts as a warning, and the third time submits the test.</li>
      </ul>
      {error && <div className="p-3 rounded-xl bg-error-container text-on-error border border-outline-variant text-sm">{error}</div>}
      <div className="flex gap-3">
        <button onClick={start} disabled={stage === 'loading'} className="px-6 py-2.5 rounded-xl bg-primary-container text-on-primary border-2 border-outline-variant font-bold text-sm flex items-center gap-2 disabled:opacity-60">{stage === 'loading' ? <><Loader2 className="w-4 h-4 animate-spin" />Getting questions</> : 'Start the test'}</button>
        <button onClick={onExit} className="px-4 py-2.5 text-sm font-bold text-on-surface-variant underline underline-offset-4">Back to CRT</button>
      </div>
    </div>
  );

  if (stage === 'result' && result) return (
    <div className="space-y-4 max-w-3xl">
      <div className={card}>
        <h3 className="text-xl font-bold text-on-surface">Your result</h3>
        <p className="mt-2 text-4xl font-black text-on-surface">{result.score}<span className="text-xl text-on-surface-variant"> / {result.total}</span> <span className="text-xl font-bold text-on-surface-variant">({result.percent}%)</span></p>
        <div className="mt-4 grid sm:grid-cols-3 gap-3 text-sm">{(Object.entries(result.byCategory) as [string, { right: number; total: number }][]).map(([k, v]) => <div key={k} className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/60"><p className="text-on-surface-variant">{k}</p><p className="font-bold text-on-surface">{v.right} of {v.total} correct</p></div>)}</div>
        <p className="mt-3 text-sm text-on-surface-variant">Tab switches during the test: {result.switches}</p>
        <div className="mt-4 flex gap-3"><button onClick={() => setStage('intro')} className="px-5 py-2.5 rounded-xl bg-primary-container text-on-primary border-2 border-outline-variant font-bold text-sm">Try again with new questions</button><button onClick={onExit} className="px-4 py-2.5 text-sm font-bold text-on-surface-variant underline underline-offset-4">Back to CRT</button></div>
      </div>
      <div className="space-y-3">{questions.map((q, i) => { const ok = answers[i] === q.answerIndex; return (
        <div key={i} className={`${card} !p-5`}>
          <p className="text-xs text-on-surface-variant">{q.category}</p>
          <p className="font-bold text-on-surface mt-0.5">{i + 1}. {q.question}</p>
          <p className="text-sm mt-2 text-on-surface">Your answer: <strong>{answers[i] === null ? 'Not answered' : q.options[answers[i] as number]}</strong> {ok ? '(correct)' : '(wrong)'}</p>
          {!ok && <p className="text-sm text-on-surface">Correct answer: <strong>{q.options[q.answerIndex]}</strong></p>}
          <p className="text-sm text-on-surface-variant mt-1">{q.explanation}</p>
        </div>); })}</div>
    </div>
  );

  const q = questions[index]; const answered = answers.filter((a) => a !== null).length;
  return (
    <div className="space-y-4 max-w-3xl">
      {warn && <div className="flex items-start gap-2 p-3 rounded-xl bg-error-container text-on-error border-2 border-outline-variant text-sm"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span>{warn}</span></div>}
      <div className={`${card} !p-4 flex items-center justify-between text-sm`}>
        <span className="text-on-surface-variant">Question {index + 1} of {questions.length} ({answered} answered)</span>
        <span className={`font-black text-lg ${secondsLeft < 60 ? 'text-on-surface underline' : 'text-on-surface'}`}>{fmt(Math.max(0, secondsLeft))}</span>
      </div>
      <div className={card}>
        <p className="text-xs text-on-surface-variant">{q.category}</p>
        <p className="text-lg font-bold text-on-surface mt-1">{q.question}</p>
        <div className="mt-4 space-y-2">{q.options.map((o, oi) => (
          <label key={oi} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer ${answers[index] === oi ? 'border-primary bg-primary-container text-on-primary' : 'border-outline-variant/60 bg-surface-container-low text-on-surface hover:border-primary'}`}>
            <input type="radio" name={`q${index}`} checked={answers[index] === oi} onChange={() => setAnswers((a) => a.map((x, i) => (i === index ? oi : x)))} className="w-4 h-4" /><span className="text-sm">{o}</span>
          </label>))}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button disabled={index === 0} onClick={() => setIndex((i) => i - 1)} className="px-4 py-2 rounded-xl border-2 border-outline-variant text-sm font-bold text-on-surface disabled:opacity-40">Previous</button>
        {index < questions.length - 1 ? <button onClick={() => setIndex((i) => i + 1)} className="px-4 py-2 rounded-xl border-2 border-outline-variant text-sm font-bold text-on-surface">Next</button> : null}
        <div className="flex flex-wrap gap-1.5 mx-2">{questions.map((_, i) => <button key={i} onClick={() => setIndex(i)} aria-label={`Go to question ${i + 1}`} className={`w-7 h-7 rounded-md text-xs font-bold border ${i === index ? 'bg-primary-container text-on-primary border-outline-variant' : answers[i] !== null ? 'bg-secondary-container text-on-secondary border-outline-variant' : 'border-outline-variant/60 text-on-surface-variant'}`}>{i + 1}</button>)}</div>
        <button onClick={() => { if (answered < questions.length && !window.confirm(`You have ${questions.length - answered} unanswered questions. Submit anyway?`)) return; submit(); }} className="ml-auto px-5 py-2.5 rounded-xl bg-primary-container text-on-primary border-2 border-outline-variant font-bold text-sm">Submit test</button>
      </div>
    </div>
  );
};
