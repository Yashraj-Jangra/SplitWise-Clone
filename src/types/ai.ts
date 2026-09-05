/**
 * SplitIt AI & RAG Type Definitions
 */

export interface RetrievedChunk {
  id: string;
  entityType: 'expense' | 'settlement' | 'group' | string;
  textChunk: string;
  similarity: number;
  metadata?: Record<string, any>;
}

export interface VectorRecord {
  id: string;
  userId: string;
  groupId?: string | null;
  entityType: 'expense' | 'settlement' | 'group' | string;
  textChunk: string;
  embedding: number[];
  createdAt?: string;
  updatedAt?: string;
}

export type ChatRole = 'user' | 'assistant' | 'system';

export type GuardrailBlockedReason = 'code_generation' | 'injection' | 'unsafe';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  isBlocked?: boolean;
  blockedReason?: GuardrailBlockedReason;
}

export interface AIInsight {
  summary: string;
  generatedAt: string;
  cached?: boolean;
}

export interface CategorySuggestion {
  category: string;
  masterCategory: string;
  confidence: 'high' | 'medium' | 'low';
  reason?: string;
}

export interface ReceiptScanResult {
  title: string;
  amount: number | null;
  date: string | null;
  category: string | null;
  notes: string | null;
  confidence?: 'high' | 'medium' | 'low';
}
