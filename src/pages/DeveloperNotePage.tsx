import React, { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowLeft, ArrowUpRight, Code2, Heart, Sparkles } from 'lucide-react';
import { Marquee } from '../components/Marquee';
import { CommunityBadge } from 'performative-ui';
import 'performative-ui/styles.css';

gsap.registerPlugin(ScrollTrigger);

const INK = '#171717';
const PAPER = '#F3EBDD';
const BEIGE = '#D7C7AF';

const people = [
  {
    name: 'Steve Jobs',
    role: 'DESIGN / PRODUCT / CRAFT',
    image: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Stevejobs.jpg',
    note: 'I admire the way Jobs treated technology as a medium for taste, clarity and human experience. The lesson I keep is simple: make the complicated feel inevitable, and care about the details people touch.',
  },
  {
    name: 'Terry A. Davis',
    role: 'SYSTEMS / CURIOSITY / OBSESSION',
    image: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Terry_A._Davis.jpg',
    note: 'Davis represents an extreme kind of independent technical curiosity. TempleOS, his willingness to build from first principles, and his refusal to follow conventional paths are reminders that deep understanding often comes from making the whole thing yourself.',
  },
];

export const DeveloperNotePage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    if (!root.current) return;
    const ctx = gsap.context(() => {
      const intro = gsap.timeline({ defaults: { ease: 'power4.out' } });
      intro.from('.dn-kicker', { y: 18, opacity: 0, duration: 0.6 })
        .from('.dn-title-line', { yPercent: 110, opacity: 0, duration: 0.9, stagger: 0.08 }, '-=0.35')
        .from('.dn-portrait', { clipPath: 'inset(0 0 100% 0)', duration: 1.1 }, '-=0.65')
        .from('.dn-meta', { y: 16, opacity: 0, duration: 0.55 }, '-=0.55');

      gsap.utils.toArray<HTMLElement>('.dn-reveal').forEach((el) => {
        gsap.fromTo(el, { y: 42, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 82%', once: true } });
      });

      gsap.to('.dn-orbit', { rotate: 360, duration: 24, repeat: -1, ease: 'none' });
      ScrollTrigger.refresh();
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="min-h-screen overflow-hidden" style={{ background: PAPER, color: INK }}>
      <header className="sticky top-0 z-40 border-b" style={{ background: `${PAPER}F2`, borderColor: `${INK}22`, backdropFilter: 'blur(14px)' }}>
        <div className="max-w-[1500px] mx-auto px-5 sm:px-8 lg:px-12 h-16 flex items-center justify-between">
          <button onClick={onBack} className="dn-kicker inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] hover:-translate-x-1 transition-transform"><ArrowLeft className="w-4 h-4" /> Back to DevCollective</button>
          <span className="font-mono text-[9px] uppercase tracking-[0.2em]">DC / NOTE / 01</span>
        </div>
      </header>

      <Marquee items={['A NOTE FROM THE DEVELOPER', 'BUILT WITH CURIOSITY', 'DETAILS MATTER', 'MAKE IT FEEL RIGHT']} className="border-b" />

      <main>
        <section className="max-w-[1500px] mx-auto px-5 sm:px-8 lg:px-12 pt-16 sm:pt-24 lg:pt-32 pb-20 sm:pb-28">
          <div className="grid lg:grid-cols-[1.08fr_0.92fr] gap-12 lg:gap-20 items-end">
            <div>
              <div className="dn-kicker font-mono text-[10px] uppercase tracking-[0.25em] mb-7">A DEVELOPER'S NOTE / 2026</div>
              <div className="overflow-hidden"><h1 className="dn-title-line font-black uppercase tracking-[-0.07em] text-[clamp(4.5rem,12vw,11rem)] leading-[0.78]">BUILD</h1></div>
              <div className="overflow-hidden"><h1 className="dn-title-line font-black uppercase tracking-[-0.07em] text-[clamp(4.5rem,12vw,11rem)] leading-[0.78]">WITH</h1></div>
              <div className="overflow-hidden"><h1 className="dn-title-line font-black uppercase tracking-[-0.07em] text-[clamp(4.5rem,12vw,11rem)] leading-[0.78]">INTENT.</h1></div>
              <p className="dn-meta mt-9 max-w-2xl text-base sm:text-lg leading-relaxed opacity-75">DevCollective is a place to learn, build, collaborate and ship — but this note is a little more personal. It is a record of the ideas, people and tiny interactions that shape the way I want to build software.</p>
            </div>

            <div className="dn-portrait relative aspect-[4/5] max-w-[520px] lg:ml-auto overflow-hidden border" style={{ borderColor: INK }}>
              <img src="https://avatars.githubusercontent.com/u/180741280?v=4" alt="Developer portrait" className="w-full h-full object-cover grayscale" />
              <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(135deg, transparent 50%, ${INK}12 50%)` }} />
              <div className="absolute left-4 bottom-4 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.16em]" style={{ background: PAPER, border: `1px solid ${INK}` }}>THE BUILDER / DEVELOPER</div>
            </div>
          </div>
        </section>

        <section className="border-y" style={{ borderColor: `${INK}22` }}>
          <div className="max-w-[1500px] mx-auto px-5 sm:px-8 lg:px-12 py-16 sm:py-24 grid md:grid-cols-3 gap-10">
            <div className="dn-reveal"><span className="font-mono text-[9px] uppercase tracking-[0.18em]">01 / VISION</span><h2 className="mt-5 text-3xl sm:text-4xl font-bold tracking-tight">Build tools people want to return to.</h2></div>
            <div className="dn-reveal md:col-span-2 text-lg leading-relaxed opacity-80 max-w-3xl">I want software to feel alive without becoming noisy. The goal is not to decorate interfaces with animation; it is to use motion, hierarchy and feedback to make a product easier to understand. DevCollective is an experiment in that philosophy: useful first, expressive second, obsessive about the details underneath.</div>
          </div>
        </section>

        <section className="max-w-[1500px] mx-auto px-5 sm:px-8 lg:px-12 py-20 sm:py-28">
          <div className="dn-reveal flex items-end justify-between gap-6 mb-12"><div><span className="font-mono text-[9px] uppercase tracking-[0.18em]">02 / PEOPLE I ADMIRE</span><h2 className="mt-4 text-5xl sm:text-6xl font-black uppercase tracking-[-0.05em]">The makers.</h2></div><Heart className="w-6 h-6" /></div>
          <div className="space-y-20">
            {people.map((person, index) => (
              <article key={person.name} className="dn-reveal grid lg:grid-cols-[0.9fr_1.1fr] gap-8 lg:gap-16 items-center">
                <div className="relative group">
                  <div className="absolute -inset-3 border" style={{ borderColor: `${INK}18`, transform: `rotate(${index ? '-2' : '2'}deg)` }} />
                  <div className="relative aspect-[4/3] overflow-hidden border" style={{ borderColor: INK, background: BEIGE }}><img src={person.image} alt={person.name} className="w-full h-full object-cover grayscale group-hover:scale-[1.03] transition-transform duration-700" /></div>
                  <div className="absolute -bottom-4 left-5 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.15em]" style={{ background: PAPER, border: `1px solid ${INK}` }}>{String(index + 1).padStart(2, '0')} / {person.role}</div>
                </div>
                <div className="lg:pl-8">
                  <h3 className="text-5xl sm:text-7xl font-black uppercase tracking-[-0.06em]">{person.name}</h3>
                  <p className="mt-7 text-lg sm:text-xl leading-relaxed opacity-80 max-w-2xl">{person.note}</p>
                  <div className="mt-8 inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] border px-3 py-2" style={{ borderColor: `${INK}55` }}><ArrowUpRight className="w-3.5 h-3.5" /> influence / independent craft</div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y" style={{ borderColor: `${INK}22`, background: BEIGE }}>
          <div className="max-w-[1500px] mx-auto px-5 sm:px-8 lg:px-12 py-20 sm:py-28">
            <div className="dn-reveal grid lg:grid-cols-[0.8fr_1.2fr] gap-12 items-start">
              <div><span className="font-mono text-[9px] uppercase tracking-[0.18em]">03 / PHILOSOPHY</span><h2 className="mt-5 text-5xl sm:text-7xl font-black uppercase tracking-[-0.06em]">Every touch should answer.</h2></div>
              <div className="relative min-h-[360px] flex items-center justify-center overflow-hidden border" style={{ borderColor: INK, background: PAPER }}>
                <div className="dn-orbit absolute w-72 h-72 rounded-full border" style={{ borderColor: `${INK}22` }} />
                <div className="relative z-10 text-center max-w-md px-8"><Sparkles className="w-7 h-7 mx-auto mb-6" /><p className="text-2xl sm:text-3xl font-bold leading-tight">I admire Apple's attention to micro-interactions — the way a tap, swipe, transition or tiny response makes an interface feel physical.</p><p className="mt-6 font-mono text-[9px] uppercase tracking-[0.18em] opacity-60">Motion should communicate, not distract.</p></div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-[1500px] mx-auto px-5 sm:px-8 lg:px-12 py-16 sm:py-20">
          <div className="dn-reveal grid lg:grid-cols-[0.3fr_1.7fr] gap-8 lg:gap-16 items-start">
            <span className="font-mono text-[9px] uppercase tracking-[0.18em]">04 / FIND ME</span>
            <div>
              <h2 className="text-4xl sm:text-6xl font-black uppercase tracking-[-0.05em]">Across the web.</h2>
              <p className="mt-5 max-w-2xl text-base sm:text-lg leading-relaxed opacity-75">Projects, notes, experiments and the things I am building in public.</p>
              <div className="mt-8 grid md:grid-cols-3 gap-4">
                <CommunityBadge
                  href="https://github.com/inputtext/DevCollective"
                  target="_blank"
                  rel="noreferrer"
                  icon="https://cdn.jsdelivr.net/npm/simple-icons@11/icons/github.svg"
                  title="GitHub"
                  subtitle={<>DevCollective · source & projects</>}
                  className="!w-full"
                />
                <CommunityBadge
                  href="https://www.linkedin.com/in/piyush-kanojiya-b78340358/"
                  target="_blank"
                  rel="noreferrer"
                  icon="https://cdn.jsdelivr.net/npm/simple-icons@11/icons/linkedin.svg"
                  title="LinkedIn"
                  subtitle={<>Connect · professional profile</>}
                  className="!w-full"
                />
                <CommunityBadge
                  href="https://www.instagram.com/_input_text.jpg/"
                  target="_blank"
                  rel="noreferrer"
                  icon="https://cdn.jsdelivr.net/npm/simple-icons@11/icons/instagram.svg"
                  title="Instagram"
                  subtitle={<>_input_text.jpg · daily builds</>}
                  className="!w-full"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-[1500px] mx-auto px-5 sm:px-8 lg:px-12 py-20 sm:py-28">
          <div className="dn-reveal grid lg:grid-cols-[0.3fr_1.7fr] gap-8 lg:gap-16">
            <span className="font-mono text-[9px] uppercase tracking-[0.18em]">04 / THE STACK</span>
            <div>
              <div className="border-2 border-[#171717] bg-[#0B0B0F] px-5 py-4 sm:px-7 sm:py-5 overflow-hidden">
                <div className="flex items-center gap-3 mb-3">
                  <Code2 className="w-5 h-5 text-[#A6FF00] shrink-0" />
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A96]">/ STACK.LOG</span>
                </div>
                <h2 className="font-mono text-2xl sm:text-4xl lg:text-5xl font-bold uppercase tracking-[-0.03em] text-[#A6FF00]">TOOLS I LIKE TO BUILD WITH.</h2>
              </div>
              <p className="mt-7 max-w-3xl text-lg leading-relaxed opacity-75">React, TypeScript, Vite, Tailwind CSS, GSAP, ScrollTrigger, Lenis, Three.js, Node.js, Supabase and Clerk — a stack chosen for fast iteration, expressive interfaces and products that can grow beyond a prototype.</p><div className="mt-8 flex flex-wrap gap-2">{['React', 'TypeScript', 'Vite', 'Tailwind', 'GSAP', 'ScrollTrigger', 'Lenis', 'Three.js', 'Node.js', 'Supabase', 'Clerk'].map((item) => <span key={item} className="font-mono text-[9px] uppercase tracking-[0.12em] border px-3 py-2" style={{ borderColor: `${INK}55` }}>{item}</span>)}</div></div>
          </div>
        </section>
      </main>

      <footer className="border-t" style={{ borderColor: `${INK}22` }}><div className="max-w-[1500px] mx-auto px-5 sm:px-8 lg:px-12 py-10 flex flex-col sm:flex-row justify-between gap-4 font-mono text-[9px] uppercase tracking-[0.16em] opacity-65"><span>DEV_COLLECTIVE / DEVELOPER'S NOTE</span><span>BUILT WITH CURIOSITY / SHIPPED WITH INTENT</span></div></footer>
    </div>
  );
};
