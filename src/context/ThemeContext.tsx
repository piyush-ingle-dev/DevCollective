import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const TRANSITION_MS = 620;

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('devcollective_theme') as Theme | null;
    return saved === 'dark' || saved === 'light' ? saved : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('light', theme === 'light');
    root.style.colorScheme = theme;
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    if (newTheme === theme) return;

    const root = document.documentElement;
    root.classList.add('theme-transitioning');

    // Apply the new theme immediately so the UI always switches reliably.
    root.classList.toggle('dark', newTheme === 'dark');
    root.classList.toggle('light', newTheme === 'light');
    root.style.colorScheme = newTheme;

    setThemeState(newTheme);
    localStorage.setItem('devcollective_theme', newTheme);

    window.setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, TRANSITION_MS);
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
