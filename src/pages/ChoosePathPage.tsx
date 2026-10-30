import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Code,
  Brain,
  Cloud,
  Shield,
  Smartphone,
  Database,
  Gamepad,
  Sparkles,
  ArrowRight,
  Check,
  X,
  Lock,
  Compass,
} from 'lucide-react';
import '../styles/choose-path.css';

export const ChoosePathPage: React.FC = () => {
  const { user, updateProfile, setActiveTab } = useAuth();
  const [selectedDomains, setSelectedDomains] = useState<string[]>(user?.selectedDomains || []);
  const [isSaving, setIsSaving] = useState(false);

  const domains = [
    { id: 'Software Dev', icon: Code, title: 'Software Dev', pathsCount: '12 Paths', desc: 'Master full-stack architectures, algorithms, and scalable system design.', tag: 'High Demand', tone: 'bg-dc-blue' },
    { id: 'AI/ML', icon: Brain, title: 'AI / ML', pathsCount: '8 Paths', desc: 'Dive into machine learning, neural networks, LLMs, and practical AI systems.', tag: 'AI Ready', tone: 'bg-dc-lavender' },
    { id: 'Cloud/DevOps', icon: Cloud, title: 'Cloud / DevOps', pathsCount: '15 Paths', desc: 'Build reliable infrastructure with Docker, Kubernetes, cloud platforms, and CI/CD.', tag: 'Infrastructure', tone: 'bg-dc-mint' },
    { id: 'Cyber Security', icon: Shield, title: 'Cyber Security', pathsCount: '6 Paths', desc: 'Explore ethical hacking, application security, threat modeling, and defense.', tag: 'Security', tone: 'bg-dc-pink' },
    { id: 'Mobile', icon: Smartphone, title: 'Mobile Dev', pathsCount: '10 Paths', desc: 'Build native and cross-platform products with Kotlin, Swift, and Flutter.', tag: 'Product', tone: 'bg-dc-blue' },
    { id: 'Data', icon: Database, title: 'Data Science', pathsCount: '7 Paths', desc: 'Turn data into decisions through analytics, statistics, visualization, and modeling.', tag: 'Analytics', tone: 'bg-dc-mint' },
    { id: 'Game Dev', icon: Gamepad, title: 'Game Dev', pathsCount: '9 Paths', desc: 'Create interactive worlds with Unity, Unreal Engine, C++, and real-time systems.', tag: 'Creative Tech', tone: 'bg-dc-yellow' },
  ];

  const toggleDomain = (id: string) => {
    setSelectedDomains((current) => current.includes(id) ? current.filter((domain) => domain !== id) : [...current, id]);
  };

  const handleFinish = async () => {
    if (!selectedDomains.length || isSaving) return;
    setIsSaving(true);
    try {
      await updateProfile({ selectedDomains, hasCompletedOnboarding: true });
      setActiveTab('dashboard');
    } finally {
      setIsSaving(false);
    }
  };

  const primaryPath = selectedDomains[0];

  return (
    <div className="dc-choose-path min-h-screen bg-background text-on-background font-body-md pt-20 pb-20 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 sm:mb-12 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <span className="dc-mono text-[10px] uppercase tracking-[0.16em] px-3 py-2 border-2 border-outline-variant bg-surface">STEP 3 / 3</span>
            <div className="cp-progress flex-1 max-w-xl"><span /></div>
            <span className="dc-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">PATH INITIALIZATION</span>
          </div>
          <div className="grid lg:grid-cols-[1.1fr_.9fr] gap-8 items-end">
            <div>
              <p className="dc-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-3">[ BUILD YOUR DIRECTION ]</p>
              <h1 className="dc-display text-[clamp(3rem,6vw,5.8rem)]">CHOOSE.<br /><span className="text-primary">YOUR PATH.</span></h1>
            </div>
            <div className="cp-role-note text-sm sm:text-base leading-relaxed text-on-surface-variant max-w-xl lg:justify-self-end">
              Your selection becomes part of your DevCollective profile. We use it later with your skills, role, projects, and activity to improve learning and connection recommendations.
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          <section className="xl:col-span-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {domains.map(({ id, icon: Icon, title, pathsCount, desc, tag, tone }) => {
                const isSelected = selectedDomains.includes(id);
                return (
                  <button key={id} type="button" aria-pressed={isSelected} onClick={() => toggleDomain(id)} className={`cp-card text-left p-6 sm:p-7 relative overflow-hidden ${isSelected ? 'is-selected' : ''}`}>
                    <div className="flex items-start justify-between gap-4">
                      <span className={`cp-icon ${isSelected ? tone : ''}`}><Icon className="w-6 h-6" /></span>
                      <span className="dc-mono text-[9px] uppercase tracking-[0.12em] px-2 py-1 border-2 border-outline-variant bg-surface-container-low text-on-surface-variant">{pathsCount}</span>
                    </div>
                    <div className="mt-8">
                      <div className="flex items-center gap-2 mb-2">
                        {isSelected && <Check className="w-4 h-4 text-primary" />}
                        <h2 className="dc-display text-2xl">{title}</h2>
                      </div>
                      <p className="text-sm leading-relaxed text-on-surface-variant max-w-md">{desc}</p>
                    </div>
                    <div className="mt-7 flex items-center justify-between gap-4">
                      <span className="dc-mono text-[9px] uppercase tracking-[0.14em] text-on-surface-variant">{tag}</span>
                      <span className={`w-7 h-7 border-2 border-outline-variant flex items-center justify-center ${isSelected ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant'}`}><span className="text-xs font-bold">{isSelected ? '✓' : '+'}</span></span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="xl:col-span-4 space-y-6 xl:sticky xl:top-24">
            <div className="cp-summary p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4 border-b-2 border-outline-variant pb-4 mb-5">
                <div><p className="dc-mono text-[10px] uppercase tracking-[0.16em] text-primary">PATH PROFILE</p><h3 className="dc-display text-3xl mt-1">INTERESTS</h3></div>
                <Compass className="w-6 h-6" />
              </div>

              {selectedDomains.length ? (
                <div className="flex flex-wrap gap-2 mb-6">
                  {selectedDomains.map((domain) => <div key={domain} className="cp-chip"><span>{domain}</span><button type="button" onClick={() => toggleDomain(domain)} aria-label={`Remove ${domain}`}><X className="w-3.5 h-3.5" /></button></div>)}
                </div>
              ) : (
                <div className="border-2 border-dashed border-outline-variant p-5 mb-6 text-center"><p className="dc-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">No path selected yet</p><p className="mt-2 text-xs text-on-surface-variant">Choose at least one domain to personalize your workspace.</p></div>
              )}

              <div className="cp-ai p-4 mb-6">
                <div className="flex items-center gap-2 mb-2 text-sm font-bold"><Sparkles className="w-4 h-4" /><span className="dc-mono text-[10px] uppercase tracking-[0.12em]">RECOMMENDATION SIGNAL</span></div>
                <p className="text-xs leading-relaxed text-on-surface-variant">{primaryPath ? <>Your first interest is <strong className="text-on-surface">{primaryPath}</strong>. This signal can later be combined with your profile and activity for smarter recommendations.</> : 'Your selected paths will become a core signal for future learning and connection recommendations.'}</p>
              </div>

              <button type="button" onClick={handleFinish} disabled={!selectedDomains.length || isSaving} className="cp-cta w-full min-h-14 px-5 py-4 font-bold uppercase tracking-[0.08em] text-sm flex items-center justify-center gap-3 disabled:opacity-45 disabled:cursor-not-allowed">
                <span>{isSaving ? 'SAVING PATH...' : 'CONTINUE TO MISSION CONTROL'}</span><ArrowRight className="w-5 h-5" />
              </button>
            </div>

            <div className="cp-journey p-6 sm:p-7">
              <div className="flex items-center justify-between border-b-2 border-outline-variant pb-4 mb-5"><div><p className="dc-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">ONBOARDING</p><h3 className="dc-display text-2xl mt-1">YOUR JOURNEY</h3></div><span className="dc-mono text-[9px] uppercase tracking-[0.12em] text-primary">3 / 3</span></div>
              <div className="cp-journey-line text-xs">
                <div className="cp-journey-item is-complete"><span className="cp-journey-dot"><Check className="w-3 h-3" /></span><p className="font-bold">Account Created</p><p className="dc-mono text-[9px] uppercase text-on-surface-variant mt-1">Complete</p></div>
                <div className="cp-journey-item is-complete"><span className="cp-journey-dot"><Check className="w-3 h-3" /></span><p className="font-bold">Profile Configured</p><p className="dc-mono text-[9px] uppercase text-on-surface-variant mt-1">Complete</p></div>
                <div className="cp-journey-item is-active"><span className="cp-journey-dot"><span className="w-2 h-2 bg-current" /></span><p className="font-bold text-primary">Path Selection</p><p className="dc-mono text-[9px] uppercase text-primary mt-1">In progress</p></div>
                <div className="cp-journey-item opacity-50"><span className="cp-journey-dot"><Lock className="w-2.5 h-2.5" /></span><p className="font-bold">First Capstone</p><p className="dc-mono text-[9px] uppercase text-on-surface-variant mt-1">Unlocks in Mission Control</p></div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
