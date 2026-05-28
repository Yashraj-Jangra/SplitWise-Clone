
'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { SiteSettings } from '@/types';
import { getSiteSettings } from '@/lib/mock-data';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const DEFAULT_APP_NAME = 'SettleEase';

interface SiteSettingsContextType {
  settings: SiteSettings;
  loading: boolean;
  updateLocalSettings: (newSettings: Partial<SiteSettings>) => void;
}

const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(undefined);

export const SiteSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SiteSettings>({
      appName: DEFAULT_APP_NAME,
      coverImages: [],
      logoUrl: '',
  } as unknown as SiteSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSettings(isAuthenticated: boolean) {
      try {
        setLoading(true);
        if (isAuthenticated) {
          const siteSettings = await getSiteSettings();
          if (active) setSettings(siteSettings);
        } else {
          const res = await fetch('/api/public/settings');
          if (res.ok) {
            const siteSettings = await res.json();
            if (active) setSettings(siteSettings);
          } else {
            throw new Error('Failed to fetch public settings');
          }
        }
      } catch (error) {
        console.error("Failed to fetch site settings:", error);
      } finally {
        if (active) setLoading(false);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        loadSettings(true);
      } else {
        loadSettings(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const updateLocalSettings = useCallback((newSettings: Partial<SiteSettings>) => {
    setSettings(prev => ({...prev, ...newSettings}));
  }, []);

  const value = useMemo(() => ({ settings, loading, updateLocalSettings }), [settings, loading, updateLocalSettings]);

  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
};

export const useSiteSettings = () => {
  const context = useContext(SiteSettingsContext);
  if (context === undefined) {
    throw new Error('useSiteSettings must be used within a SiteSettingsProvider');
  }
  return context;
};
