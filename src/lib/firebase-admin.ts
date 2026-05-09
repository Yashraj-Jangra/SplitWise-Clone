
import admin from 'firebase-admin';
import type { SiteSettings, PolicyPage } from '@/types';
import { Timestamp } from 'firebase-admin/firestore';
import { defaultExpenseCategories } from './expense-categories';

// Explicitly load environment variables from .env file
require('dotenv').config();

// Check if the service account JSON is provided in the environment variables
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  throw new Error('Firebase service account credentials are not set in the environment variables. Please set FIREBASE_SERVICE_ACCOUNT.');
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

/**
 * Initializes the Firebase Admin SDK, ensuring it's only done once.
 * This is the "singleton" pattern for Firebase Admin initialization.
 */
function initializeAdminApp() {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  return admin;
}

// Immediately initialize and export the admin instance.
// Other files will import this directly.
export const firebaseAdmin = initializeAdminApp();


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
