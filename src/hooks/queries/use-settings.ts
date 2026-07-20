import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SiteSettings } from '@/types';

async function fetchSiteSettings(): Promise<SiteSettings> {
  const res = await fetch('/api/settings');
  if (!res.ok) throw new Error('Failed to fetch site settings');
  return res.json();
}

async function patchSiteSettings(settings: Partial<SiteSettings>): Promise<void> {
  const res = await fetch('/api/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to update site settings');
}

export function useSiteSettings() {
  return useQuery({
    queryKey: ['site-settings'],
    queryFn: fetchSiteSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes stale time for settings
  });
}

export function useSiteSettingsMutations() {
  const queryClient = useQueryClient();

  const updateSettingsMutation = useMutation({
    mutationFn: (settings: Partial<SiteSettings>) => patchSiteSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
    },
  });

  return {
    updateSettings: updateSettingsMutation,
  };
}
