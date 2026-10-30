import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export const MotionSystem = () => {
  const { activeTab } = useAuth();

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    const lenis = new Lenis({
      duration: 1.05,
      smoothWheel: true,
      syncTouch: false,
    });

    lenis.on('scroll', ScrollTrigger.update);

    const ticker = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(ticker);
    gsap.ticker.lagSmoothing(0);

    const revealTargets = document.querySelectorAll<HTMLElement>('[data-gsap-reveal]');
    const animations = Array.from(revealTargets, (element) => gsap.fromTo(
      element,
      { autoAlpha: 0, y: 32 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: element,
          start: 'top 86%',
          once: true,
        },
      }
    ));

    ScrollTrigger.refresh();

    return () => {
      animations.forEach((animation) => animation.kill());
      gsap.ticker.remove(ticker);
      lenis.destroy();
    };
  }, [activeTab]);

  return null;
};
