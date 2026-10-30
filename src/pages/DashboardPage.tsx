import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, CheckCircle2, Circle, Clock3, Flame, GitBranch, Keyboard, Map, Search, Sparkles, Terminal, Trophy, UserRound, Users, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DcBadge } from '../components/ui/DcBadge';
import { DcCard } from '../components/ui/DcCard';
import { DcEmptyState } from '../components/ui/DcEmptyState';
import { DcSectionHeader } from '../components/ui/DcSectionHeader';

type ActivityItem = {
  id: string;
  label: string;
  meta: string;
  timestamp: number;
  tone: 'blue' | 'mint' | 'yellow' | 'lavender';
};

const DASHBOARD_ACTIVITY_PREFIX = 'devcollective_dashboard_activity:';
const DASHBOARD_LAST_LOCATION_PREFIX = 'devcollective_dashboard_last_location:';

const formatRelativeTime = (timestamp: number) => {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return 'JUST NOW';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}M AGO`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}H AGO`;
  const days = Math.floor(hours / 24);
  return `${days}D AGO`;
};

const readActivity = (userId: string): ActivityItem[] => {
  try {
    const raw = localStorage.getItem(`${DASHBOARD_ACTIVITY_PREFIX}${userId}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
};

const writeActivity = (userId: string, item: Omit<ActivityItem, 'id' | 'timestamp'>) => {
  try {
    const next: ActivityItem = { ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, timestamp: Date.now() };
    const previous = readActivity(userId);
    localStorage.setItem(`${DASHBOARD_ACTIVITY_PREFIX}${userId}`, JSON.stringify([next, ...previous].slice(0, 8)));
    return next;
  } catch {
    return null;
  }
};

const titleForTab = (tab: string) => {
  const map: Record<string, string> = {
    roadmap: 'ROADMAP WORKSPACE',
    community: 'COMMUNITY WORKSPACE',
    profile: 'PROFILE WORKSPACE',
    leaderboard: 'LEADERBOARD WORKSPACE',
    mentors: 'MENTOR WORKSPACE',
  };
  return map[tab] || 'YOUR WORKSPACE';
};

export const DashboardPage: React.FC = () => {
  const { user, tasks, toggleTaskCompletion, leaderboard, setActiveTab, completeOnboarding, repAnimation } = useAuth();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!user) return;
    setActivity(readActivity(user.id));
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [user]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
      }
      if (event.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!user) return null;

  const completedTasksCount = tasks.filter((task) => task.completed).length;
  const taskProgress = tasks.length ? Math.round((completedTasksCount / tasks.length) * 100) : 0;
  const firstName = user.name.split(' ')[0].toUpperCase();
  const selectedPathCount = user.selectedDomains?.length || 0;
  const visibleLeaderboard = leaderboard.slice(0, 5);
  const recentActivity = activity.slice(0, 4);
  const streakSlots = Array.from({ length: 7 }, (_, index) => index < Math.min(user.streakDays, 7));

  const continueItem = useMemo(() => {
    const nextTask = tasks.find((task) => !task.completed);
    if (nextTask) {
      return {
        eyebrow: 'CONTINUE WHERE YOU LEFT OFF',
        title: nextTask.title,
        meta: `${nextTask.estimatedMinutes} MIN · +${nextTask.repReward} REP`,
        action: 'Resume task',
        onClick: () => setActiveTab('dashboard'),
        tone: 'blue',
      };
    }
    const lastLocation = (() => {
      try {
        return localStorage.getItem(`${DASHBOARD_LAST_LOCATION_PREFIX}${user.id}`) || '';
      } catch {
        return '';
      }
    })();
    const fallbackTab = ['roadmap', 'community', 'profile', 'leaderboard', 'mentors'].includes(lastLocation) ? lastLocation : 'roadmap';
    return {
      eyebrow: 'NEXT WORKSPACE MOVE',
      title: selectedPathCount ? `Explore ${user.selectedDomains[0]} next` : titleForTab(fallbackTab),
      meta: selectedPathCount ? `${selectedPathCount} PATH${selectedPathCount === 1 ? '' : 'S'} SELECTED` : 'START WITH YOUR ROADMAP',
      action: 'Open workspace',
      onClick: () => setActiveTab(fallbackTab as any),
      tone: 'lavender',
    };
  }, [tasks, selectedPathCount, user, setActiveTab]);

  const stats = [
    { label: 'REP', value: user.rep.toLocaleString(), note: 'TOTAL REPUTATION', tone: 'blue' },
    { label: 'LEVEL', value: String(user.level), note: 'CURRENT LEVEL', tone: 'lavender' },
    { label: 'STREAK', value: `${user.streakDays}d`, note: 'CURRENT STREAK', tone: 'mint' },
    { label: 'TASKS', value: `${completedTasksCount}/${tasks.length}`, note: 'TASK PROGRESS', tone: 'yellow' },
  ];

  const recommendations = (user.selectedDomains?.length ? user.selectedDomains : ['Web Development', 'AI', 'Open Source'])
    .slice(0, 3)
    .map((domain, index) => ({
      title: index === 0 ? `Build something in ${domain}` : `Explore ${domain}`,
      meta: index === 0 ? 'MATCHED TO YOUR PATH' : 'DISCOVERY SUGGESTION',
    }));

  const quickActions = [
    { title: 'Roadmaps', meta: 'BUILD YOUR NEXT STEP', icon: Map, target: 'roadmap' as const },
    { title: 'Community', meta: 'SEE WHAT PEOPLE SHIP', icon: Users, target: 'community' as const },
    { title: 'Profile', meta: 'KEEP YOUR SIGNAL FRESH', icon: UserRound, target: 'profile' as const },
  ];

  const recordDashboardActivity = (label: string, meta: string, tone: ActivityItem['tone']) => {
    const next = writeActivity(user.id, { label, meta, tone });
    if (next) setActivity((prev) => [next, ...prev].slice(0, 8));
  };

  const navigateAndRemember = (target: 'roadmap' | 'community' | 'profile' | 'leaderboard' | 'mentors') => {
    try { localStorage.setItem(`${DASHBOARD_LAST_LOCATION_PREFIX}${user.id}`, target); } catch { /* best-effort UX memory */ }
    setActiveTab(target);
  };

  const handleTaskToggle = async (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    await toggleTaskCompletion(taskId);
    if (task && !task.completed) {
      recordDashboardActivity(`Completed “${task.title}”`, `+${task.repReward} REP EARNED`, 'mint');
    }
  };

  const paletteActions = [
    { title: 'Open roadmap', meta: 'Learning workspace', icon: Map, target: 'roadmap' as const },
    { title: 'Open community', meta: 'Posts and discussions', icon: Users, target: 'community' as const },
    { title: 'Open profile', meta: 'Identity and skills', icon: UserRound, target: 'profile' as const },
    { title: 'Open leaderboard', meta: 'Rankings and REP', icon: Trophy, target: 'leaderboard' as const },
    { title: 'Find a mentor', meta: 'Mentor workspace', icon: Sparkles, target: 'mentors' as const },
  ];
  const filteredPaletteActions = paletteActions.filter((item) => `${item.title} ${item.meta}`.toLowerCase().includes(paletteQuery.toLowerCase().trim()));

  return (
    <div className="space-y-7 pb-16 relative">
      {user.hasCompletedOnboarding === false && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <div className="bg-surface border-2 border-outline-variant p-8 max-w-lg w-full shadow-[7px_7px_0_#171717] space-y-6">
            <p className="font-label-mono text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">SESSION / INITIALIZED</p>
            <h3 className="dc-display text-5xl">WELCOME, {firstName}.</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">Your DevCollective workspace is empty by design. Build your profile, choose a path, and start creating your own activity.</p>
            <div className="grid grid-cols-3 border-2 border-outline-variant">
              <div className="p-4 border-r-2 border-outline-variant"><span className="font-label-mono text-[9px] uppercase text-on-surface-variant block">REP</span><strong className="dc-display text-2xl block mt-1">0</strong></div>
              <div className="p-4 border-r-2 border-outline-variant"><span className="font-label-mono text-[9px] uppercase text-on-surface-variant block">LEVEL</span><strong className="dc-display text-2xl block mt-1">1</strong></div>
              <div className="p-4"><span className="font-label-mono text-[9px] uppercase text-on-surface-variant block">STREAK</span><strong className="dc-display text-2xl block mt-1">0</strong></div>
            </div>
            <button onClick={() => completeOnboarding()} className="w-full bg-primary text-on-primary border-2 border-outline-variant shadow-[4px_4px_0_#171717] py-4 font-label-mono text-xs uppercase font-bold flex items-center justify-center gap-2">ENTER WORKSPACE <ArrowRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {paletteOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 md:p-10 bg-background/65 backdrop-blur-sm" onMouseDown={() => setPaletteOpen(false)}>
          <div className="dc-dashboard-command" onMouseDown={(event) => event.stopPropagation()}>
            <div className="dc-dashboard-command-search">
              <Search className="w-4 h-4 shrink-0" />
              <input autoFocus value={paletteQuery} onChange={(event) => setPaletteQuery(event.target.value)} placeholder="Search DevCollective..." aria-label="Search DevCollective" />
              <kbd>ESC</kbd>
            </div>
            <div className="dc-dashboard-command-hint"><Keyboard className="w-3.5 h-3.5" /> NAVIGATE THE WORKSPACE</div>
            <div className="dc-dashboard-command-list">
              {filteredPaletteActions.map(({ title, meta, icon: Icon, target }) => (
                <button key={title} onClick={() => { setPaletteOpen(false); setPaletteQuery(''); navigateAndRemember(target); }} className="dc-dashboard-command-item">
                  <span className="dc-dashboard-command-item-icon"><Icon className="w-4 h-4" /></span>
                  <span><strong>{title}</strong><small>{meta}</small></span>
                  <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                </button>
              ))}
              {!filteredPaletteActions.length && <div className="p-6 text-center text-sm text-on-surface-variant">No workspace actions match that search.</div>}
            </div>
          </div>
        </div>
      )}

      {repAnimation && <div key={repAnimation.id} className="dc-dashboard-rep-toast"><Zap className="w-3.5 h-3.5" /> +{repAnimation.amount} REP EARNED</div>}

      <section className="dc-dashboard-hero" data-gsap-reveal>
        <div className="relative z-10">
          <p className="dc-dashboard-kicker">Workspace / Personal Command Center</p>
          <h2 className="dc-dashboard-title mt-4">GOOD TO SEE YOU,<br /><span className="accent">{firstName}.</span></h2>
          <p className="dc-dashboard-copy">A focused snapshot of your learning progress, reputation, and what to do next. Your workspace gets richer as you actually use it.</p>
          <div className="dc-dashboard-hero-actions">
            <button onClick={() => navigateAndRemember('roadmap')} className="dc-dashboard-action"><Map className="w-4 h-4" /> Explore roadmap <ArrowRight className="w-3.5 h-3.5" /></button>
            <button onClick={() => navigateAndRemember('profile')} className="dc-dashboard-action secondary"><UserRound className="w-4 h-4" /> Edit profile</button>
            <button onClick={() => setPaletteOpen(true)} className="dc-dashboard-action command-trigger"><Terminal className="w-4 h-4" /> Command <kbd>Ctrl K</kbd></button>
          </div>
        </div>

        <aside className="dc-dashboard-snapshot">
          <div className="dc-dashboard-snapshot-top">
            {user.avatar ? <img src={user.avatar} alt={user.name} className="dc-dashboard-avatar" /> : <div className="dc-dashboard-avatar dc-dashboard-avatar-fallback">{user.name.slice(0, 1).toUpperCase()}</div>}
            <div className="min-w-0">
              <p className="dc-dashboard-snapshot-name truncate">{user.name}</p>
              <p className="dc-dashboard-snapshot-role">{user.role} · level {user.level}</p>
            </div>
          </div>
          <div className="dc-dashboard-meta">
            <div className="dc-dashboard-meta-item"><p className="dc-dashboard-meta-label">COLLEGE</p><p className="dc-dashboard-meta-value" title={user.college || 'Not set'}>{user.college || 'Not set'}</p></div>
            <div className="dc-dashboard-meta-item"><p className="dc-dashboard-meta-label">PATHS</p><p className="dc-dashboard-meta-value">{selectedPathCount} selected</p></div>
            <div className="dc-dashboard-meta-item"><p className="dc-dashboard-meta-label">BRANCH</p><p className="dc-dashboard-meta-value" title={user.branch || 'Not set'}>{user.branch || 'Not set'}</p></div>
            <div className="dc-dashboard-meta-item"><p className="dc-dashboard-meta-label">IDENTITY</p><p className="dc-dashboard-meta-value">{user.email}</p></div>
          </div>
        </aside>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-gsap-reveal>
        {stats.map((stat) => (
          <div key={stat.label} className={`dc-dashboard-stat ${stat.tone}`}>
            <span className="dc-dashboard-stat-label">{stat.label}</span>
            <span className="dc-dashboard-stat-value">{stat.value}{stat.label === 'STREAK' && <Flame className="w-5 h-5" />}</span>
            <span className="dc-dashboard-stat-note">{stat.note}</span>
            {stat.label === 'TASKS' && (
              <div className="dc-dashboard-progress-wrap">
                <div className="dc-dashboard-progress-head"><span>Completion</span><strong>{taskProgress}%</strong></div>
                <div className="dc-dashboard-progress-rail"><div className="dc-dashboard-progress-fill" style={{ width: `${taskProgress}%` }} /></div>
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="dc-dashboard-intelligence" data-gsap-reveal>
        <div className={`dc-dashboard-continue ${continueItem.tone}`}>
          <div className="dc-dashboard-continue-icon"><Clock3 className="w-5 h-5" /></div>
          <div className="min-w-0 flex-1">
            <p className="dc-dashboard-section-label">{continueItem.eyebrow}</p>
            <h3 className="dc-dashboard-continue-title">{continueItem.title}</h3>
            <p className="dc-dashboard-continue-meta">{continueItem.meta}</p>
          </div>
          <button onClick={continueItem.onClick} className="dc-dashboard-continue-button">{continueItem.action} <ArrowRight className="w-3.5 h-3.5" /></button>
        </div>

        <div className="dc-dashboard-weekly">
          <div className="dc-dashboard-section-heading compact">
            <div><p className="dc-dashboard-section-label">Progress / Current run</p><h3 className="dc-dashboard-card-title">THIS WEEK</h3></div>
            <CalendarDays className="w-4 h-4 text-on-surface-variant" />
          </div>
          <div className="dc-dashboard-week-grid">
            <div><span>TASKS</span><strong>{completedTasksCount}</strong><small>{taskProgress}% complete</small></div>
            <div><span>REP</span><strong>+{Math.max(0, activity.filter((item) => item.meta.includes('REP EARNED')).reduce((sum, item) => sum + Number(item.meta.match(/\+(\d+)/)?.[1] || 0), 0))}</strong><small>FROM DASHBOARD ACTIVITY</small></div>
            <div><span>STREAK</span><strong>{user.streakDays}D</strong><small>CURRENT RUN</small></div>
          </div>
          <div className="dc-dashboard-streak-track" aria-label={`${user.streakDays} day current streak`}>
            {streakSlots.map((active, index) => <span key={index} className={active ? 'active' : ''}>{index + 1}</span>)}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1.2fr_.8fr] gap-6" data-gsap-reveal>
        <DcCard className="p-6 md:p-8" shadow="md">
          <DcSectionHeader
            eyebrow="Learning / Live"
            title="TODAY'S TASKS"
            trailing={<span className="font-label-mono text-[9px] uppercase text-on-surface-variant">{completedTasksCount}/{tasks.length} COMPLETE</span>}
          />
          {tasks.length === 0 ? (
            <DcEmptyState
              title="NO TASKS YET"
              description="Your learning tasks will appear here when a roadmap assigns them."
              icon={<Zap className="w-6 h-6" />}
              action={<button onClick={() => navigateAndRemember('roadmap')} className="border-2 border-outline-variant bg-dc-mint px-4 py-3 font-label-mono text-[10px] uppercase font-bold shadow-[3px_3px_0_#171717] inline-flex items-center gap-2 rounded-[var(--dc-radius-control)]">EXPLORE ROADMAPS <ArrowRight className="w-3 h-3" /></button>}
            />
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <button key={task.id} onClick={() => void handleTaskToggle(task.id)} className={`dc-dashboard-task-row ${task.completed ? 'completed' : ''}`}>
                  <span className="dc-dashboard-task-main">
                    {task.completed ? <CheckCircle2 className="dc-dashboard-task-icon text-dc-mint" /> : <Circle className="dc-dashboard-task-icon" />}
                    <span className={task.completed ? 'line-through decoration-2 opacity-70' : ''}>{task.title}</span>
                  </span>
                  <span className="dc-dashboard-task-rep">+{task.repReward} REP</span>
                </button>
              ))}
            </div>
          )}
        </DcCard>

        <DcCard className="p-6 md:p-8" shadow="md">
          <DcSectionHeader
            eyebrow="Momentum / Signal"
            title="RECENT ACTIVITY"
            trailing={<GitBranch className="w-5 h-5 text-dc-blue" />}
          />
          {recentActivity.length ? (
            <div className="dc-dashboard-activity-list">
              {recentActivity.map((item) => (
                <div key={item.id} className={`dc-dashboard-activity ${item.tone}`}>
                  <span className="dc-dashboard-activity-dot" />
                  <div className="min-w-0"><p>{item.label}</p><small>{item.meta}</small></div>
                  <time>{formatRelativeTime(item.timestamp + (now - now))}</time>
                </div>
              ))}
            </div>
          ) : (
            <DcEmptyState
              title="YOUR ACTIVITY FEED STARTS HERE"
              description="Finish a task or use a dashboard workspace to build your first local activity trail."
              icon={<Terminal className="w-5 h-5" />}
              className="dc-dashboard-empty-activity"
            />
          )}
        </DcCard>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[.9fr_1.1fr] gap-6" data-gsap-reveal>
        <div className="border-2 border-outline-variant bg-surface p-6 md:p-8 shadow-[5px_5px_0_#171717]">
          <DcSectionHeader
            eyebrow="Personalized / Signal"
            title="RECOMMENDED FOR YOU"
            trailing={<Sparkles className="w-5 h-5 text-dc-lavender" />}
          />
          <div className="space-y-3">
            {recommendations.map((item, index) => (
              <button key={`${item.title}-${index}`} onClick={() => navigateAndRemember('roadmap')} className="dc-dashboard-recommendation text-left">
                <span className="dc-dashboard-recommendation-index">0{index + 1}</span>
                <span className="min-w-0"><strong>{item.title}</strong><small>{item.meta}</small></span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto" />
              </button>
            ))}
          </div>
        </div>

        <div className="border-2 border-outline-variant bg-surface p-6 md:p-8 shadow-[5px_5px_0_#171717]">
          <DcSectionHeader
            eyebrow="Ranking / Live"
            title="LEADERBOARD"
            trailing={<Trophy className="w-5 h-5 text-dc-yellow" />}
          />
          {visibleLeaderboard.length === 0 ? (
            <DcEmptyState
              title="NO RANKINGS YET"
              description="Rankings will populate when real community activity exists."
              className="p-6"
            />
          ) : (
            <div>
              {visibleLeaderboard.map((entry) => (
                <div key={entry.id} className={`dc-dashboard-rank-row ${entry.isUser ? 'current' : ''}`}>
                  <span className="dc-dashboard-rank-chip">{entry.rank}</span>
                  <div className="dc-dashboard-rank-avatar-wrap">
                    {entry.avatar ? <img src={entry.avatar} alt="" className="dc-dashboard-rank-avatar" /> : <span className="dc-dashboard-rank-avatar grid place-items-center text-xs font-bold">{entry.name.slice(0, 1).toUpperCase()}</span>}
                    <div className="min-w-0"><p className="dc-dashboard-rank-name">{entry.name}{entry.isUser && <DcBadge tone="blue" className="ml-2 px-1.5 py-0.5 text-[8px]">YOU</DcBadge>}</p><p className="dc-dashboard-rank-sub">{entry.college || 'College not set'} · {entry.branch || 'Branch not set'}</p></div>
                  </div>
                  <span className="dc-dashboard-rank-rep">{entry.rep.toLocaleString()} REP</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => navigateAndRemember('leaderboard')} className="w-full mt-5 border-2 border-outline-variant py-3 font-label-mono text-[10px] uppercase font-bold inline-flex items-center justify-center gap-2">VIEW FULL RANKINGS <ArrowRight className="w-3 h-3" /></button>
        </div>
      </section>

      <section data-gsap-reveal>
        <div className="dc-dashboard-section-heading">
          <div><p className="dc-dashboard-section-label">Navigation / Shortcuts</p><h3 className="dc-dashboard-section-title">QUICK ACTIONS</h3></div>
          <span className="font-label-mono text-[9px] uppercase text-on-surface-variant">3 entry points</span>
        </div>
        <div className="dc-dashboard-quick-grid">
          {quickActions.map(({ title, meta, icon: Icon, target }) => (
            <button key={title} onClick={() => navigateAndRemember(target)} className="dc-dashboard-quick text-left">
              <span className="dc-dashboard-quick-icon"><Icon className="w-4 h-4" /></span>
              <span className="dc-dashboard-quick-title">{title}</span>
              <span className="dc-dashboard-quick-meta"><span>{meta}</span><ArrowRight className="w-3.5 h-3.5" /></span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
