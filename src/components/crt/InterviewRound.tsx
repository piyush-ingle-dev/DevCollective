import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Mic, Square, Video, AlertCircle } from 'lucide-react';
import { postJson } from '../../lib/aiClient';
import { renderFormattedText } from '../AiChatPanel';

export type InterviewKind = 'hr' | 'technical' | 'camera';
interface Evaluation { score: number; verdict: string; strengths: string[]; improvements: string[]; betterAnswer: string }
interface Round { question: string; answer: string; evaluation: Evaluation; eyeContact?: number; faceInFrame?: number; wpm?: number; fillers?: number }
export interface InterviewResult { kind: InterviewKind; average: number; rounds: number; date: number }

const TOTAL = 5;
const FILLERS = ['um', 'uh', 'like', 'basically', 'actually', 'you know', 'i mean', 'sort of', 'kind of'];
const countFillers = (text: string) => { const t = ` ${text.toLowerCase().replace(/[^a-z' ]/g, ' ')} `; return FILLERS.reduce((n, f) => n + (t.split(` ${f} `).length - 1), 0); };

const MP_VERSION = '0.10.14';
let landmarkerPromise: Promise<any> | null = null;
// Face tracking runs fully in the browser. The model is downloaded once from Google's CDN.
function loadLandmarker(): Promise<any> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision: any = await import(/* @vite-ignore */ `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/vision_bundle.mjs`);
      const files = await vision.FilesetResolver.forVisionTasks(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`);
      return vision.FaceLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task' },
        runningMode: 'VIDEO', outputFaceBlendshapes: true, numFaces: 1,
      });
    })().catch((e) => { landmarkerPromise = null; throw e; });
  }
  return landmarkerPromise;
}

interface Props { kind: InterviewKind; defaultDomain: string; level?: string; onFinish: (r: InterviewResult) => void; onExit: () => void }

export const InterviewRound: React.FC<Props> = ({ kind, defaultDomain, level, onFinish, onExit }) => {
  const apiType = kind === 'technical' ? 'technical' : 'hr';
  const [stage, setStage] = useState<'setup' | 'loading' | 'answering' | 'evaluating' | 'feedback' | 'summary'>('setup');
  const [domain, setDomain] = useState(defaultDomain);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [rounds, setRounds] = useState<Round[]>([]);
  const [current, setCurrent] = useState<Round | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [camState, setCamState] = useState<'off' | 'starting' | 'on' | 'failed'>('off');
  const [trackingOk, setTrackingOk] = useState<boolean | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recogRef = useRef<any>(null);
  const baseText = useRef('');
  const answerStart = useRef(0);
  const metrics = useRef({ frames: 0, face: 0, eye: 0 });
  const loopRef = useRef<number | null>(null);
  const landmarkerRef = useRef<any>(null);

  const stopMic = () => { try { recogRef.current?.stop(); } catch { /* ignore */ } setListening(false); };
  const stopCamera = useCallback(() => {
    if (loopRef.current) cancelAnimationFrame(loopRef.current); loopRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; setCamState('off');
  }, []);
  useEffect(() => () => { stopMic(); stopCamera(); }, [stopCamera]);

  // The <video> only exists after the interview screen opens, so attach the camera stream here (not inside startCamera).
  useEffect(() => {
    const v = videoRef.current;
    if (v && streamRef.current && v.srcObject !== streamRef.current) { v.srcObject = streamRef.current; v.play().catch(() => {}); }
  }, [stage, camState]);

  const startCamera = async () => {
    setCamState('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      setCamState('on');
      try { landmarkerRef.current = await loadLandmarker(); setTrackingOk(true); trackLoop(); } catch { setTrackingOk(false); }
    } catch { setCamState('failed'); }
  };

  const trackLoop = () => {
    let last = 0;
    const step = (now: number) => {
      loopRef.current = requestAnimationFrame(step);
      const v = videoRef.current, lm = landmarkerRef.current;
      if (!v || !lm || v.readyState < 2 || now - last < 150) return; last = now;
      try {
        const out = lm.detectForVideo(v, now);
        metrics.current.frames++;
        const lms = out?.faceLandmarks?.[0];
        if (lms) {
          const cx = lms.reduce((s: number, p: any) => s + p.x, 0) / lms.length, cy = lms.reduce((s: number, p: any) => s + p.y, 0) / lms.length;
          if (cx > 0.2 && cx < 0.8 && cy > 0.2 && cy < 0.8) metrics.current.face++;
          const b: Record<string, number> = {}; (out.faceBlendshapes?.[0]?.categories || []).forEach((c: any) => { b[c.categoryName] = c.score; });
          const gaze = Math.max(b.eyeLookOutLeft || 0, b.eyeLookInLeft || 0, b.eyeLookOutRight || 0, b.eyeLookInRight || 0, b.eyeLookUpLeft || 0, b.eyeLookUpRight || 0, b.eyeLookDownLeft || 0, b.eyeLookDownRight || 0);
          if (gaze < 0.45) metrics.current.eye++;
        }
      } catch { /* skip frame */ }
    };
    loopRef.current = requestAnimationFrame(step);
  };

  const toggleMic = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError('Voice input needs Chrome or Edge. You can type your answer instead.'); return; }
    if (listening) { stopMic(); return; }
    const r = new SR(); r.lang = 'en-IN'; r.interimResults = true; r.continuous = true;
    baseText.current = answer ? `${answer.trim()} ` : '';
    r.onresult = (ev: any) => { let t = ''; for (let i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript; setAnswer(baseText.current + t); };
    r.onerror = () => { setListening(false); setError('Could not use the microphone. Check the browser permission.'); };
    r.onend = () => setListening(false);
    recogRef.current = r; setListening(true); setError(null); r.start();
  };

  const fetchQuestion = async (asked: string[]) => {
    setStage('loading'); setError(null);
    try {
      const data = await postJson<{ question: string }>('/api/crt/interview', { type: apiType, mode: 'question', domain, level, asked });
      setQuestion(data.question); setAnswer(''); metrics.current = { frames: 0, face: 0, eye: 0 }; answerStart.current = Date.now(); setStage('answering');
    } catch (e: any) { setError(e.message); setStage(asked.length ? 'feedback' : 'setup'); }
  };

  const begin = async () => {
    setRounds([]); setCurrent(null);
    if (kind === 'camera') await startCamera();
    await fetchQuestion([]);
  };

  const submitAnswer = async () => {
    if (!answer.trim()) { setError('Write or speak an answer first.'); return; }
    stopMic(); setStage('evaluating'); setError(null);
    const minutes = Math.max(0.2, (Date.now() - answerStart.current) / 60000);
    const words = answer.trim().split(/\s+/).length; const fillers = countFillers(answer); const wpm = Math.round(words / minutes);
    const m = metrics.current;
    try {
      const data = await postJson<{ evaluation: Evaluation }>('/api/crt/interview', { type: apiType, mode: 'evaluate', domain, question, answer, spokenStats: kind === 'camera' ? { wordsPerMinute: wpm, fillerCount: fillers } : undefined });
      const round: Round = { question, answer, evaluation: data.evaluation, fillers: kind === 'camera' ? fillers : undefined, wpm: kind === 'camera' ? wpm : undefined,
        eyeContact: kind === 'camera' && m.frames > 5 ? Math.round((m.eye / m.frames) * 100) : undefined, faceInFrame: kind === 'camera' && m.frames > 5 ? Math.round((m.face / m.frames) * 100) : undefined };
      setCurrent(round); setRounds((r) => [...r, round]); setStage('feedback');
    } catch (e: any) { setError(e.message); setStage('answering'); }
  };

  const next = () => {
    if (rounds.length >= TOTAL) {
      const avg = Math.round((rounds.reduce((s, r) => s + r.evaluation.score, 0) / rounds.length) * 10) / 10;
      stopCamera(); setStage('summary'); onFinish({ kind, average: avg, rounds: rounds.length, date: Date.now() });
    } else void fetchQuestion(rounds.map((r) => r.question));
  };

  const card = 'bg-surface-container border-2 border-outline-variant rounded-[18px] p-6';
  const titles: Record<InterviewKind, string> = { hr: 'HR round', technical: 'Technical interview', camera: 'Camera mock interview' };
  const err = error && <div className="flex items-start gap-2 p-3 rounded-xl bg-error-container text-on-error border border-outline-variant text-sm"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span></div>;

  if (stage === 'setup') return (
    <div className={`${card} space-y-4 max-w-2xl`}>
      <h3 className="text-xl font-bold text-on-surface">{titles[kind]}</h3>
      <p className="text-sm text-on-surface-variant">{TOTAL} questions. After each answer you get a score out of 10, what was good, what to fix, and a sample answer. {kind === 'camera' ? 'Your camera video stays in your browser and is never uploaded. Only the text of your answer goes to the AI.' : ''}</p>
      {kind === 'technical' && <label className="block text-sm font-bold text-on-surface">Domain<input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="For example: Python, React, Machine Learning" className="mt-1 w-full bg-surface-container-lowest border-2 border-outline-variant rounded-xl px-4 py-2.5 text-sm font-normal text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary" /></label>}
      {kind === 'camera' && <p className="text-sm text-on-surface-variant">Use Chrome or Edge, allow the camera when asked, and sit facing the screen with your face in the middle. Speak your answer with the microphone button.</p>}
      {err}
      <div className="flex gap-3"><button onClick={begin} className="px-6 py-2.5 rounded-xl bg-primary-container text-on-primary border-2 border-outline-variant font-bold text-sm">Start interview</button><button onClick={onExit} className="px-4 py-2.5 text-sm font-bold text-on-surface-variant underline underline-offset-4">Back to CRT</button></div>
    </div>
  );

  if (stage === 'summary') {
    const avg = rounds.reduce((s, r) => s + r.evaluation.score, 0) / Math.max(1, rounds.length);
    const eyes = rounds.filter((r) => r.eyeContact !== undefined);
    return (
      <div className="space-y-4 max-w-3xl">
        <div className={card}>
          <h3 className="text-xl font-bold text-on-surface">Interview report</h3>
          <p className="mt-2 text-4xl font-black text-on-surface">{avg.toFixed(1)}<span className="text-xl text-on-surface-variant"> / 10 average</span></p>
          {kind === 'camera' && <div className="mt-4 grid sm:grid-cols-3 gap-3 text-sm">
            <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/60"><p className="text-on-surface-variant">Eye contact</p><p className="font-bold text-on-surface">{eyes.length ? `${Math.round(eyes.reduce((s, r) => s + (r.eyeContact || 0), 0) / eyes.length)}%` : 'Not measured'}</p></div>
            <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/60"><p className="text-on-surface-variant">Face in frame</p><p className="font-bold text-on-surface">{eyes.length ? `${Math.round(eyes.reduce((s, r) => s + (r.faceInFrame || 0), 0) / eyes.length)}%` : 'Not measured'}</p></div>
            <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/60"><p className="text-on-surface-variant">Filler words</p><p className="font-bold text-on-surface">{rounds.reduce((s, r) => s + (r.fillers || 0), 0)} in total</p></div>
          </div>}
          <div className="mt-4 flex gap-3"><button onClick={() => setStage('setup')} className="px-5 py-2.5 rounded-xl bg-primary-container text-on-primary border-2 border-outline-variant font-bold text-sm">Practice again</button><button onClick={onExit} className="px-4 py-2.5 text-sm font-bold text-on-surface-variant underline underline-offset-4">Back to CRT</button></div>
        </div>
        {rounds.map((r, i) => <div key={i} className={`${card} !p-5 text-sm space-y-1`}><p className="font-bold text-on-surface">{i + 1}. {r.question} <span className="text-on-surface-variant font-normal">({r.evaluation.score}/10)</span></p><p className="text-on-surface-variant">{r.evaluation.verdict}</p></div>)}
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-5 gap-5 items-start">
      <div className={`${card} lg:col-span-3 space-y-4`}>
        <div className="flex items-center justify-between text-sm text-on-surface-variant"><span>{titles[kind]}: question {Math.min(rounds.length + (stage === 'feedback' ? 0 : 1), TOTAL)} of {TOTAL}</span><button onClick={() => { stopMic(); stopCamera(); onExit(); }} className="font-bold underline underline-offset-4">End interview</button></div>
        {stage === 'loading' ? <p className="flex items-center gap-2 text-on-surface"><Loader2 className="w-4 h-4 animate-spin" />Getting your next question</p> : <p className="text-lg font-bold text-on-surface leading-snug">{question}</p>}

        {(stage === 'answering' || stage === 'evaluating') && (<>
          <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} disabled={stage === 'evaluating'} rows={7} data-lenis-prevent placeholder={kind === 'camera' ? 'Press the microphone and speak. Your words appear here. You can also type.' : 'Type your answer here. You can also use the microphone.'} className="w-full bg-surface-container-lowest border-2 border-outline-variant rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary" />
          {err}
          <div className="flex items-center gap-3">
            <button type="button" onClick={toggleMic} disabled={stage === 'evaluating'} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-outline-variant text-sm font-bold ${listening ? 'bg-error-container text-on-error' : 'text-on-surface hover:bg-surface-container-high'}`}>{listening ? <><Square className="w-3.5 h-3.5" />Stop</> : <><Mic className="w-4 h-4" />Speak</>}</button>
            <button onClick={submitAnswer} disabled={stage === 'evaluating'} className="ml-auto px-6 py-2.5 rounded-xl bg-primary-container text-on-primary border-2 border-outline-variant font-bold text-sm flex items-center gap-2 disabled:opacity-60">{stage === 'evaluating' ? <><Loader2 className="w-4 h-4 animate-spin" />Scoring</> : 'Submit answer'}</button>
          </div>
        </>)}

        {stage === 'feedback' && current && (
          <div className="space-y-3 text-sm">
            <p className="text-3xl font-black text-on-surface">{current.evaluation.score.toFixed(1)}<span className="text-lg text-on-surface-variant"> / 10</span></p>
            <p className="text-on-surface">{current.evaluation.verdict}</p>
            {current.evaluation.strengths.length > 0 && <div><p className="font-bold text-on-surface">What was good</p><div className="text-on-surface-variant">{current.evaluation.strengths.map((s, i) => <div key={i}>{renderFormattedText(`- ${s}`)}</div>)}</div></div>}
            {current.evaluation.improvements.length > 0 && <div><p className="font-bold text-on-surface">What to improve</p><div className="text-on-surface-variant">{current.evaluation.improvements.map((s, i) => <div key={i}>{renderFormattedText(`- ${s}`)}</div>)}</div></div>}
            <div><p className="font-bold text-on-surface">A stronger answer</p><p className="text-on-surface-variant leading-relaxed">{current.evaluation.betterAnswer}</p></div>
            {kind === 'camera' && <p className="text-on-surface-variant">{current.eyeContact !== undefined ? `Eye contact ${current.eyeContact}%, face in frame ${current.faceInFrame}%, ` : ''}{current.wpm} words per minute, {current.fillers} filler words.</p>}
            <button onClick={next} className="px-6 py-2.5 rounded-xl bg-primary-container text-on-primary border-2 border-outline-variant font-bold text-sm">{rounds.length >= TOTAL ? 'See my report' : 'Next question'}</button>
          </div>
        )}
        {stage === 'feedback' && err}
      </div>

      {kind === 'camera' && (
        <div className={`${card} lg:col-span-2 space-y-3 !p-4`}>
          <div className="aspect-[4/3] rounded-xl overflow-hidden bg-surface-container-highest border border-outline-variant flex items-center justify-center">
            <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover -scale-x-100 ${camState === 'on' ? '' : 'hidden'}`} />
            {camState !== 'on' && <div className="text-center text-sm text-on-surface-variant p-4"><Video className="w-6 h-6 mx-auto mb-2" />{camState === 'starting' ? 'Starting the camera' : camState === 'failed' ? 'Camera not available. Allow camera access in the browser and start again.' : 'Camera is off'}</div>}
          </div>
          <p className="text-xs text-on-surface-variant">{trackingOk === null ? 'Face tracking starts when the camera is on.' : trackingOk ? 'Face tracking is on. Look at the camera while you answer.' : 'Face tracking could not load (it needs internet). Your answers are still scored.'}</p>
        </div>
      )}
    </div>
  );
};
