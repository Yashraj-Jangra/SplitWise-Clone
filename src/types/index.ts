

import type { IconName } from "@/components/icons";
import { Timestamp } from "firebase/firestore";

export type NotificationEventType =
  | 'expense_added'
  | 'expense_updated'
  | 'expense_deleted'
  | 'settlement_added'
  | 'member_added'
  | 'member_removed'
  | 'balance_reminder'
  | 'support_reply'
  | 'broadcast_announcement'
  | 'broadcast_critical';

export type NotificationChannel = 'in_app' | 'push' | 'email';

// Base user profile stored in Firestore
export interface UserProfile {
  uid: string;
  firstName: string;
  lastName?: string;
  username: string;
  email: string;
  avatarUrl?: string;
  countryCode?: string;
  mobileNumber?: string;
  dob?: string; // ISO string for client
  role: 'admin' | 'user';
  createdAt?: string; // ISO string for client
}

// --- Firestore Document Types ---

export interface GroupDocument {
  name: string;
  description?: string;
  memberIds: string[]; // Array of user uids
  createdAt: Timestamp;
  createdById: string; // user uid
  totalExpenses: number;
  coverImageUrl?: string;
  archivedAt?: Timestamp;
}

export interface ExpensePayerDocument {
  userId: string;
  amount: number;
}

export interface ExpenseParticipantDocument {
  userId: string;
  amountOwed: number;
  share?: number;
}

export interface ExpenseDocument {
  groupId: string;
  description: string;
  amount: number;
  payers: ExpensePayerDocument[];
  payerIds: string[]; // For querying
  date: Timestamp;
  splitType: "equally" | "unequally" | "by_shares" | "by_percentage";
  participants: ExpenseParticipantDocument[];
  participantIds: string[]; // For querying
  groupMemberIds: string[]; // For security rules
  category?: string; // This will now be the sub-category name
  masterCategory?: string; // Denormalized master category for easier querying/analytics
  notes?: string;
  receiptImageUrl?: string;
  expenseCreatorId: string;
  groupCreatorId: string;
  createdAt: Timestamp;
}

export interface SettlementDocument {
  groupId: string;
  paidById: string;
  paidToId: string;
  amount: number;
  date: Timestamp;
  notes?: string;
  groupMemberIds: string[]; // For security rules
}

export type HistoryEventType = 'expense_created' | 'expense_updated' | 'expense_deleted' | 'settlement_created' | 'settlement_updated' | 'settlement_deleted' | 'group_created' | 'group_updated' | 'member_added' | 'expense_restored' | 'member_removed' | 'settlement_restored';

export interface HistoryEventDocument {
  groupId: string;
  eventType: HistoryEventType;
  timestamp: Timestamp;
  actorId: string; // The user who performed the action
  description: string;
  data?: any; // Store old/new data, or deleted data
  restored?: boolean;
  groupMemberIds: string[]; // For security rules
}

export interface SupportTicketMessageDocument {
    sentAt: Timestamp;
    sentById: string; // user or admin uid
    message: string;
}

export interface SupportTicketDocument {
    userId: string;
    userName: string;
    userEmail: string;
    subject: string;
    category: 'bug' | 'feature' | 'billing' | 'general';
    status: 'open' | 'in-progress' | 'closed';
    createdAt: Timestamp;
    updatedAt: Timestamp;
    messages: SupportTicketMessageDocument[];
    assignedToId?: string; // Admin UID
}

// Firestore: notifications_v2/{id}
export interface NotificationV2Document {
  type: NotificationEventType;
  title: string;
  body: string;                    // Short message (for push/in-app)
  recipientIds: string[];          // UIDs who should receive this
  readBy: string[];                // UIDs who have read (in-app)
  groupId?: string;                // Link to relevant group
  expenseId?: string;              // Link to relevant expense
  actorId?: string;                // Who triggered this (e.g. who added expense)
  createdAt: Timestamp;
  createdBy?: string;              // 'system' | admin UID
  target: 'all_users' | 'specific_users' | 'group';
  channels: NotificationChannel[]; // Which channels were used
  imageUrl?: string;               // Optional icon override
}

// Firestore: user_notification_prefs/{userId}
export interface UserNotificationPrefsDocument {
  userId: string;
  // Per-channel master switches
  inAppEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  // Per-event granular controls
  events: Record<NotificationEventType, {
    inApp: boolean;
    push: boolean;
    email: boolean;
  }>;
  updatedAt: Timestamp;
}

// Firestore: push_subscriptions/{userId}/devices/{deviceId}
export interface PushSubscriptionDocument {
  userId: string;
  fcmToken: string;
  deviceName?: string;
  createdAt: Timestamp;
  lastSeen: Timestamp;
}


// --- Hydrated Types for Client-side Usage ---
// These types include the full nested objects for easier display

export interface Group extends Omit<GroupDocument, 'memberIds' | 'createdById' | 'createdAt' | 'archivedAt'> {
  id: string; // The document ID
  members: UserProfile[];
  createdBy: UserProfile;
  createdAt: string; // ISO string for client
  archivedAt?: string;
}

export interface ExpensePayer extends Omit<ExpensePayerDocument, 'userId'> {
    user: UserProfile;
}

export interface ExpenseParticipant extends Omit<ExpenseParticipantDocument, 'userId'> {
    user: UserProfile;
}

export interface Expense extends Omit<ExpenseDocument, 'payers' | 'participants' | 'date' | 'createdAt' | 'expenseCreatorId'> {
    id: string;
    payers: ExpensePayer[];
    participants: ExpenseParticipant[];
    date: string; // ISO string for client
    createdAt: string; // ISO string for client
    expenseCreator: UserProfile;
}

export interface Settlement extends Omit<SettlementDocument, 'paidById' | 'paidToId' | 'date'> {
    id: string;
    paidBy: UserProfile;
    paidTo: UserProfile;
    date: string; // ISO string for client
}

export interface SupportTicketMessage extends Omit<SupportTicketMessageDocument, 'sentAt'> {
    sentBy: UserProfile; // Hydrated user
    sentAt: string; // ISO string
}

export interface SupportTicket extends Omit<SupportTicketDocument, 'createdAt' | 'updatedAt' | 'messages' | 'userId' | 'assignedToId'> {
    id: string;
    user: UserProfile;
    assignedTo?: UserProfile;
    messages: SupportTicketMessage[];
    createdAt: string; // ISO string
    updatedAt: string; // ISO string
}


export interface Balance {
  user: UserProfile;
  netBalance: number;
}

export interface SimplifiedSettlement {
  from: UserProfile;
  to: UserProfile;
  amount: number;
}


export interface NavItem {
  title: string;
  href: string;
  icon?: IconName;
  disabled?: boolean;
  external?: boolean;
  label?: string;
  subItems?: NavItem[];
}

export interface HistoryEvent extends Omit<HistoryEventDocument, 'timestamp' | 'actorId'> {
    id: string;
    timestamp: string; // ISO string
    actor: UserProfile;
}

export interface NotificationV2 extends Omit<NotificationV2Document, 'createdAt'> {
    id: string;
    createdAt: string; // ISO string
    isRead: boolean;
    actor?: UserProfile;
}


export interface PolicySection {
  id: string;
  title: string;
  content: string;
}

export interface PolicyPage {
  title: string;
  sections: PolicySection[];
}

export interface TeamMember {
  id: string;
  name: string;
  title: string;
  bio: string;
  avatarUrl?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
}

export interface LandingPageFeature {
    icon: IconName;
    title: string;
    description: string;
}

export interface LandingPageStep {
    title: string;
    description: string;
}

export interface CountryCode {
    name: string;
    code: string;
    flag: string;
}

export interface EmailTemplate {
  subject: string;
  body: string;
}

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
}

export interface ThemeRadii {
  radius: number;
  radiusCard: number;
  radiusButton: number;
  radiusInput: number;
  radiusDialog: number;
}

export interface Theme extends ThemeColors, ThemeRadii {
  id: string;
  name: string;
  isCustom?: boolean;
}

export interface SubCategory {
    icon: IconName;
    keywords: string[];
}

export interface MasterCategory {
    subCategories: Record<string, SubCategory>;
}

export interface SiteSettings {
  appName: string;
  logoUrl?: string;
  faviconUrl?: string;
  coverImages: string[];
  landingImages: string[];
  defaultThemeId?: string; // ID of the default theme for all users
  userSelectableThemeIds?: string[]; // IDs of themes users can choose from
  customThemes?: Theme[]; // Array of user-created themes
  expenseCategories: Record<string, MasterCategory>;
  countryCodes: CountryCode[];
  landingPage?: {
    headline: string;
    subheadline: string;
    ctaButtonText: string;
    imageRotationInterval?: number;
    featuresTitle: string;
    featuresSubtitle: string;
    features: LandingPageFeature[];
    howItWorksTitle: string;
    howItWorksSubtitle: string;
    howItWorksSteps: LandingPageStep[];
    howItWorksImageUrl: string;
    finalCtaTitle: string;
    finalCtaSubtitle: string;
    finalCtaButtonText: string;
  };
  authPage?: {
    imageUrl: string;
    loginTitle: string;
    loginSubtitle: string;
    signupTitle: string;
    signupSubtitle: string;
    forgotPasswordTitle: string;
    forgotPasswordSubtitle: string;
    loginEmailPlaceholder?: string;
    loginPasswordPlaceholder?: string;
    signupFirstNamePlaceholder?: string;
    signupLastNamePlaceholder?: string;
    signupUsernamePlaceholder?: string;
    signupEmailPlaceholder?: string;
    signupPasswordPlaceholder?: string;
  };
  about?: {
    title: string;
    subtitle: string;
    mainContent: string;
    team: TeamMember[];
  };
  privacyPolicy?: PolicyPage;
  termsAndConditions?: PolicyPage;
  notFoundPage?: {
    title: string;
    heading: string;
    mainContent: string;
    helpfulHint: string;
    supportNote: string;
    buttonText: string;
    imageUrl: string;
  };
  emailSettings?: {
    sendingMethod: 'firebase' | 'custom' | 'gmail';
    fromAddresses: {
        default: string;
        auth: string;
        notifications: string;
        support: string;
        broadcast: string;
    };
    smtpSettings: {
      host: string;
      port: number;
      user: string;
      pass: string;
      secure: boolean;
    };
    gmailSettings?: {
        connectedEmail?: string;
    }
  };
  emailTemplates?: {
    registration: EmailTemplate;
    forgotPassword: EmailTemplate;
    loginNotification: EmailTemplate;
    monthlyReport: EmailTemplate;
    paymentReminder: EmailTemplate;
    supportTicketConfirmation: EmailTemplate;
    supportTicketAdminNotification: EmailTemplate;
    supportTicketReply: EmailTemplate;
    expenseAdded: EmailTemplate;
    settlementAdded: EmailTemplate;
    memberAdded: EmailTemplate;
    balanceReminder: EmailTemplate;
    broadcast: EmailTemplate;
  };
  stats?: {
    users: number;
    groups: number;
    expenses: number;
  };
  maintenanceMode?: {
    enabled: boolean;
    title: string;
    message: string;
    imageUrl: string;
  };
}

export interface ExpenseCategory {
    icon: IconName;
    keywords: string[];
}
