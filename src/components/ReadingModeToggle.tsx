import React, { useEffect, useState } from 'react';
import { useUser } from '@clerk/react';
import { Lightbulb } from 'lucide-react';

const STORAGE_PREFIX = 'devcollective_reading_mode:';

export const ReadingModeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { user } = useUser();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setEnabled(false);
      document.documentElement.classList.remove('dc-reading-mode');
      return;
    }

    const saved = window.localStorage.getItem(`${STORAGE_PREFIX}${user.id}`) === 'true';
    setEnabled(saved);
    document.documentElement.classList.toggle('dc-reading-mode', saved);
  }, [user?.id]);

  const toggle = () => {
    if (!user?.id) return;
    const next = !enabled;
    setEnabled(next);
    window.localStorage.setItem(`${STORAGE_PREFIX}${user.id}`, String(next));
    document.documentElement.classList.toggle('dc-reading-mode', next);
  };

  return (
    <button
      onClick={toggle}
      type="button"
      title={enabled ? 'Turn off Reading Mode' : 'Turn on Reading Mode'}
      aria-label={enabled ? 'Turn off Reading Mode' : 'Turn on Reading Mode'}
      aria-pressed={enabled}
      className={`group relative inline-flex items-center justify-center gap-2 p-2 border-2 border-transparent text-on-surface-variant hover:text-primary hover:bg-surface hover:border-outline-variant transition-all duration-200 shrink-0 ${className}`}
    >
      <Lightbulb
        className={`w-5 h-5 transition-transform duration-300 ${enabled ? 'rotate-[-8deg] text-amber-500' : ''}`}
        fill={enabled ? 'currentColor' : 'none'}
      />
      <span className="hidden xl:block dc-mono text-[9px] uppercase tracking-[0.12em] font-bold">
        {enabled ? 'Reading On' : 'Reading Mode'}
      </span>
      <span className="pointer-events-none absolute right-0 top-full mt-2 z-50 whitespace-nowrap border-2 border-outline-variant bg-surface px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-on-surface opacity-0 translate-y-[-2px] transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0">
        {enabled ? 'Warm reading tone · On' : 'Warm reading tone · Off'}
      </span>
    </button>
  );
};
