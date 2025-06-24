import type { IconName } from "@/components/icons";
import { Timestamp } from "firebase/firestore";

// Base user profile stored in Firestore
export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'admin' | 'user';
  createdAt: Timestamp;
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

export interface ExpenseParticipantDocument {
  userId: string;
  amountOwed: number;
  share?: number;
}

export interface ExpenseDocument {
  groupId: string;
  description: string;
  amount: number;
  paidById: string;
  date: Timestamp;
  splitType: "equally" | "unequally" | "by_shares" | "by_percentage";
  participants: ExpenseParticipantDocument[];
  participantIds: string[]; // For querying
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
}

// --- Hydrated Types for Client-side Usage ---
// These types include the full nested objects for easier display

export interface Group extends Omit<GroupDocument, 'memberIds' | 'createdById'> {
  id: string; // The document ID
  members: UserProfile[];
  createdBy: UserProfile;
}

export interface ExpenseParticipant extends Omit<ExpenseParticipantDocument, 'userId'> {
    user: UserProfile;
}

export interface Expense extends Omit<ExpenseDocument, 'paidById' | 'participants' | 'date'> {
    id: string;
    paidBy: UserProfile;
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
