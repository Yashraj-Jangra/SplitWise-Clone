
import admin from 'firebase-admin';
import type { SiteSettings, PolicyPage } from '@/types';
import { Timestamp } from 'firebase-admin/firestore';
import { defaultExpenseCategories } from './expense-categories';

// Explicitly load environment variables from .env file
require('dotenv').config();

let initializedApp: typeof admin | null = null;

function getFirebaseAdmin(): typeof admin {
  if (!initializedApp) {
    // Support both base64-encoded (Docker/VPS) and raw JSON (local dev) formats
    const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_B64
      ? Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString('utf-8')
      : process.env.FIREBASE_SERVICE_ACCOUNT;

    if (!rawServiceAccount) {
      throw new Error('Firebase service account credentials are not set. Set FIREBASE_SERVICE_ACCOUNT_B64 (base64) or FIREBASE_SERVICE_ACCOUNT (raw JSON).');
    }
    const serviceAccount = JSON.parse(rawServiceAccount);
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
    initializedApp = admin;
  }
  return initializedApp;
}

// Export a Proxy that intercepts all property access and forwards it to the initialized admin instance.
// This prevents initialization and environment validation crashes during static build/compile time.
export const firebaseAdmin = new Proxy({} as typeof admin, {
  get(target, prop, receiver) {
    const adminInstance = getFirebaseAdmin();
    const value = Reflect.get(adminInstance, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(adminInstance);
    }
    return value;
  },
});


const SETTINGS_COLLECTION = 'settings';
const GENERAL_SETTINGS_DOC = 'general';

const DEFAULT_APP_NAME = '{AppName}';
const FALLBACK_GROUP_COVER_IMAGES = [
    'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1557682250-33bd709cbe85?q=80&w=2029&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1604079628040-94301bb21b91?q=80&w=1974&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1579546929662-7112e7508432?q=80&w=2070&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1511207538754-e8555f2bc187?q=80&w=1974&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?q=80&w=1974&auto=format&fit=crop',
];
const FALLBACK_LANDING_IMAGES = [
    'https://images.unsplash.com/photo-1518655048521-f130df041f66?q=80&w=2070&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop',
];

const DEFAULT_PRIVACY_POLICY: PolicyPage = {
    title: 'Privacy Policy',
    sections: [
        { id: 'pp_intro', title: '1. Introduction', content: 'Welcome to {appName} ("we", "our", "us"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the application.' },
        { id: 'pp_collect', title: '2. Information We Collect', content: 'We may collect information about you in a variety of ways. The information we may collect on the Site includes: Personally identifiable information, such as your name, shipping address, email address, and telephone number, and demographic information, such as your age, gender, hometown, and interests, that you voluntarily give to us when you register with the Application.'},
        { id: 'pp_use', title: '3. Use of Your Information', content: 'Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Application to: Create and manage your account, Email you regarding your account or order, Enable user-to-user communications, and Manage purchases, orders, payments, and other transactions related to the Application.'},
        { id: 'pp_security', title: '4. Security of Your Information', content: 'We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.'},
        { id: 'pp_contact', title: '5. Contact Us', content: 'If you have questions or comments about this Privacy Policy, please contact us at: [email protected]'},
    ]
};

const DEFAULT_TERMS_AND_CONDITIONS: PolicyPage = {
    title: 'Terms of Service',
    sections: [
        { id: 'tc_acceptance', title: '1. Acceptance of Terms', content: 'By accessing or using the {appName} application ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of the terms, then you may not access the Service.' },
        { id: 'tc_accounts', title: '2. User Accounts', content: 'When you create an account with us, you must provide us with information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service. You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password, whether your password is with our Service or a third-party service.' },
        { id: 'tc_conduct', title: '3. User Conduct', content: 'You agree not to use the Service to: Violate any local, state, national, or international law; Transmit any material that is abusive, harassing, tortious, defamatory, vulgar, pornographic, obscene, libelous, invasive of another\'s privacy, hateful, or racially, ethnically, or otherwise objectionable; Impersonate any person or entity, or falsely state or otherwise misrepresent your affiliation with a person or entity.' },
        { id: 'tc_liability', title: '4. Limitation of Liability', content: 'In no event shall {appName}, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.' },
        { id: 'tc_law', title: '5. Governing Law', content: 'These Terms shall be governed and construed in accordance with the laws of the jurisdiction in which the company is based, without regard to its conflict of law provisions.' },
    ]
};

const DEFAULT_LANDING_PAGE_SETTINGS = {
    headline: 'Manage Your Shared Expenses',
    subheadline: 'The quantum leap in managing shared expenses. Track, split, and settle your group costs with futuristic ease.',
    ctaButtonText: 'Enter the Grid',
    imageRotationInterval: 1,
    featuresTitle: "Everything You Need to Settle Up",
    featuresSubtitle: "From weekend trips to monthly bills, {appName} handles the math so you don't have to.",
    features: [
        { icon: 'Users', title: "Group Management", description: "Create shared expense groups, invite members via email, and manage group settings." },
        { icon: 'Expense', title: "Complex Expense Tracking", description: "Add detailed expenses with complex splits (equal, unequal, by shares, by percentage)." },
        { icon: 'Wallet', title: "Real-time Balances", description: "Instantly see who owes whom within each group with a clear and concise balance sheet." },
        { icon: 'Settle', title: "Simplified Settlements", description: "A smart algorithm calculates the most efficient way to settle all debts in the group." },
    ] as any[],
    howItWorksTitle: "Split Expenses in a Snap",
    howItWorksSubtitle: "Get started in three simple steps. Spend more time making memories, less time on math.",
    howItWorksSteps: [
        { title: 'Create a Group', description: 'Start a new group for any occasion and invite your friends, family, or roommates.' },
        { title: 'Add Expenses', description: 'Log expenses as they happen. Our flexible splitting options handle any scenario.' },
        { title: 'Settle Up', description: 'View balances and settle debts with the minimal number of payments. Everyone is happy!' },
    ] as any[],
    howItWorksImageUrl: 'https://placehold.co/800x600.png',
    finalCtaTitle: "Ready to Simplify Your Shared Expenses?",
    finalCtaSubtitle: "Create an account for free and say goodbye to awkward money conversations.",
    finalCtaButtonText: "Sign Up Now - It's Free"
};

const DEFAULT_AUTH_PAGE_SETTINGS = {
    imageUrl: 'https://images.unsplash.com/photo-1549880338-65ddcdfd017b?q=80&w=2070&auto=format&fit=crop',
    loginTitle: 'Welcome Back',
    loginSubtitle: 'Enter your credentials to access your account.',
    signupTitle: 'Create an Account',
    signupSubtitle: 'Join {appName} to simplify your group expenses.',
    forgotPasswordTitle: 'Forgot Password',
    forgotPasswordSubtitle: 'Enter your email to receive a reset link.',
    loginEmailPlaceholder: 'elon@x.com',
    loginPasswordPlaceholder: 'it\'s a secret...',
    signupFirstNamePlaceholder: 'Bartholomew',
    signupLastNamePlaceholder: 'Cubbins',
    signupUsernamePlaceholder: 'the_real_slim_shady',
    signupEmailPlaceholder: 'also.elon@x.com',
    signupPasswordPlaceholder: 'at_least_6_characters',
};

const DEFAULT_ABOUT_SETTINGS = {
    title: 'About {appName}',
    subtitle: 'Simplifying shared expenses for everyone, everywhere.',
    mainContent: 'Welcome to {appName}, the ultimate solution for managing group expenses without the hassle. Born from the common frustration of tracking who paid for what during trips, shared housing, and group events, {appName} was designed to be intuitive, powerful, and transparent.',
    team: [
        {
            id: 'tm-1',
            name: 'Yashraj Jangra',
            title: 'Full-Stack Developer & Project Lead',
            bio: 'Yashraj is a passionate developer who built this application to solve a real-world problem. He specializes in creating modern, user-friendly web applications with a focus on clean code and great user experience.',
            avatarUrl: 'https://github.com/Yashraj-Jangra.png',
            githubUrl: 'https://github.com/Yashraj-Jangra',
            linkedinUrl: 'https://www.linkedin.com/in/yashraj-jangra-24016a213/',
            portfolioUrl: 'https://yashraj-jangra.netlify.app/',
        }
    ]
};

const DEFAULT_NOT_FOUND_PAGE_SETTINGS = {
    title: "404 - Page Not Found",
    heading: "Lost in the Cosmos?",
    mainContent: "It seems you've drifted into uncharted territory. The page you're looking for might have been moved to another galaxy or never existed in the first place.",
    helpfulHint: "Try checking the URL for typos or navigate back to a known constellation.",
    supportNote: "If you believe this is a black hole in our system, please contact support.",
    buttonText: "Return to Home Base",
    imageUrl: "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?q=80&w=1974&auto=format&fit=crop",
};

const DEFAULT_MAINTENANCE_MODE_SETTINGS = {
  enabled: false,
  title: 'Under Maintenance',
  message: "We're currently performing some scheduled maintenance. We'll be back online shortly!",
  imageUrl: 'https://images.unsplash.com/photo-1589998059171-988d887df646?q=80&w=2070&auto=format&fit=crop'
};

const DEFAULT_EMAIL_SETTINGS = {
    sendingMethod: 'firebase' as 'firebase' | 'custom' | 'gmail',
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
    },
    gmailSettings: {
        connectedEmail: '',
    }
};

/**
 * Server-side function to get site settings using the Admin SDK.
 * This should be used in API routes.
 */
export async function getSiteSettingsAdmin(): Promise<SiteSettings> {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_B64 && !process.env.FIREBASE_SERVICE_ACCOUNT) {
        console.warn('[Firebase Admin] FIREBASE_SERVICE_ACCOUNT is not defined. Returning fallback site settings for static build.');
        return {
            appName: DEFAULT_APP_NAME,
            coverImages: FALLBACK_GROUP_COVER_IMAGES,
            landingImages: FALLBACK_LANDING_IMAGES,
            expenseCategories: defaultExpenseCategories,
            privacyPolicy: DEFAULT_PRIVACY_POLICY,
            termsAndConditions: DEFAULT_TERMS_AND_CONDITIONS,
            emailSettings: DEFAULT_EMAIL_SETTINGS,
            landingPage: DEFAULT_LANDING_PAGE_SETTINGS,
            authPage: DEFAULT_AUTH_PAGE_SETTINGS,
            about: DEFAULT_ABOUT_SETTINGS,
            notFoundPage: DEFAULT_NOT_FOUND_PAGE_SETTINGS,
            maintenanceMode: DEFAULT_MAINTENANCE_MODE_SETTINGS,
        } as SiteSettings;
    }

    const db = firebaseAdmin.firestore();
    const docRef = db.collection(SETTINGS_COLLECTION).doc(GENERAL_SETTINGS_DOC);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
        const data = docSnap.data() as any;
        
        const privacyPolicy = data.privacyPolicy && Array.isArray(data.privacyPolicy.sections)
            ? data.privacyPolicy
            : DEFAULT_PRIVACY_POLICY;
            
        const termsAndConditions = data.termsAndConditions && Array.isArray(data.termsAndConditions.sections)
            ? data.termsAndConditions
            : DEFAULT_TERMS_AND_CONDITIONS;

        const emailSettings = { 
            ...DEFAULT_EMAIL_SETTINGS, 
            ...(data.emailSettings || {}),
            fromAddresses: {
                ...DEFAULT_EMAIL_SETTINGS.fromAddresses,
                ...(data.emailSettings?.fromAddresses || {})
            },
        };
        
        return {
            appName: data.appName || DEFAULT_APP_NAME,
            logoUrl: data.logoUrl || '',
            faviconUrl: data.faviconUrl || '',
            coverImages: data.coverImages?.length > 0 ? data.coverImages : FALLBACK_GROUP_COVER_IMAGES,
            landingImages: data.landingImages?.length > 0 ? data.landingImages : FALLBACK_LANDING_IMAGES,
            expenseCategories: data.expenseCategories || defaultExpenseCategories,
            privacyPolicy,
            termsAndConditions,
            emailSettings,
            ...data, // include any other fields that might exist
        };
    } else {
        // This case is unlikely if the app has run once, but good for safety
        return {
            appName: DEFAULT_APP_NAME,
            coverImages: FALLBACK_GROUP_COVER_IMAGES,
            landingImages: FALLBACK_LANDING_IMAGES,
            expenseCategories: defaultExpenseCategories,
            privacyPolicy: DEFAULT_PRIVACY_POLICY,
            termsAndConditions: DEFAULT_TERMS_AND_CONDITIONS,
            emailSettings: DEFAULT_EMAIL_SETTINGS,
        } as SiteSettings;
    }
}
