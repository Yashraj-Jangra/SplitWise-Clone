
'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useSiteSettings } from './site-settings-context';
import { ALL_THEMES } from '@/themes';

interface ThemeContextType {
  theme: string;
  setTheme: (themeId: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, loading: settingsLoading } = useSiteSettings();
  const [theme, setThemeState] = useState('default');

  useEffect(() => {
    if (!settingsLoading && settings.activeTheme) {
      setThemeState(settings.activeTheme);
    }
  }, [settings, settingsLoading]);

  useEffect(() => {
    document.body.className = '';
    const themeClass = ALL_THEMES.find(t => t.id === theme)?.className || 'theme-default';
    document.body.classList.add(themeClass);
  }, [theme]);

  const setTheme = useCallback((themeId: string) => {
    const newTheme = ALL_THEMES.find(t => t.id === themeId);
    if (newTheme) {
      setThemeState(newTheme.id);
    } else {
      setThemeState('default');
    }
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
