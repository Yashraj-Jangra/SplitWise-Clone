'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { SiteSettings } from '@/types';
import { getSiteSettings } from '@/lib/mock-data';

const DEFAULT_APP_NAME = 'SettleEase';

interface SiteSettingsContextType {
  settings: SiteSettings;
  loading: boolean;
}

const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(undefined);

export const SiteSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SiteSettings>({
      appName: DEFAULT_APP_NAME,
      coverImages: [],
      logoUrl: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      try {
        setLoading(true);
        const siteSettings = await getSiteSettings();
        setSettings(siteSettings);
      } catch (error) {
        console.error("Failed to fetch site settings:", error);
        // Keep default settings on error
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const value = useMemo(() => ({ settings, loading }), [settings, loading]);

  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
};

export const useSiteSettings = () => {
  const context = useContext(SiteSettingsContext);
  if (context === undefined) {
    throw new Error('useSiteSettings must be used within a SiteSettingsProvider');
  }
  return context;
};
