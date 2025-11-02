
'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useSiteSettings } from './site-settings-context';
import { BASE_THEMES } from '@/themes';
import type { Theme } from '@/types';

interface ThemeContextType {
  theme: string;
  setTheme: (themeId: string) => void;
  allThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function generateThemeCss(theme: Theme): string {
    return `
    .theme-${theme.id} {
      --background: ${theme.background};
      --foreground: ${theme.foreground};
      --card: ${theme.card};
      --card-foreground: ${theme.cardForeground};
      --popover: ${theme.popover};
      --popover-foreground: ${theme.popoverForeground};
      --primary: ${theme.primary};
      --primary-foreground: ${theme.primaryForeground};
      --secondary: ${theme.secondary};
      --secondary-foreground: ${theme.secondaryForeground};
      --muted: ${theme.muted};
      --muted-foreground: ${theme.mutedForeground};
      --accent: ${theme.accent};
      --accent-foreground: ${theme.accentForeground};
      --destructive: ${theme.destructive};
      --destructive-foreground: ${theme.destructiveForeground};
      --border: ${theme.border};
      --input: ${theme.input};
      --ring: ${theme.ring};
      --radius: ${theme.radius}rem;
      --radius-card: ${theme.radiusCard}rem;
      --radius-button: ${theme.radiusButton}rem;
      --radius-input: ${theme.radiusInput}rem;
      --radius-dialog: ${theme.radiusDialog}rem;
    }
  `;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, loading: settingsLoading } = useSiteSettings();
  const [theme, setThemeState] = useState('default-dark');
  const [allThemes, setAllThemes] = useState<Theme[]>(BASE_THEMES);

  // Combine base themes and custom themes from settings
  useEffect(() => {
    if (!settingsLoading && settings.customThemes) {
      setAllThemes([...BASE_THEMES, ...settings.customThemes]);
    }
  }, [settings, settingsLoading]);

  // Set initial theme based on user settings or admin default
  useEffect(() => {
    if (!settingsLoading) {
        // TODO: Later, check for user's preference in localStorage first
        const defaultTheme = settings.defaultThemeId || 'default-dark';
        setThemeState(defaultTheme);
    }
  }, [settings, settingsLoading]);
  
  // Apply theme class to body and inject custom theme styles
  useEffect(() => {
    document.body.className = ''; // Clear existing theme classes
    const themeClass = `theme-${theme}`;
    document.body.classList.add(themeClass);

    // Inject custom theme styles into the head
    const styleElement = document.getElementById('custom-themes-style') || document.createElement('style');
    styleElement.id = 'custom-themes-style';
    
    const customThemes = settings.customThemes || [];
    styleElement.innerHTML = customThemes.map(generateThemeCss).join('\n');
    
    document.head.appendChild(styleElement);

  }, [theme, settings.customThemes]);


  const setTheme = useCallback((themeId: string) => {
    const newTheme = allThemes.find(t => t.id === themeId);
    if (newTheme) {
      setThemeState(newTheme.id);
    } else {
      setThemeState('default-dark'); // Fallback
    }
  }, [allThemes]);

  const value = useMemo(() => ({ theme, setTheme, allThemes }), [theme, setTheme, allThemes]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
