'use client';

/**
 * ThemeContext:
  * manages the application theme (light/dark/system)
*/

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    // force dark mode
    setTheme('dark');
  }, []);

  useEffect(() => {
    // ensure we're in the browser environment
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (!root) return;

    // force dark mode
    root.classList.remove('light');
    root.classList.add('dark');
    setResolvedTheme('dark');
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}