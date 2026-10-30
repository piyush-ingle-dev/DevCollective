import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
      aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
      aria-pressed={theme === 'dark'}
      className={`group relative inline-flex items-center justify-center p-2 rounded-md text-on-surface-variant hover:text-primary hover:bg-surface border-2 border-transparent hover:border-outline-variant transition-all duration-300 active:scale-95 shrink-0 ${className}`}
    >
      <span className="relative w-5 h-5 flex items-center justify-center">
        <Sun
          className={`w-5 h-5 absolute transition-all duration-500 ease-out ${
            theme === 'light'
              ? 'rotate-0 scale-100 text-amber-500 opacity-100'
              : 'rotate-90 scale-50 text-amber-500 opacity-0'
          }`}
        />
        <Moon
          className={`w-5 h-5 absolute transition-all duration-500 ease-out ${
            theme === 'dark'
              ? 'rotate-0 scale-100 text-primary opacity-100'
              : '-rotate-90 scale-50 text-primary opacity-0'
          }`}
        />
      </span>
      <span className="pointer-events-none absolute right-0 top-full mt-2 z-50 whitespace-nowrap border-2 border-outline-variant bg-surface px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-on-surface opacity-0 translate-y-[-2px] transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0">
        {theme === 'dark' ? 'Dark mode · On' : 'Light mode · On'}
      </span>
    </button>
  );
};
