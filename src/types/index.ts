
import type { IconName } from "@/components/icons";
import { Timestamp } from "firebase/firestore";

// Base user profile stored in Firestore
export interface UserProfile {
  uid: string;
  firstName: string;
  lastName?: string;
  username: string;
  email: string;
  avatarUrl?: string;
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
  date: Timestamp;
  splitType: "equally" | "unequally" | "by_shares" | "by_percentage";
  participants: ExpenseParticipantDocument[];
  participantIds: string[]; // For querying
  groupMemberIds: string[]; // For security rules
  category?: string;
  receiptImageUrl?: string;
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

export type HistoryEventType = 'expense_created' | 'expense_updated' | 'expense_deleted' | 'settlement_created' | 'settlement_deleted' | 'group_created' | 'member_added' | 'expense_restored';

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


// --- Hydrated Types for Client-side Usage ---
// These types include the full nested objects for easier display

export interface Group extends Omit<GroupDocument, 'memberIds' | 'createdById' | 'createdAt'> {
  id: string; // The document ID
  members: UserProfile[];
  createdBy: UserProfile;
  createdAt: string; // ISO string for client
}

export interface ExpensePayer extends Omit<ExpensePayerDocument, 'userId'> {
    user: UserProfile;
}

export interface ExpenseParticipant extends Omit<ExpenseParticipantDocument, 'userId'> {
    user: UserProfile;
}

export interface Expense extends Omit<ExpenseDocument, 'payers' | 'participants' | 'date'> {
    id: string;
    payers: ExpensePayer[];
    participants: ExpenseParticipant[];
    date: string; // ISO string for client
}

export interface Settlement extends Omit<SettlementDocument, 'paidById' | 'paidToId' | 'date'> {
    id: string;
    paidBy: UserProfile;
    paidTo: UserProfile;
    date: string; // ISO string for client
}

export interface Balance {
  user: UserProfile;
  netBalance: number;
}

export interface NavItem {
  title: string;
  href: string;
  icon: IconName;
  disabled?: boolean;
  external?: boolean;
  label?: string
}

export interface HistoryEvent extends Omit<HistoryEventDocument, 'timestamp' | 'actorId'> {
    id: string;
    timestamp: string; // ISO string
    actor: UserProfile;
}

export interface SiteSettings {
  appName: string;
  logoUrl?: string;
  coverImages: string[];
}

    