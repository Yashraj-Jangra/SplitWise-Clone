import { prisma } from '@/lib/db';
import type { SiteSettings, PolicyPage, CountryCode, MasterCategory } from '@/types';
import { defaultExpenseCategories } from '../expense-categories';

const DEFAULT_APP_NAME = 'SplitWise Clone';
const FALLBACK_GROUP_COVER_IMAGES = [
  'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1557682250-33bd709cbe85?q=80&w=2029&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1604079628040-94301bb21b91?q=80&w=1974&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1579546929662-7112e7508432?q=80&w=2070&auto=format&fit=crop',
];
const FALLBACK_LANDING_IMAGES = [
  'https://images.unsplash.com/photo-1518655048521-f130df041f66?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop',
];

const DEFAULT_COUNTRY_CODES: CountryCode[] = [
  { name: 'India', code: '+91', flag: '🇮🇳' },
  { name: 'United States', code: '+1', flag: '🇺🇸' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
];

const DEFAULT_PRIVACY_POLICY: PolicyPage = {
  title: 'Privacy Policy',
  sections: [
    { id: 'pp_intro', title: '1. Introduction', content: 'Welcome to our application. We are committed to protecting your privacy.' }
  ]
};

const DEFAULT_TERMS_AND_CONDITIONS: PolicyPage = {
  title: 'Terms of Service',
  sections: [
    { id: 'tc_acceptance', title: '1. Acceptance of Terms', content: 'By using this service, you agree to these terms.' }
  ]
};

const DEFAULT_EMAIL_SETTINGS = {
  sendingMethod: 'custom' as 'custom' | 'gmail',
  fromAddresses: {
    default: 'noreply@example.com',
    auth: 'auth@example.com',
    notifications: 'notifications@example.com',
    support: 'support@example.com',
    broadcast: 'broadcast@example.com',
  },
  smtpSettings: {
    host: '',
    port: 587,
    user: '',
    pass: '',
    secure: false,
  }
};

const DEFAULT_SETTINGS_DATA: SiteSettings = {
  appName: DEFAULT_APP_NAME,
  logoUrl: '',
  faviconUrl: '/favicon.svg',
  coverImages: FALLBACK_GROUP_COVER_IMAGES,
  landingImages: FALLBACK_LANDING_IMAGES,
  customThemes: [],
  defaultThemeId: 'default-dark',
  userSelectableThemeIds: ['default-dark', 'default-light'],
  expenseCategories: defaultExpenseCategories,
  countryCodes: DEFAULT_COUNTRY_CODES,
  privacyPolicy: DEFAULT_PRIVACY_POLICY,
  termsAndConditions: DEFAULT_TERMS_AND_CONDITIONS,
  stats: { users: 0, groups: 0, expenses: 0 },
  emailSettings: DEFAULT_EMAIL_SETTINGS,
  securitySettings: {
    requireOtpVerification: false,
  },
};

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const settingsDoc = await prisma.settings.findUnique({
      where: { id: 'general' }
    });

    if (settingsDoc) {
      const data = settingsDoc.data as any;
      return {
        ...DEFAULT_SETTINGS_DATA,
        ...data,
      };
    } else {
      // First bootstrap
      await prisma.settings.upsert({
        where: { id: 'general' },
        create: {
          id: 'general',
          data: DEFAULT_SETTINGS_DATA as any,
        },
        update: {},
      });
      return DEFAULT_SETTINGS_DATA;
    }
  } catch (error) {
    console.error('Failed to load site settings, using defaults:', error);
    return DEFAULT_SETTINGS_DATA;
  }
}

export async function updateSiteSettings(settings: Partial<SiteSettings>): Promise<void> {
  const currentSettings = await getSiteSettings();
  const mergedData = {
    ...currentSettings,
    ...settings,
  };

  await prisma.settings.upsert({
    where: { id: 'general' },
    create: {
      id: 'general',
      data: mergedData as any,
    },
    update: {
      data: mergedData as any,
    }
  });
}
