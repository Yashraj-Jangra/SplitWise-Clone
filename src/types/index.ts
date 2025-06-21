
import type { IconName } from "@/components/icons";

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string; // URL to placeholder or actual image
  role?: 'admin' | 'user'; // Added role
  createdAt?: string; // ISO date string for when the user joined
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  members: User[];
  createdAt: string; // ISO date string
  createdBy: User;
  totalExpenses: number; // Sum of all expenses in this group
  coverImageUrl?: string; // URL to placeholder or actual image
}

export type ExpenseSplitType = "equally" | "unequally" | "by_shares" | "by_percentage";

export interface ExpenseParticipant {
  user: User;
  amountOwed: number; // Amount this participant owes for this expense
  share?: number; // For by_shares or by_percentage splits
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  paidBy: User;
  date: string; // ISO date string
  splitType: ExpenseSplitType;
  participants: ExpenseParticipant[];
  category?: string; // Optional category like "Food", "Travel"
  receiptImageUrl?: string; // URL to placeholder or actual image
}

export interface Settlement {
  id: string;
  groupId: string;
  paidBy: User;
  paidTo: User;
  amount: number;
  date: string; // ISO date string
  notes?: string;
}

export interface Balance {
  user: User;
  owes: Array<{ to: User; amount: number }>; // Who this user owes
  owedBy: Array<{ from: User; amount: number }>; // Who owes this user
  netBalance: number; // Positive if owed money, negative if owes money
}

export interface NavItem {
  title: string;
  href: string;
  icon: IconName;
  disabled?: boolean;
  external?: boolean;
  label?: string
}
