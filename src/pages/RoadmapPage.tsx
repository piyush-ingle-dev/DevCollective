import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { initialRoadmapLevels } from '../data/initialData';
import { RoadmapStudyBuddy } from '../components/RoadmapStudyBuddy';
import { postJson } from '../lib/aiClient';
import {
  Check,
  Zap,
  Lock,
  BookOpen,
  Terminal,
  Code2,
  Award,
  ArrowRight,
  Brain,
  Sparkles,
  RefreshCw,
  Clock,
  Layers,
  GraduationCap,
  Target,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';

interface GeneratedLevel {
  levelNumber: number;
  title: string;
  description: string;
  estimatedWeeks: number;
  topics: string[];
  capstoneProject: {
    title: string;
    description: string;
    keySkills: string[];
  };
  learningResources: {
    title: string;
    type: string;
    description: string;
  }[];
}

interface GeneratedRoadmap {
  roadmapTitle: string;
  overview: string;
  targetRole: string;
  estimatedWeeksTotal: number;
  recommendedPrerequisites?: string[];
  levels: GeneratedLevel[];
}

interface RoadmapChatMessage {
  role: 'user' | 'model';
  text: string;
}

const ROADMAP_WELCOME: RoadmapChatMessage = {
  role: 'model',
  text: "Hi! Let's build your personalized learning roadmap together. First, which technology or field are you most interested in right now? For example: AI/Machine Learning, Web Development, Cybersecurity, Cloud & DevOps, or Mobile Development.",
};

export const RoadmapPage: React.FC = () => {
  const { user } = useAuth();

  // Conversational roadmap builder state
  const [roadmapMessages, setRoadmapMessages] = useState<RoadmapChatMessage[]>([ROADMAP_WELCOME]);
  const [roadmapInput, setRoadmapInput] = useState('');
  const [isRoadmapSending, setIsRoadmapSending] = useState(false);
  const [roadmapError, setRoadmapError] = useState<string | null>(null);
  const roadmapScrollRef = useRef<HTMLDivElement>(null);

  const [generatedRoadmap, setGeneratedRoadmap] = useState<GeneratedRoadmap | null>(null);
  const [activeTab, setActiveTab] = useState<'ai' | 'standard'>('ai');

  // Every saved roadmap/chat is scoped to the logged-in account, so switching users
  // in the same browser never shows one student's roadmap to another.
  const roadmapStorageKey = user ? `devcollective_ai_roadmap_${user.id}` : null;
  const chatStorageKey = user ? `devcollective_roadmap_chat_${user.id}` : null;

  // Load (or reset) cached roadmap + chat history whenever the logged-in account changes
  useEffect(() => {
    if (!roadmapStorageKey || !chatStorageKey) {
      setGeneratedRoadmap(null);
      setRoadmapMessages([ROADMAP_WELCOME]);
      return;
    }

    try {
      const saved = localStorage.getItem(roadmapStorageKey);
      setGeneratedRoadmap(saved ? JSON.parse(saved) : null);

      const savedChat = localStorage.getItem(chatStorageKey);
      if (savedChat) {
        const parsed = JSON.parse(savedChat);
        setRoadmapMessages(Array.isArray(parsed) && parsed.length > 0 ? parsed : [ROADMAP_WELCOME]);
      } else {
        setRoadmapMessages([ROADMAP_WELCOME]);
      }
    } catch (e) {
      console.error('Failed to parse cached roadmap', e);
      setGeneratedRoadmap(null);
      setRoadmapMessages([ROADMAP_WELCOME]);
    }
  }, [roadmapStorageKey, chatStorageKey]);

  useEffect(() => {
    if (roadmapScrollRef.current) {
      roadmapScrollRef.current.scrollTop = roadmapScrollRef.current.scrollHeight;
    }
  }, [roadmapMessages, isRoadmapSending]);

  const rolePresets = [
    'AI Engineer',
    'Full Stack Developer',
    'Cloud & DevOps Engineer',
    'Mobile Developer',
    'Cybersecurity Specialist',
    'Data Engineer',
    'Backend Systems Engineer',
  ];

  const handleSendRoadmapMessage = async (e?: React.FormEvent, presetText?: string) => {
    if (e) e.preventDefault();
    const trimmed = (presetText ?? roadmapInput).trim();
    if (!trimmed || isRoadmapSending) return;

    const nextMessages: RoadmapChatMessage[] = [...roadmapMessages, { role: 'user', text: trimmed }];
    setRoadmapMessages(nextMessages);
    setRoadmapInput('');
    setRoadmapError(null);
    setIsRoadmapSending(true);

    try {
      const data = await postJson<any>('/api/ai/roadmap-chat', {
        message: trimmed,
        history: nextMessages.slice(0, -1),
      });

      let finalMessages: RoadmapChatMessage[];
      if (data.type === 'roadmap') {
        setGeneratedRoadmap(data.roadmap);
        if (roadmapStorageKey) localStorage.setItem(roadmapStorageKey, JSON.stringify(data.roadmap));
        finalMessages = [
          ...nextMessages,
          {
            role: 'model',
            text: `Your personalized roadmap is ready: "${data.roadmap.roadmapTitle}". Scroll down to see the full breakdown, or keep chatting here if you'd like to adjust anything.`,
          },
        ];
      } else {
        finalMessages = [...nextMessages, { role: 'model', text: data.message }];
      }
      setRoadmapMessages(finalMessages);
      if (chatStorageKey) localStorage.setItem(chatStorageKey, JSON.stringify(finalMessages));
    } catch (err: any) {
      console.error('Roadmap chat failed:', err);
      // keep the user's message saved even when the AI call fails, so nothing disappears
      if (chatStorageKey) localStorage.setItem(chatStorageKey, JSON.stringify(nextMessages));
      setRoadmapError(err.message || 'Something went wrong talking to the roadmap mentor.');
    } finally {
      setIsRoadmapSending(false);
    }
  };

  const handleResetRoadmapChat = () => {
    setRoadmapMessages([ROADMAP_WELCOME]);
    setGeneratedRoadmap(null);
    setRoadmapError(null);
    if (roadmapStorageKey) localStorage.removeItem(roadmapStorageKey);
    if (chatStorageKey) localStorage.removeItem(chatStorageKey);
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/30 rounded-full text-xs font-label-mono text-primary font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-POWERED CAREER ARCHITECT</span>
          </div>
          <h2 className="font-headline-lg text-3xl sm:text-4xl font-bold text-white mb-2">
            Learning Roadmaps
          </h2>
          <p className="font-body-lg text-on-surface-variant text-base max-w-2xl">
            Chat with your Roadmap Mentor to build a custom, step-by-step tech learning plan tailored to what you're interested in and where you're starting from.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 bg-surface-container border-2 border-outline-variant p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-label-mono uppercase transition-all ${
              activeTab === 'ai'
                ? 'bg-gradient-to-r from-primary-container to-secondary-container text-white shadow-md'
                : 'text-on-surface-variant hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>AI Custom Roadmap</span>
          </button>
          <button
            onClick={() => setActiveTab('standard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-label-mono uppercase transition-all ${
              activeTab === 'standard'
                ? 'bg-surface-container-high text-white shadow-md'
                : 'text-on-surface-variant hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4 text-primary" />
            <span>Standard Track</span>
          </button>
        </div>
      </div>

      {/* Roadmap Mentor Chat Box (replaces the old static form) */}
      <div className="bg-surface-container border-2 border-primary/40 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-outline-variant/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-lg">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-headline-md text-xl font-bold text-white">
                  Roadmap Mentor
                </h3>
                <p className="text-xs text-on-surface-variant font-body-md">
                  Answer a few quick questions and get a roadmap built just for you.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleResetRoadmapChat}
              className="flex items-center gap-1.5 text-xs font-label-mono uppercase text-on-surface-variant hover:text-white transition-colors shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Start Over</span>
            </button>
          </div>

          {/* Quick-start topic chips, only shown before the conversation gets going */}
          {roadmapMessages.length <= 1 && (
            <div className="space-y-2">
              <span className="font-label-mono text-[11px] uppercase text-outline block">
                Or just tap one to get started:
              </span>
              <div className="flex flex-wrap gap-2">
                {rolePresets.map((role) => (
                  <button
                    key={role}
                    type="button"
                    disabled={isRoadmapSending}
                    onClick={() => handleSendRoadmapMessage(undefined, `I'm interested in becoming a ${role}.`)}
                    className="px-3 py-1.5 rounded-lg text-xs font-label-mono transition-all border bg-surface-container-low text-on-surface-variant border-outline-variant/60 hover:text-white hover:border-primary/50 disabled:opacity-50"
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat transcript */}
          <div ref={roadmapScrollRef} data-lenis-prevent className="max-h-96 overflow-y-auto space-y-3 pr-1">
            {roadmapMessages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-primary-container text-on-primary border border-outline-variant/60 rounded-br-sm'
                      : 'bg-surface-container-low border border-outline-variant/50 text-on-surface rounded-bl-sm'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {isRoadmapSending && (
              <div className="flex justify-start">
                <div className="bg-surface-container-low border border-outline-variant/50 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                  <span className="text-xs text-on-surface-variant">Thinking...</span>
                </div>
              </div>
            )}
          </div>

          {roadmapError && (
            <div className="p-4 bg-error/10 border-2 border-error/40 rounded-2xl flex items-center gap-3 text-error text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{roadmapError}</span>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSendRoadmapMessage} className="flex items-center gap-2 pt-2 border-t border-outline-variant/50">
            <input
              type="text"
              value={roadmapInput}
              onChange={(e) => setRoadmapInput(e.target.value)}
              placeholder="Type your answer..."
              disabled={isRoadmapSending}
              className="flex-1 bg-surface-container-low border border-outline-variant/80 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-all disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isRoadmapSending || !roadmapInput.trim()}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-primary-container via-primary to-secondary-container text-white font-bold text-sm shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2 shrink-0"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>

      {/* Main Roadmap Display Area */}
      {activeTab === 'ai' ? (
        generatedRoadmap ? (
          <div className="space-y-10">
            {/* AI Generated Overview Header Card */}
            <div className="bg-surface-container border-2 border-outline-variant rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-outline-variant/60 pb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-tertiary/10 text-tertiary border border-tertiary/30 px-3 py-0.5 rounded-full text-xs font-label-mono font-bold uppercase">
                      Custom AI Plan
                    </span>
                    <span className="text-xs font-label-mono text-on-surface-variant">
                      Created for {user?.branch || 'You'} Student
                    </span>
                  </div>
                  <h3 className="font-headline-md text-2xl sm:text-3xl font-bold text-white">
                    {generatedRoadmap.roadmapTitle}
                  </h3>
                  <p className="text-sm text-on-surface-variant mt-2 leading-relaxed max-w-3xl">
                    {generatedRoadmap.overview}
                  </p>
                </div>

                <div className="flex flex-row md:flex-col items-start md:items-end gap-3 shrink-0">
                  <div className="bg-surface-container-low border border-outline-variant px-4 py-2 rounded-xl text-center">
                    <span className="text-[10px] font-label-mono text-outline block uppercase">
                      Total Duration
                    </span>
                    <span className="font-bold text-primary font-headline-md text-lg flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {generatedRoadmap.estimatedWeeksTotal} Weeks
                    </span>
                  </div>
                  <div className="bg-surface-container-low border border-outline-variant px-4 py-2 rounded-xl text-center">
                    <span className="text-[10px] font-label-mono text-outline block uppercase">
                      Target Role
                    </span>
                    <span className="font-bold text-white font-label-mono text-sm">
                      {generatedRoadmap.targetRole}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recommended Prerequisites */}
              {generatedRoadmap.recommendedPrerequisites &&
                generatedRoadmap.recommendedPrerequisites.length > 0 && (
                  <div className="space-y-2">
                    <span className="font-label-mono text-xs uppercase text-outline block">
                      Recommended Academic Prerequisites:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {generatedRoadmap.recommendedPrerequisites.map((pre, idx) => (
                        <span
                          key={idx}
                          className="bg-surface-container-low border border-outline-variant px-3 py-1 rounded-full text-xs text-on-surface-variant font-label-mono"
                        >
                          ✓ {pre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            <RoadmapStudyBuddy roadmap={generatedRoadmap} />

            {/* Generated Level Milestones */}
            <div className="relative max-w-4xl mx-auto space-y-12">
              {generatedRoadmap.levels.map((lvl) => (
                <div key={lvl.levelNumber} className="relative z-10 flex flex-col items-center">
                  {/* Level Card */}
                  <div className="w-full p-6 sm:p-8 rounded-2xl border-2 bg-surface-container border-outline-variant hover:border-primary/60 transition-all relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-primary to-secondary" />

                    <div className="space-y-6">
                      {/* Level Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/40 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary-container text-white font-black font-label-mono text-lg flex items-center justify-center shrink-0">
                            L{lvl.levelNumber}
                          </div>
                          <div>
                            <span className="font-label-mono text-xs text-primary font-bold uppercase">
                              Level {lvl.levelNumber} Milestone
                            </span>
                            <h4 className="font-headline-md text-xl sm:text-2xl font-bold text-white">
                              {lvl.title}
                            </h4>
                          </div>
                        </div>

                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-container-low border border-outline-variant rounded-full text-xs font-label-mono text-secondary">
                          <Clock className="w-3.5 h-3.5" />
                          <span>~{lvl.estimatedWeeks} Weeks</span>
                        </div>
                      </div>

                      <p className="text-on-surface-variant text-sm leading-relaxed">
                        {lvl.description}
                      </p>

                      {/* Topics */}
                      <div className="space-y-2">
                        <span className="font-label-mono text-xs uppercase text-outline block">
                          Key Concepts & Skills:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {lvl.topics.map((tp, idx) => (
                            <span
                              key={idx}
                              className="bg-surface-container-lowest border border-outline-variant/60 px-3 py-1 rounded-lg text-xs font-label-mono text-white"
                            >
                              • {tp}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Capstone Project & Resources Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                        {/* Capstone Project Card */}
                        <div className="bg-surface-container-lowest border-2 border-primary/30 rounded-xl p-5 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-label-mono text-[10px] uppercase text-primary font-bold flex items-center gap-1">
                              <Code2 className="w-3.5 h-3.5" />
                              Capstone Project
                            </span>
                          </div>
                          <h5 className="font-bold text-white text-base">
                            {lvl.capstoneProject.title}
                          </h5>
                          <p className="text-xs text-on-surface-variant leading-relaxed">
                            {lvl.capstoneProject.description}
                          </p>

                          <div className="pt-2">
                            <span className="text-[10px] font-label-mono text-outline block mb-1">
                              Skills Demonstrated:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {lvl.capstoneProject.keySkills.map((sk, idx) => (
                                <span
                                  key={idx}
                                  className="bg-primary/10 text-primary border border-primary/20 text-[10px] px-2 py-0.5 rounded font-label-mono"
                                >
                                  {sk}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Learning Resources Card */}
                        <div className="bg-surface-container-lowest border-2 border-outline-variant/60 rounded-xl p-5 space-y-3">
                          <span className="font-label-mono text-[10px] uppercase text-secondary font-bold flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5" />
                            Curated Resources
                          </span>

                          <div className="space-y-2.5">
                            {lvl.learningResources.map((res, idx) => (
                              <div
                                key={idx}
                                className="p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/40 space-y-0.5"
                              >
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-bold text-white">{res.title}</p>
                                  <span className="text-[9px] font-label-mono uppercase px-1.5 py-0.5 bg-surface-container-highest text-outline rounded">
                                    {res.type}
                                  </span>
                                </div>
                                <p className="text-[11px] text-on-surface-variant">
                                  {res.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Empty State for AI Roadmap */
          <div className="bg-surface-container border-2 border-dashed border-outline-variant rounded-3xl p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 border border-primary/30 rounded-2xl flex items-center justify-center mx-auto text-primary">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="font-headline-md text-2xl font-bold text-white">
              No AI Roadmap Generated Yet
            </h3>
            <p className="text-sm text-on-surface-variant max-w-md mx-auto">
              Chat with the Roadmap Mentor above, tell it what you're interested in, and it'll build your custom step-by-step roadmap.
            </p>
          </div>
        )
      ) : (
        /* Standard Static Track View */
        <div className="space-y-12">
          {/* Progress Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface-container border-2 border-outline-variant p-6 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="font-label-mono text-xs uppercase text-outline block mb-1">
                  Current Reputation
                </span>
                <div className="flex items-center gap-2">
                  <h3 className="font-headline-md text-3xl font-bold text-primary">
                    {user ? user.rep.toLocaleString() : '2,450'} REP
                  </h3>
                  <Zap className="w-5 h-5 text-primary animate-pulse" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-outline-variant/30">
                <p className="text-xs text-on-surface-variant font-label-mono">
                  +50 REP earned today
                </p>
              </div>
            </div>

            <div className="bg-surface-container border-2 border-outline-variant p-6 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="font-label-mono text-xs uppercase text-outline block mb-1">
                  Current Tier
                </span>
                <div className="flex items-center gap-3">
                  <h3 className="font-headline-md text-3xl font-bold text-white">
                    Level {user?.level || 18}
                  </h3>
                  <span className="bg-tertiary/10 text-tertiary text-[10px] px-2.5 py-1 rounded-full font-bold uppercase border border-tertiary/30">
                    Verified
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-outline-variant/30">
                <p className="text-xs text-on-surface-variant font-label-mono">
                  Junior Architect Track
                </p>
              </div>
            </div>

            <div className="bg-surface-container border-2 border-outline-variant p-6 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="font-label-mono text-xs uppercase text-outline block mb-1">
                  Overall Progress
                </span>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-headline-md text-3xl font-bold text-secondary">72%</h3>
                  <span className="font-label-mono text-xs text-outline">Target: Level 19</span>
                </div>
                <div className="w-full bg-surface-container-lowest h-3 rounded-full overflow-hidden border border-outline-variant">
                  <div className="bg-secondary h-full rounded-full w-[72%]" />
                </div>
              </div>
            </div>
          </div>

          {/* Vertical Standard Roadmap Timeline */}
          <div className="relative max-w-4xl mx-auto space-y-16">
            {initialRoadmapLevels.map((lvl) => {
              const isCompleted = lvl.status === 'completed';
              const isCurrent = lvl.status === 'current';
              const isLocked = lvl.status === 'locked';

              return (
                <div key={lvl.levelNumber} className="relative z-10 flex flex-col items-center">
                  {/* Timeline Indicator Marker */}
                  <div className="mb-6 flex items-center justify-center">
                    {isCompleted && (
                      <div className="w-12 h-12 rounded-full bg-tertiary border-4 border-background flex items-center justify-center text-on-tertiary shadow-lg">
                        <Check className="w-6 h-6 stroke-[3]" />
                      </div>
                    )}
                    {isCurrent && (
                      <div className="w-12 h-12 rounded-full bg-primary border-4 border-background flex items-center justify-center text-white shadow-[0_0_25px_rgba(79,70,229,0.5)] animate-pulse">
                        <Zap className="w-6 h-6 fill-white" />
                      </div>
                    )}
                    {isLocked && (
                      <div className="w-12 h-12 rounded-full bg-surface-container border-4 border-background flex items-center justify-center text-outline">
                        <Lock className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  {/* Level Card */}
                  <div
                    className={`w-full p-6 sm:p-8 rounded-2xl border-2 relative overflow-hidden transition-all ${
                      isCompleted
                        ? 'bg-surface-container border-tertiary/40'
                        : isCurrent
                        ? 'bg-surface-container border-primary shadow-xl'
                        : 'bg-surface-container/50 border-outline-variant opacity-60'
                    }`}
                  >
                    <div
                      className={`absolute top-0 left-0 w-1.5 h-full ${
                        isCompleted
                          ? 'bg-tertiary'
                          : isCurrent
                          ? 'bg-primary'
                          : 'bg-outline-variant'
                      }`}
                    />

                    <div className="flex flex-col md:flex-row gap-8 justify-between items-start">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={`font-label-mono font-bold text-xs uppercase px-3 py-1 rounded-full border ${
                              isCompleted
                                ? 'bg-tertiary/10 text-tertiary border-tertiary/30'
                                : isCurrent
                                ? 'bg-primary/10 text-primary border-primary/30'
                                : 'bg-surface-container-highest text-outline border-outline-variant'
                            }`}
                          >
                            LEVEL {lvl.levelNumber} • {lvl.status.toUpperCase()}
                          </span>
                        </div>

                        <h4 className="font-headline-md text-2xl font-bold text-white">
                          {lvl.title}
                        </h4>
                        <p className="text-on-surface-variant text-sm leading-relaxed">
                          {lvl.description}
                        </p>

                        {/* Step Flow */}
                        <div className="grid grid-cols-4 gap-3 pt-2">
                          <div className="flex flex-col items-center gap-1.5 p-2 bg-surface-container-low rounded-xl border border-outline-variant/40 text-center">
                            <BookOpen className="w-4 h-4 text-primary" />
                            <span className="font-label-mono text-[10px] uppercase text-outline">
                              Learn
                            </span>
                          </div>
                          <div className="flex flex-col items-center gap-1.5 p-2 bg-surface-container-low rounded-xl border border-outline-variant/40 text-center">
                            <Terminal className="w-4 h-4 text-secondary" />
                            <span className="font-label-mono text-[10px] uppercase text-outline">
                              Practice
                            </span>
                          </div>
                          <div className="flex flex-col items-center gap-1.5 p-2 bg-surface-container-low rounded-xl border border-outline-variant/40 text-center">
                            <Code2 className="w-4 h-4 text-tertiary" />
                            <span className="font-label-mono text-[10px] uppercase text-outline">
                              Build
                            </span>
                          </div>
                          <div className="flex flex-col items-center gap-1.5 p-2 bg-surface-container-low rounded-xl border border-outline-variant/40 text-center">
                            <Award className="w-4 h-4 text-primary" />
                            <span className="font-label-mono text-[10px] uppercase text-outline">
                              Assess
                            </span>
                          </div>
                        </div>

                        {/* Topic Badges */}
                        <div className="flex flex-wrap gap-2 pt-2">
                          {lvl.topics.map((tp) => (
                            <span
                              key={tp}
                              className="bg-surface-container-lowest border border-outline-variant/50 px-3 py-1 rounded-full text-xs font-label-mono text-on-surface-variant"
                            >
                              {tp}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Capstone Card */}
                      <div className="w-full md:w-72 bg-surface-container-lowest border-2 border-outline-variant/60 rounded-xl p-5 space-y-3">
                        <span className="font-label-mono text-[10px] uppercase text-outline block">
                          Capstone Project
                        </span>
                        <h5 className="font-bold text-white text-sm">
                          {lvl.capstoneProject.title}
                        </h5>
                        <p className="text-xs text-on-surface-variant leading-relaxed">
                          {lvl.capstoneProject.description}
                        </p>

                        <button
                          disabled={isLocked}
                          className={`w-full py-2.5 rounded-xl text-xs font-bold font-label-mono uppercase transition-all ${
                            isCompleted
                              ? 'border-2 border-tertiary text-tertiary hover:bg-tertiary hover:text-on-tertiary'
                              : isCurrent
                              ? 'bg-primary text-on-primary hover:brightness-110'
                              : 'bg-surface-container-high text-outline cursor-not-allowed'
                          }`}
                        >
                          {isCompleted ? 'Review Code' : isCurrent ? 'Start Capstone' : 'Locked'}
                        </button>
                      </div>
                    </div>

                    {isCurrent && (
                      <div className="mt-6 pt-6 border-t border-outline-variant">
                        <button className="w-full bg-primary text-on-primary py-3.5 rounded-xl font-bold text-base hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all flex items-center justify-center gap-2 active:scale-95">
                          <span>Continue Current Level</span>
                          <ArrowRight className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

