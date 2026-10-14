import { describe, it, expect, vi } from 'vitest';
import { GET as getPublicSettings } from '@/app/api/public/settings/route';

// Mock getSiteSettings to verify public payload formatting
vi.mock('@/lib/services/settings.service', () => ({
  getSiteSettings: vi.fn().mockResolvedValue({
    appName: 'SplitIt Test',
    minMobileVersion: '1.0.0',
    latestMobileVersion: '1.2.0',
    maintenanceMode: {
      enabled: false,
      title: 'Maintenance',
      message: 'Under maintenance',
    },
  }),
}));

describe('Mobile Backend Endpoints Verification', () => {
  it('GET /api/public/settings includes minMobileVersion and latestMobileVersion', async () => {
    const response = await getPublicSettings();
    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.appName).toBe('SplitIt Test');
    expect(data.minMobileVersion).toBe('1.0.0');
    expect(data.latestMobileVersion).toBe('1.2.0');
  });
});
