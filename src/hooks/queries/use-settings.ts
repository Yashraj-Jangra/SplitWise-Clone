import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSiteSettings, updateSiteSettings } from '@/lib/firestore.service';
import type { SiteSettings } from '@/types';

export function useSiteSettings() {
  return useQuery({
    queryKey: ['site-settings'],
    queryFn: () => getSiteSettings(),
    staleTime: 5 * 60 * 1000, // 5 minutes stale time for settings
  });
}

export function useSiteSettingsMutations() {
  const queryClient = useQueryClient();

  const updateSettingsMutation = useMutation({
    mutationFn: (settings: Partial<SiteSettings>) => updateSiteSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
    },
  });

  return {
    updateSettings: updateSettingsMutation,
  };
}
