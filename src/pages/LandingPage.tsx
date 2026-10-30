import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Marquee } from '../components/Marquee';
import { ScrollReveal } from '../components/ScrollReveal';
import { SystemSignal } from '../components/SystemSignal';
import { FluidShader } from '../components/FluidShader';
import { DeveloperNotePage } from './DeveloperNotePage';
import { Button, Goldeneye, GradientText, MockIDE, LogoMarquee, Rotator, SlippyWords } from 'performative-ui';
import 'performative-ui/styles.css';
import gsap from 'gsap';
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  GitBranch,
  Terminal,
  Trophy,
  UserCheck,
  Users,
} from 'lucide-react';

const modules = [
  { number: '01', title: 'COMMUNITY', description: 'Find builders, share progress, exchange feedback, and work alongside people on the same climb.', icon: Users, tone: 'dc-pastel-lavender', action: 'community' as const },
  { number: '02', title: 'ROADMAPS', description: 'Turn a vague career goal into a sequence of skills, projects, milestones, and proof of work.', icon: GitBranch, tone: 'dc-pastel-mint', action: 'roadmap' as const },
  { number: '03', title: 'MENTORS', description: 'Get perspective from experienced developers that goes beyond tutorials and course checklists.', icon: UserCheck, tone: 'dc-pastel-yellow', action: 'mentors' as const },
  { number: '04', title: 'REPUTATION', description: 'Make your work visible. Consistency, projects, contributions, and mentoring become part of your developer identity.', icon: Trophy, tone: 'dc-pastel-pink', action: 'leaderboard' as const },
];

const marqueeItems = ['LEARN BY SHIPPING', 'BUILD IN PUBLIC', 'FIND YOUR PEOPLE', 'MENTORSHIP', 'ROADMAPS', 'PROOF OF WORK', 'SHIP IT', 'C·FLOW READY'];
const CFLOW_LANDING_URL = 'https://cflow-landing-web.onrender.com';

const DeveloperNoteEnvelope: React.FC<{ onOpen: () => void }> = ({ onOpen }) => {
  const [hovered, setHovered] = useState(false);
  const ref = React.useRef<HTMLButtonElement>(null);

  const open = () => {
    setHovered(true);
    if (ref.current) {
      gsap.to(ref.current, { y: -6, duration: 0.45, ease: 'power3.out' });
      gsap.to(ref.current.querySelector('.dn-envelope-flap'), { rotateX: -178, transformOrigin: '50% 0%', duration: 0.65, ease: 'power3.inOut' });
      gsap.to(ref.current.querySelector('.dn-envelope-letter'), { y: -30, duration: 0.65, delay: 0.08, ease: 'back.out(1.7)' });
      gsap.to(ref.current.querySelector('.dn-envelope-seal'), { scale: 0.86, opacity: 0.2, duration: 0.35, ease: 'power2.out' });
    }
  };
  const close = () => {
    setHovered(false);
    if (ref.current) {
      gsap.to(ref.current, { y: 0, duration: 0.45, ease: 'power3.out' });
      gsap.to(ref.current.querySelector('.dn-envelope-flap'), { rotateX: 0, duration: 0.55, ease: 'power3.inOut' });
      gsap.to(ref.current.querySelector('.dn-envelope-letter'), { y: 0, duration: 0.5, ease: 'power3.out' });
      gsap.to(ref.current.querySelector('.dn-envelope-seal'), { scale: 1, opacity: 1, duration: 0.35, ease: 'power2.out' });
    }
  };

  return (
    <section className="relative border-t-2 border-outline-variant bg-[#F3EBDD]" data-gsap-reveal>
      <FluidShader className="absolute inset-0 z-0 h-full w-full" />
      <div className="relative z-10 max-w-[1500px] mx-auto px-5 sm:px-8 lg:px-12 py-20 sm:py-24">
        <div className="flex flex-col items-center text-center">
          <div className="w-full max-w-[1180px] mx-auto mb-16 sm:mb-20">
            <div className="flex items-start gap-5 mb-8">
              <span className="dc-mono text-[9px] uppercase tracking-[0.2em] text-[#171717]/55 pt-3 shrink-0">04 / THE STACK</span>
              <div>
                <h2 className="dc-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl text-[#171717] leading-[0.9]">WORDS I BUILD WITH.</h2>
                <p className="mt-5 max-w-2xl text-sm sm:text-base leading-relaxed text-[#171717]/60">
                  Scroll through the tools, ideas and systems that shape how I build.
                </p>
              </div>
            </div>
            <div className="border-y-2 border-[#171717]/15 py-5 overflow-hidden">
              <SlippyWords
                rows={[
                  ['REACT', 'TYPESCRIPT', 'VITE', 'TAILWIND CSS', 'GSAP', 'SCROLLTRIGGER', 'LENIS'],
                  ['THREE.JS', 'NODE.JS', 'EXPRESS', 'POSTGRESQL', 'SUPABASE', 'CLERK', 'GITHUB'],
                  ['SYSTEM DESIGN', 'DSA', 'FULL STACK', 'OPEN SOURCE', 'BUILD IN PUBLIC', 'SHIP IT'],
                ]}
                gradient
                intensity={360}
                startDirection="left"
                gap={14}
                fade
                style={{
                  ['--pui-grad-from' as string]: '#E83E8C',
                  ['--pui-grad-mid' as string]: '#F2C14E',
                  ['--pui-grad-to' as string]: '#8E7CFF',
                  ['--pui-grad' as string]: 'linear-gradient(120deg, #E83E8C 0%, #F2C14E 52%, #8E7CFF 100%)',
                }}
              />
            </div>
          </div>
          <div className="flex flex-col items-center text-center">
            <p className="dc-mono text-[9px] uppercase tracking-[0.22em] mb-4 text-[#171717]/60">[ 07 / A SMALL NOTE ]</p>
            <h2 className="dc-display text-4xl sm:text-5xl lg:text-6xl text-[#171717]">There is a note behind the work.</h2>
            <p className="mt-4 max-w-md text-sm sm:text-base text-[#171717]/65 leading-relaxed">Hover the envelope. Open the developer's notebook.</p>
          <button ref={ref} type="button" aria-label="Open Developer's Note" onMouseEnter={open} onMouseLeave={close} onFocus={open} onBlur={close} onClick={onOpen} className={`group relative mt-12 w-[170px] h-[122px] cursor-pointer [perspective:900px] ${hovered ? 'z-10' : ''}`}>
            <span className="absolute left-1/2 -translate-x-1/2 bottom-[-18px] w-[130px] h-5 rounded-full bg-black/10 blur-xl transition-opacity duration-500 group-hover:opacity-50" />
            <span className="dn-envelope-letter absolute left-[18px] right-[18px] bottom-[13px] h-[86px] bg-[#FFF9F0] border-2 border-[#171717] z-[1] flex flex-col items-center justify-center shadow-[0_8px_0_rgba(23,23,23,0.08)]">
              <span className="dc-mono text-[8px] uppercase tracking-[0.18em] text-[#171717]/55">PRIVATE / NOTE</span>
              <span className="dc-display text-xl text-[#171717] mt-1">for builders</span>
            </span>
            <span className="absolute inset-0 bg-[#D7C7AF] border-2 border-[#171717] z-[2] overflow-hidden shadow-[0_10px_0_rgba(23,23,23,0.1)]">
              <span className="absolute left-0 bottom-0 w-0 h-0 border-l-[83px] border-l-transparent border-r-[83px] border-r-transparent border-b-[62px] border-b-[#CBB89D]" />
              <span className="absolute right-0 bottom-0 w-0 h-0 border-l-[83px] border-l-transparent border-r-[83px] border-r-transparent border-b-[62px] border-b-[#E1D2BB]" />
            </span>
            <span className="dn-envelope-flap absolute left-0 top-0 w-full h-[78px] bg-[#E6D7C0] border-2 border-[#171717] z-[4] [clip-path:polygon(0_0,100%_0,50%_100%)] [transform-style:preserve-3d]" />
            <span className="dn-envelope-seal absolute z-[5] left-1/2 top-[48px] -translate-x-1/2 w-8 h-8 rounded-full bg-[#171717] text-[#F3EBDD] flex items-center justify-center font-mono text-[9px] shadow-md">DC</span>
          </button>
          <span className="mt-7 dc-mono text-[8px] uppercase tracking-[0.18em] text-[#171717]/45">{hovered ? 'CLICK TO OPEN' : 'HOVER TO UNSEAL'}</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export const LandingPage: React.FC = () => {
  const { setActiveTab } = useAuth();
  const [showDeveloperNote, setShowDeveloperNote] = useState(false);

  useEffect(() => {
    if (!showDeveloperNote) return;

    // The note replaces the landing page in-place, so explicitly reset the
    // browser scroll position after the new page has rendered.
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
    const timeout = window.setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, 120);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [showDeveloperNote]);

  if (showDeveloperNote) {
    return <DeveloperNotePage onBack={() => setShowDeveloperNote(false)} />;
  }

  return (
    <div className="dc-public min-h-screen overflow-hidden">
      <section className="relative min-h-[calc(100vh-74px)] border-b-2 border-outline-variant" data-gsap-reveal>
        <div className="relative max-w-[1500px] mx-auto px-5 sm:px-8 lg:px-12 pt-8 sm:pt-12 lg:pt-16 pb-10">
          <div className="flex items-center justify-between gap-4 border-b-2 border-outline-variant pb-4">
            <span className="dc-mono text-[10px] sm:text-xs uppercase tracking-[0.18em]">DC / 00 — Developer Collective</span>
            <span className="dc-mono text-[10px] sm:text-xs uppercase tracking-[0.18em] hidden sm:block">LEARN → BUILD → COLLABORATE → SHIP</span>
          </div>
          <div className="pt-12 sm:pt-16 lg:pt-20 grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-16 items-center">
            <div>
              <p className="dc-mono text-[10px] sm:text-xs uppercase tracking-[0.22em] mb-6">A technical collective for developers in the making.</p>
              <GradientText
                as="h1"
                className="dc-display text-[clamp(4rem,10vw,9.5rem)] max-w-6xl"
                style={{
                  ['--pui-grad-from' as string]: '#E83E8C',
                  ['--pui-grad-mid' as string]: '#F2C14E',
                  ['--pui-grad-to' as string]: '#8E7CFF',
                }}
              >
                LEARN.<br />
                <Rotator words={['BUILD.', 'SHIP.']} typeMs={90} deleteMs={55} holdMs={1200} />
              </GradientText>
              <p className="mt-8 text-base sm:text-lg leading-relaxed text-on-surface-variant max-w-xl">DevCollective connects community, mentorship, learning paths, projects, and reputation into one serious developer workspace.</p>
              <div className="mt-8 flex flex-wrap gap-3"><Button variant="shimmer" onClick={() => setActiveTab('register')} className="font-bold uppercase tracking-wide">Join the collective <ArrowRight className="w-4 h-4" /></Button><Button variant="shimmer" onClick={() => setActiveTab('login')} className="font-bold uppercase tracking-wide">Sign in</Button></div>
            </div>
            <div className="border-2 border-outline-variant bg-[#0B0B0F] dc-hard-shadow p-3 sm:p-4" data-gsap-reveal>
              <MockIDE
                filename="~/devcollective/api/route.ts"
                tokens={[
                  { c: '// devcollective / community route\n', cls: 'com' },
                  { c: 'export async function ', cls: 'key' },
                  { c: 'getCommunityFeed', cls: 'fn' },
                  { c: '() {\n', cls: '' },
                  { c: '  const ', cls: 'key' },
                  { c: 'posts', cls: '' },
                  { c: ' = ', cls: 'key' },
                  { c: 'await ', cls: 'fn' },{ c: 'db.posts', cls: 'fn' },
                  { c: '.find({ visibility: ', cls: '' },
                  { c: '"public"', cls: 'str' },
                  { c: ' })\n', cls: '' },
                  { c: '    .sort({ ', cls: '' },
                  { c: 'createdAt: -1', cls: 'key' },
                  { c: ' });\n\n', cls: '' },
                  { c: '  return ', cls: 'key' },
                  { c: '{ posts, reputation: true };\n', cls: '' },
                  { c: '}\n', cls: '' },
                ]}
                loop
                charMs={[18, 38]}
                thinkingLabel={false}
              />
            </div>
          </div>
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 border-2 border-outline-variant">{[['01', 'COMMUNITY'], ['02', 'MENTORSHIP'], ['03', 'PROOF OF WORK'], ['04', 'C·FLOW READY']].map(([number, label], index) => <ScrollReveal key={number} delay={index * 70}><div className="p-5 sm:p-6 min-h-[105px] border-b-2 md:border-b-0 md:border-r-2 last:border-r-0 border-outline-variant bg-surface"><div className="dc-mono text-[10px] mb-4">{number}</div><div className="font-bold text-sm tracking-tight">{label}</div></div></ScrollReveal>)}</div>
        </div>
      </section>

      <section className="border-b-2 border-outline-variant bg-surface" data-gsap-reveal>
        <div className="max-w-[1500px] mx-auto px-5 sm:px-8 lg:px-12 py-10 sm:py-14">
          <div className="flex items-center justify-between border-b-2 border-outline-variant pb-4 mb-5">
            <span className="dc-mono text-[9px] uppercase tracking-[0.18em]">01 / CURRENT MISSION</span>
            <span className="dc-mono text-[9px] uppercase tracking-[0.18em]">LIVE / DEV WORKSPACE</span>
          </div>
          <div className="border-2 border-outline-variant bg-surface dc-hard-shadow">
            <div className="flex items-center justify-between border-b-2 border-outline-variant px-4 py-3">
              <span className="dc-mono text-[9px] uppercase tracking-[0.16em]">MISSION CONTROL</span>
              <span className="flex items-center gap-2 dc-mono text-[9px] uppercase"><span className="dc-status-dot" /> READY</span>
            </div>
            <div className="grid lg:grid-cols-[1.35fr_0.65fr] min-h-[360px]">
              <div className="bg-dc-blue border-b-2 lg:border-b-0 lg:border-r-2 border-outline-variant p-6 sm:p-8 font-mono text-xs sm:text-sm text-[#171717]">
                <div className="dc-mono text-[9px] uppercase tracking-[0.16em] mb-8">01 / CURRENT MISSION</div>
                <pre className="leading-[1.8] whitespace-pre-wrap">{`const mission = {\n  goal: "BUILD A PROJECT",\n  path: "FULL STACK",\n  status: "ACTIVE"\n};\n\nmission.progress = 72;\nship(mission);`}</pre>
                <div className="mt-8 border-t-2 border-[#171717] pt-4 flex justify-between dc-mono text-[9px] uppercase"><span>TRACE / 006</span><span>72%</span></div>
              </div>
              <div className="bg-dc-lavender p-5 sm:p-6 flex flex-col justify-between text-[#171717]">
                <div>
                  <div className="dc-mono text-[9px] uppercase tracking-[0.16em]">STATE / ACTIVE</div>
                  <div className="mt-5 space-y-3 dc-mono text-[10px] uppercase">
                    <div className="border-2 border-[#171717] bg-dc-mint p-3">LEARN <span className="float-right">✓</span></div>
                    <div className="border-2 border-[#171717] bg-dc-yellow p-3">BUILD <span className="float-right">→</span></div>
                    <div className="border-2 border-[#171717] bg-[#FFF9F0] p-3">COLLABORATE <span className="float-right">03</span></div>
                    <div className="border-2 border-[#171717] bg-dc-pink p-3">SHIP <span className="float-right">NEXT</span></div>
                  </div>
                </div>
                <div className="pt-6 dc-mono text-[9px] uppercase leading-relaxed">REP +120<br />STREAK 08 DAYS<br />FLOW STATE READY</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Marquee items={marqueeItems} />

      <section className="border-b-2 border-outline-variant bg-[#171717] text-[#FFF9F0]" data-gsap-reveal>
        <div className="max-w-[1500px] mx-auto px-5 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between border-b border-white/15 py-5">
            <p className="dc-mono text-[9px] uppercase tracking-[0.2em] text-white/55">[ 00 / THE STACK ]</p>
            <p className="hidden dc-mono text-[9px] uppercase tracking-[0.16em] text-white/35 sm:block">TOOLS WE BUILD WITH</p>
          </div>
          <div className="py-2">
            <LogoMarquee
              logos={[
                { kind: 'node', node: 'React', key: 'react' },
                { kind: 'node', node: 'TypeScript', key: 'typescript' },
                { kind: 'node', node: 'Node.js', key: 'node' },
                { kind: 'node', node: 'Express', key: 'express' },
                { kind: 'node', node: 'PostgreSQL', key: 'postgresql' },
                { kind: 'node', node: 'Supabase', key: 'supabase' },
                { kind: 'node', node: 'GitHub', key: 'github' },
                { kind: 'node', node: 'Vite', key: 'vite' },
                { kind: 'node', node: 'GSAP', key: 'gsap' },
                { kind: 'node', node: 'Three.js', key: 'three' },
              ]}
              speed={34}
              gap={64}
              fade
              pauseOnHover
            />
          </div>
        </div>
      </section>

      <section className="border-b-2 border-outline-variant bg-[#171717] text-[#FFF9F0]" data-gsap-reveal>
        <div className="max-w-[1500px] mx-auto px-5 sm:px-8 lg:px-12 py-8 sm:py-10">
          <div className="flex items-center justify-between border-b border-white/15 pb-5 mb-5">
            <p className="dc-mono text-[9px] uppercase tracking-[0.2em] text-white/55">[ 01 / THE LAB ]</p>
            <p className="hidden dc-mono text-[9px] uppercase tracking-[0.16em] text-white/35 sm:block">MOVE THROUGH THE SYSTEM</p>
          </div>
          <div className="border-2 border-white/15 overflow-hidden">
            <Goldeneye
              text_default="TUTORIAL"
              text_reveal="PROJECT"
              pattern="0 1 0 1 "
              pattern_size_default={14}
              pattern_size_reveal={22}
              scopeSize={320}
              fontSize="clamp(56px, 11vw, 160px)"
              fontFamily="var(--dc-display-font, Inter, ui-sans-serif, system-ui, sans-serif)"
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4">
            <p className="dc-mono text-[9px] uppercase tracking-[0.16em] text-white/45">CURSOR / ACTIVE</p>
            <p className="text-xs text-white/45">Move across the field to turn learning into something real.</p>
          </div>
        </div>
      </section>

      <section className="max-w-[1500px] mx-auto px-5 sm:px-8 lg:px-12 py-24 sm:py-32" data-gsap-reveal><ScrollReveal><div className="grid lg:grid-cols-[0.3fr_1.7fr] gap-8 lg:gap-16"><div className="dc-mono text-xs uppercase tracking-[0.2em]">[ 01 / THE PROBLEM ]</div><div><h2 className="dc-display text-5xl sm:text-6xl lg:text-8xl max-w-5xl">Learning is static. <span className="text-primary">Building isn't.</span></h2><p className="mt-10 max-w-2xl text-lg leading-relaxed text-on-surface-variant">Tutorials can tell you what to learn. DevCollective helps you turn that knowledge into projects, conversations, feedback, contributions, and a visible body of work.</p><div className="mt-10 flex flex-wrap gap-2 dc-mono text-[9px] uppercase tracking-[0.12em]"><span className="border-2 border-outline-variant bg-dc-yellow px-3 py-2">SKILL → PROJECT</span><span className="border-2 border-outline-variant bg-dc-mint px-3 py-2">PROJECT → FEEDBACK</span><span className="border-2 border-outline-variant bg-dc-lavender px-3 py-2">FEEDBACK → SHIP</span></div></div></div></ScrollReveal></section>
      <Marquee items={['SHIP SOMETHING', 'GET FEEDBACK', 'ITERATE', 'HELP SOMEONE', 'LEVEL UP', 'REPEAT']} reverse className="bg-secondary-container" />

      <section className="border-y-2 border-outline-variant bg-surface-container-lowest" data-gsap-reveal><div className="max-w-[1500px] mx-auto px-5 sm:px-8 lg:px-12 py-24 sm:py-32"><ScrollReveal><div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12"><div><p className="dc-mono text-xs uppercase tracking-[0.2em] mb-4">[ 02 / THE SYSTEM ]</p><h2 className="dc-display text-5xl sm:text-6xl lg:text-7xl">One ecosystem.<br /><span className="text-primary">Many ways to grow.</span></h2></div><p className="dc-mono text-[10px] uppercase tracking-[0.15em] text-on-surface-variant max-w-xs">Every module feeds the same loop: learn, build, collaborate, ship.</p></div></ScrollReveal><div className="grid md:grid-cols-2 border-t-2 border-l-2 border-outline-variant">{modules.map((module, index) => { const Icon = module.icon; return <ScrollReveal key={module.number} delay={index * 80} className="h-full"><button onClick={() => setActiveTab(module.action)} className="group relative w-full h-full min-h-[330px] text-left border-r-2 border-b-2 border-outline-variant p-7 sm:p-9 bg-background hover:bg-surface"><div className="flex items-start justify-between gap-5"><span className="dc-mono text-xs text-on-surface-variant">{module.number}</span><span className={`w-12 h-12 flex items-center justify-center border-2 border-outline-variant ${module.tone} dc-hard-shadow-sm`}><Icon className="w-5 h-5" /></span></div><div className="mt-16 sm:mt-20 flex items-end justify-between gap-8"><div><h3 className="dc-display text-4xl sm:text-5xl mb-4 group-hover:text-primary">{module.title}</h3><p className="text-sm sm:text-base leading-relaxed text-on-surface-variant max-w-md">{module.description}</p></div><ArrowDownRight className="w-7 h-7 shrink-0 group-hover:translate-x-1 group-hover:translate-y-1 transition-transform" /></div></button></ScrollReveal>; })}</div></div></section>

      <section className="max-w-[1500px] mx-auto px-5 sm:px-8 lg:px-12 py-24 sm:py-32" data-gsap-reveal><ScrollReveal><div className="border-2 border-outline-variant bg-dc-yellow p-7 sm:p-10 lg:p-14 dc-hard-shadow"><div className="grid lg:grid-cols-[0.6fr_1.4fr] gap-12 items-start"><div><p className="dc-mono text-xs uppercase tracking-[0.2em] mb-5">[ 03 / THE LOOP ]</p><h2 className="dc-display text-5xl sm:text-6xl lg:text-7xl">Learn.<br />Build.<br />Collaborate.<br />Ship.</h2></div><div className="grid sm:grid-cols-4 border-2 border-outline-variant">{[{ n: '01', title: 'LEARN', text: 'Find the next skill.' }, { n: '02', title: 'BUILD', text: 'Turn it into proof.' }, { n: '03', title: 'COLLABORATE', text: 'Get feedback and help.' }, { n: '04', title: 'SHIP', text: 'Finish what you started.' }].map((step, index) => <div key={step.n} className={`p-6 sm:p-7 bg-[#FFF9F0] ${index < 3 ? 'border-b-2 sm:border-b-0 sm:border-r-2' : ''} border-outline-variant`}><span className="dc-mono text-[10px]">{step.n}</span><h3 className="dc-display text-3xl mt-12 mb-3">{step.title}</h3><p className="text-sm text-on-surface-variant leading-relaxed">{step.text}</p></div>)}</div></div></div></ScrollReveal></section>

      <section className="border-y-2 border-outline-variant bg-dc-lavender" data-gsap-reveal><div className="max-w-[1500px] mx-auto px-5 sm:px-8 lg:px-12 py-20 sm:py-24"><ScrollReveal><div className="grid lg:grid-cols-[1fr_auto] gap-10 items-center"><div><div className="flex items-center gap-3 dc-mono text-xs uppercase tracking-[0.2em] mb-5"><Terminal className="w-4 h-4" />04 / C·FLOW — VISUAL EXECUTION</div><h2 className="dc-display text-5xl sm:text-6xl lg:text-8xl text-[#171717] max-w-5xl">Understand the flow.<br /><span className="text-primary">See the execution.</span></h2><p className="mt-6 max-w-3xl text-base sm:text-lg leading-relaxed text-[#171717]/75">C·FLOW turns C and C++ code into a visual execution experience. Parse the program, follow control flow, inspect state changes, and understand what happens step by step instead of reading a wall of code and guessing.</p><div className="mt-8 grid sm:grid-cols-3 gap-3">{[{ n: '01', title: 'PARSE', text: 'Read the structure of your C/C++ program.' }, { n: '02', title: 'EXECUTE', text: 'Follow statements and state changes step by step.' }, { n: '03', title: 'VISUALIZE', text: 'See control flow, loops, branches, and execution state.' }].map((item) => <div key={item.n} className="border-2 border-[#171717] bg-[#FFF9F0] p-5 sm:p-6"><span className="dc-mono text-[10px]">{item.n}</span><h3 className="dc-display text-2xl sm:text-3xl mt-8 mb-2">{item.title}</h3><p className="text-sm leading-relaxed text-[#171717]/70">{item.text}</p></div>)}</div><div className="mt-8 flex flex-wrap items-center gap-3"><a href={CFLOW_LANDING_URL} target="_blank" rel="noreferrer" className="dc-hard-shadow-sm inline-flex items-center gap-3 px-6 py-4 bg-[#171717] text-[#FFF9F0] border-2 border-[#171717] font-bold uppercase tracking-wide">Open C·FLOW <ArrowRight className="w-4 h-4" /></a><span className="dc-mono text-[9px] uppercase tracking-[0.14em] text-[#171717]/60">Dedicated visual execution environment</span></div></div><div className="border-2 border-[#171717] bg-[#FFF9F0] p-6 sm:p-8 dc-hard-shadow-sm min-w-[250px]"><div className="flex items-start justify-between gap-4"><SystemSignal /><Activity className="w-5 h-5" /></div><div className="dc-mono text-[10px] uppercase tracking-[0.16em] mt-7">Integration status</div><div className="dc-display text-4xl mt-2">LIVE / READY</div><div className="mt-5 border-t-2 border-[#171717] pt-4 dc-mono text-[9px] uppercase leading-relaxed">C·FLOW / VISUAL EXECUTION<br />DEVCO / COMMUNITY LAYER</div></div></div></ScrollReveal></div></section>

      <section className="max-w-[1500px] mx-auto px-5 sm:px-8 lg:px-12 py-24 sm:py-36" data-gsap-reveal><ScrollReveal><div className="text-center"><p className="dc-mono text-xs uppercase tracking-[0.22em] mb-6">[ 06 / YOUR TURN ]</p><h2 className="dc-display text-[clamp(4rem,10vw,9rem)]">MAKE SOMETHING.<br /><span className="text-primary">SHIP IT.</span></h2><p className="max-w-xl mx-auto mt-8 text-lg text-on-surface-variant leading-relaxed">Your next project, mentor, roadmap, and collaborator are closer than you think.</p><div className="mt-9 flex justify-center gap-3 flex-wrap"><Button variant="shimmer" onClick={() => setActiveTab('register')} className="font-bold uppercase tracking-wide">Join DevCollective <ArrowRight className="w-4 h-4" /></Button><button onClick={() => setActiveTab('roadmap')} className="inline-flex items-center gap-3 px-8 py-4 bg-surface border-2 border-outline-variant font-bold uppercase tracking-wide">Explore roadmap</button></div></div></ScrollReveal></section>

      <DeveloperNoteEnvelope onOpen={() => setShowDeveloperNote(true)} />
      <footer className="border-t-2 border-outline-variant px-5 sm:px-8 lg:px-12 py-8 max-w-[1500px] mx-auto flex flex-col sm:flex-row gap-4 justify-between dc-mono text-[10px] uppercase tracking-[0.15em] text-on-surface-variant"><span>DEV_COLLECTIVE / 2026</span><span>LEARN. BUILD. COLLABORATE. SHIP.</span></footer>
    </div>
  );
};
