'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { MessageBubble } from './message-bubble';
import type { AIStreamStatus } from './status-pill';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/icons';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Send, Trash2, ArrowRight, Info, Square, Maximize2, ShieldCheck, Calculator, Database, Sparkles, Cpu } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { ChatMessage, BudgetActionProposal } from '@/types/ai';
import { appEventEmitter } from '@/lib/event-emitter';

const GLOBAL_STARTER_PROMPTS = [
  "What's my spending trend this month vs last month?",
  "Show my category timeline for the last 3 months",
  "Who owes me money right now?",
  "What were my biggest expense spikes recently?",
];

const GROUP_STARTER_PROMPTS = [
  "What is our group budget status?",
  "Break down each member's cut and share",
  "What's our group spending trend this month?",
  "Increase our monthly budget by ₹5,000",
];

interface ChatPanelProps {
  groupId?: string;
  groupName?: string;
  className?: string;
  onClose?: () => void;
  variant?: 'widget' | 'full';
}

function AssistantInfoTooltipContent({ variant = 'full' }: { variant?: 'widget' | 'full' }) {
  const isWidget = variant === 'widget';
  return (
    <div className={isWidget ? 'w-72' : 'w-80'}>
      {/* Header */}
      <div className="flex items-center gap-2 pb-2.5 mb-2.5 border-b border-border/20">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/50 border border-border/30 flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-foreground text-[12px] leading-tight">Financial Assistant</p>
          <p className="text-[10px] text-muted-foreground leading-tight">Private & RAG-grounded</p>
        </div>
      </div>

      {/* Body with original text and spacing */}
      <div className="space-y-2.5">
        <div className="flex gap-2.5 items-start">
          <Calculator className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-semibold text-foreground leading-tight">Zero math hallucinations</p>
            <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">Balances, debts, and totals are computed server-side from your actual records — the AI never guesses or recalculates numbers.</p>
          </div>
        </div>

        <div className="flex gap-2.5 items-start">
          <Database className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-semibold text-foreground leading-tight">Semantic expense search</p>
            <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">Your expenses are indexed as vectors. Relevant records are retrieved by meaning, not just keywords, before answering.</p>
          </div>
        </div>

        <div className="flex gap-2.5 items-start">
          <ShieldCheck className="w-3.5 h-3.5 text-violet-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-semibold text-foreground leading-tight">Private by design</p>
            <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">Data never leaves your account scope. Group queries are access-controlled and your history is never used for model training.</p>
          </div>
        </div>

        <div className="flex gap-2.5 items-start">
          <Cpu className="w-3.5 h-3.5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-semibold text-foreground leading-tight">How it works</p>
            <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">Question → server computes exact ledger facts → semantic vector search → AI synthesises the answer → streamed back live.</p>
          </div>
        </div>
      </div>

      {/* Footer with divider line before it */}
      <div className="mt-2.5 pt-2.5 border-t border-border/20 flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider font-medium">Tech</span>
        <div className="flex items-center gap-1.5">
          {['AI', 'Oracle 23ai', 'RAG'].map((tag) => (
            <span key={tag} className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-muted/50 border border-border/30 text-muted-foreground">{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}



// -- Budget Action Permission Card -----------------------------------------------
interface BudgetActionCardProps {
  proposal: BudgetActionProposal;
  onApprove: () => void;
  onDeny: () => void;
  status: 'idle' | 'approving' | 'denying';
}

function BudgetActionCard({ proposal, onApprove, onDeny, status }: BudgetActionCardProps) {
  const isLoading = status !== 'idle';
  const formatINR = (n?: number) => (n != null ? `\u20b9${n.toLocaleString('en-IN')}` : 'N/A');

  const actionLabels: Record<string, string> = {
    set_monthly_limit: 'Set Monthly Budget',
    increase_monthly_limit: 'Increase Monthly Budget',
    decrease_monthly_limit: 'Decrease Monthly Budget',
    enable_budget: 'Enable Budget',
    disable_budget: 'Disable Budget',
    set_category_limit: `Set ${proposal.categoryKey || 'Category'} Limit`,
    remove_category_limit: `Remove ${proposal.categoryKey || 'Category'} Limit`,
  };

  const actionColorClass: Record<string, string> = {
    set_monthly_limit: 'text-blue-400',
    increase_monthly_limit: 'text-emerald-400',
    decrease_monthly_limit: 'text-amber-400',
    enable_budget: 'text-emerald-400',
    disable_budget: 'text-red-400',
    set_category_limit: 'text-blue-400',
    remove_category_limit: 'text-red-400',
  };

  const computedNewLimit = (): number | undefined => {
    if (proposal.newMonthlyLimit != null) return proposal.newMonthlyLimit;
    if (proposal.deltaAmount != null && proposal.currentMonthlyLimit != null) {
      return proposal.action === 'increase_monthly_limit'
        ? proposal.currentMonthlyLimit + proposal.deltaAmount
        : Math.max(100, proposal.currentMonthlyLimit - proposal.deltaAmount);
    }
    return undefined;
  };

  const newVal = computedNewLimit();

  return (
    <div className="my-1.5 mx-1">
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 backdrop-blur-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2.5 border-b border-amber-500/20">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/25 flex-shrink-0">
            <Icons.Bot className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-400 leading-tight">AI Budget Change Request</p>
            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">{proposal.groupName}</p>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-current/20 bg-current/10 ${actionColorClass[proposal.action] || 'text-foreground'}`}>
            {actionLabels[proposal.action] || proposal.action}
          </span>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-2.5">
          <p className="text-[12px] text-foreground leading-relaxed">{proposal.summary}</p>

          {/* Change details */}
          <div className="grid grid-cols-2 gap-2">
            {proposal.currentMonthlyLimit != null && (
              <div className="rounded-xl bg-muted/20 border border-border/30 p-2.5">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Current</p>
                <p className="text-sm font-bold text-foreground">{formatINR(proposal.currentMonthlyLimit)}</p>
              </div>
            )}
            {newVal != null && (
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-2.5">
                <p className="text-[9px] uppercase tracking-wider text-primary/70 font-semibold mb-0.5">New Limit</p>
                <p className="text-sm font-bold text-primary">{formatINR(newVal)}</p>
              </div>
            )}
            {proposal.categoryKey && proposal.newCategoryLimit != null && (
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-2.5 col-span-2">
                <p className="text-[9px] uppercase tracking-wider text-primary/70 font-semibold mb-0.5">{proposal.categoryKey}</p>
                <p className="text-sm font-bold text-primary">{formatINR(proposal.newCategoryLimit)}</p>
              </div>
            )}
          </div>

          {/* Permission notice */}
          <div className="flex items-start gap-2 rounded-xl bg-muted/10 border border-border/20 p-2.5">
            <Icons.AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              The AI is requesting permission to modify the group budget. This change will be logged in the group history.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-4 pb-4">
          <button
            type="button"
            onClick={onDeny}
            disabled={isLoading}
            className="flex-1 h-9 rounded-xl text-xs font-semibold border border-border/40 bg-muted/20 hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
          >
            {status === 'denying' ? 'Denying...' : 'Deny'}
          </button>
          <button
            type="button"
            onClick={onApprove}
            disabled={isLoading}
            className="flex-1 h-9 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all disabled:opacity-60 shadow-md shadow-emerald-900/30"
          >
            {status === 'approving' ? 'Applying...' : 'Approve & Apply'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ChatPanel({ groupId, groupName, className, onClose, variant = 'widget' }: ChatPanelProps) {
  const { userProfile } = useAuth();
  const userId = userProfile?.uid || 'guest';
  const storageKey = `splitit_ai_history_${userId}${groupId ? `_${groupId}` : ''}`;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStatus, setStreamStatus] = useState<AIStreamStatus>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [pendingBudgetProposal, setPendingBudgetProposal] = useState<BudgetActionProposal | null>(null);
  const [budgetActionStatus, setBudgetActionStatus] = useState<'idle' | 'approving' | 'denying'>('idle');

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter(
            (m): m is ChatMessage =>
              Boolean(m) &&
              typeof m === 'object' &&
              (m.role === 'user' || m.role === 'assistant') &&
              typeof m.content === 'string'
          );
          if (valid.length > 0) {
            setMessages(valid);
          }
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [storageKey]);

  // Save history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages.slice(-30)));
      } catch {
        // Storage quota safe
      }
    }
  }, [messages, storageKey]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming, scrollToBottom]);

  const handleClearHistory = () => {
    setMessages([]);
    localStorage.removeItem(storageKey);
  };

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setStreamStatus(null);
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === 'assistant' && !last.content.trim()) {
        return prev.slice(0, -1);
      }
      return prev;
    });
  }, []);

  // Global listener for Escape key to stop response
  useEffect(() => {
    if (!isStreaming) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleStop();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isStreaming, handleStop]);

  const handleSend = async (userText?: string) => {
    const textToSend = (userText || input).trim();
    if (!textToSend || isStreaming) return;

    setInput('');
    const userMsg: ChatMessage = { role: 'user', content: textToSend };
    const updatedMessages = [...messages, userMsg];

    // Mount user message AND empty assistant bubble immediately for instant 0ms thinking feedback
    setMessages([...updatedMessages, { role: 'assistant', content: '' }]);

    setIsStreaming(true);

    // Realistic client-side initial intent status
    const lower = textToSend.toLowerCase();
    const isExplicitDraft =
      /^(draft|write|compose|suggest (a )?reply|say to|craft|pen|prepare a message|prepare an email)\b/i.test(textToSend.trim()) ||
      /\b(draft (an?|the|a response|an answer)|write (an?|the|a message|an email|a note))\b/i.test(textToSend);
    const isCut = /\b(cut|cuts|share|shares|contribution|who paid what|everyone('?s)? cut|breakdown of)\b/i.test(lower);
    const isTrend = /\b(trend|trends|velocity|burn rate|this month vs last|month over month|mom)\b/i.test(lower);
    const isCategoryTimeline = /\b(timeline|spent on|spend on|groceries|dining|food|travel|rent|utilities)\b/i.test(lower);
    const isBudget = /\b(budget|limit|exceed|run out|safe to spend)\b/i.test(lower);
    const isBalance = /(balance|owe|owed|debt|dues|who owes|settle|net balance)/i.test(lower);
    const isExpense = /(spend|spent|expense|cost|receipt|bill|category|hotel|flight|food|dinner|lunch|groceries|trip)/i.test(lower);

    if (isExplicitDraft) {
      setStreamStatus({ stage: 'drafting', label: 'Drafting response...' });
    } else if (isCut) {
      setStreamStatus({ stage: 'calculating', label: 'Calculating member cuts...' });
    } else if (isTrend) {
      setStreamStatus({ stage: 'calculating', label: 'Computing monthly spending trends...' });
    } else if (isCategoryTimeline) {
      setStreamStatus({ stage: 'calculating', label: 'Analyzing category timeline...' });
    } else if (isBudget) {
      setStreamStatus({ stage: 'calculating', label: 'Forecasting budget burn rate...' });
    } else if (isBalance) {
      setStreamStatus({ stage: 'calculating', label: 'Checking ledger & balances...' });
    } else if (isExpense || groupId) {
      setStreamStatus({ stage: 'searching', label: 'Searching expense records...' });
    } else {
      setStreamStatus({ stage: 'analyzing', label: 'Understanding request...' });
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: updatedMessages.slice(-6),
          groupId,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to connect to assistant');
      }

      if (!response.body) {
        throw new Error('No stream body returned');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let assistantContent = '';

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (trimmed === 'data: [DONE]') break;

          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.status) {
                setStreamStatus({
                  stage: data.status,
                  label: data.message,
                });
              } else if (data.blocked) {
                setStreamStatus(null);
                if (data.token) {
                  assistantContent += data.token;
                }
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === 'assistant') {
                    last.content = assistantContent;
                    last.isBlocked = true;
                    last.blockedReason = data.reason;
                  }
                  return updated;
                });
              } else if (data.token) {
                setStreamStatus(null);
                assistantContent += data.token;
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === 'assistant') {
                    last.content = assistantContent;
                  }
                  return updated;
                });
              } else if (data.budget_action) {
                setStreamStatus(null);
                setPendingBudgetProposal(data.budget_action as BudgetActionProposal);
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === 'assistant') {
                    last.content = '__BUDGET_ACTION_CARD__';
                    last.budgetProposalId = (data.budget_action as BudgetActionProposal).requestId;
                  }
                  return updated;
                });
              } else if (data.error) {
                throw new Error(data.error);
              }
            } catch {
              // Ignore partial JSON
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User aborted generation intentionally
        return;
      }
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        const errorMessage = `⚠️ ${err.message || 'Sorry, I encountered an issue processing your query. Please try again.'}`;
        if (last && last.role === 'assistant' && !last.content) {
          last.content = errorMessage;
          return updated;
        }
        return [...updated, { role: 'assistant', content: errorMessage }];
      });
    } finally {
      abortControllerRef.current = null;
      setStreamStatus(null);
      setIsStreaming(false);
    }
  };

  const handleBudgetApprove = async () => {
    if (!pendingBudgetProposal || budgetActionStatus !== 'idle') return;
    setBudgetActionStatus('approving');
    try {
      const res = await fetch('/api/ai/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposal: pendingBudgetProposal, approved: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Budget update failed');
      // Replace the card message with a success message
      setMessages((prev) => prev.map((m) =>
        m.budgetProposalId === pendingBudgetProposal.requestId
          ? { ...m, content: `Budget updated successfully. ${data.description || pendingBudgetProposal.summary}`, budgetProposalId: undefined }
          : m
      ));
      // Emit event so group page refreshes
      appEventEmitter.emit('data-changed');
    } catch (err: any) {
      setMessages((prev) => prev.map((m) =>
        m.budgetProposalId === pendingBudgetProposal?.requestId
          ? { ...m, content: `Failed to apply budget change: ${err.message || 'Unknown error'}`, budgetProposalId: undefined }
          : m
      ));
    } finally {
      setPendingBudgetProposal(null);
      setBudgetActionStatus('idle');
    }
  };

  const handleBudgetDeny = () => {
    if (!pendingBudgetProposal) return;
    setBudgetActionStatus('denying');
    setMessages((prev) => prev.map((m) =>
      m.budgetProposalId === pendingBudgetProposal.requestId
        ? { ...m, content: 'Budget change request denied. No changes were made.', budgetProposalId: undefined }
        : m
    ));
    setPendingBudgetProposal(null);
    setBudgetActionStatus('idle');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape' && isStreaming) {
      e.preventDefault();
      handleStop();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming) {
        handleSend();
      }
    }
  };

  const isFullPage = variant === 'full';

  return (
    <div
      className={`relative flex flex-col h-full w-full bg-background overflow-hidden ${className || ''}`}
    >
      {/* ── Top Header (Floating Glass Overlay for both Full Page & Widget) ── */}
      {isFullPage ? (
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 sm:px-8 py-3 border-b border-border/20 bg-background/80 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/40 text-foreground border border-border/30 flex-shrink-0">
              <Icons.Bot className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-foreground">
                {groupName ? `${groupName} Assistant` : 'Financial Assistant'}
              </span>
              {groupName && (
                <Badge variant="outline" className="rounded-md text-[10px] font-medium bg-muted/40 text-muted-foreground border-border/40 px-1.5 py-0">
                  {groupName}
                </Badge>
              )}
            </div>
          </div>

          <TooltipProvider delayDuration={150}>
            <div className="flex items-center gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    aria-label="Assistant information"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  align="end"
                  sideOffset={8}
                  className="text-xs p-3.5 rounded-2xl border border-border/40 bg-popover text-popover-foreground shadow-2xl leading-relaxed w-auto"
                >
                  <AssistantInfoTooltipContent variant="full" />
                </PopoverContent>
              </Popover>

              {messages.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="h-8 w-8 rounded-lg text-muted-foreground hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center"
                      onClick={handleClearHistory}
                      aria-label="Clear chat history"
                    >
                      <Trash2 className="w-4 h-4 transition-colors" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    align="center"
                    className="text-xs px-2.5 py-1.5 rounded-xl border border-border/40 bg-popover text-popover-foreground shadow-xl leading-relaxed"
                  >
                    Clear chat history
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>
        </div>
      ) : (
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3.5 sm:px-4 py-2.5 border-b border-border/20 bg-background/85 backdrop-blur-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/40 text-foreground border border-border/30 flex-shrink-0">
              <Icons.Bot className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold tracking-tight text-foreground truncate">
                {groupName ? `${groupName} Assistant` : 'Financial Assistant'}
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
              {groupName && (
                <Badge variant="outline" className="rounded-md text-[10px] font-medium bg-muted/40 text-muted-foreground border-border/40 px-1.5 py-0">
                  {groupName}
                </Badge>
              )}
            </div>
          </div>

          <TooltipProvider delayDuration={150}>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/assistant"
                    onClick={onClose}
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors flex items-center justify-center"
                    aria-label="Open full assistant page"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  align="center"
                  className="text-xs px-2.5 py-1.5 rounded-xl border border-border/40 bg-popover text-popover-foreground shadow-xl leading-relaxed"
                >
                  Open full page
                </TooltipContent>
              </Tooltip>

              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    aria-label="Assistant information"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  align="end"
                  sideOffset={8}
                  className="text-xs p-3.5 rounded-2xl border border-border/40 bg-popover text-popover-foreground shadow-2xl leading-relaxed w-auto"
                >
                  <AssistantInfoTooltipContent variant="widget" />
                </PopoverContent>
              </Popover>

              {messages.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="h-8 w-8 rounded-lg text-muted-foreground hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center"
                      onClick={handleClearHistory}
                      aria-label="Clear chat history"
                    >
                      <Trash2 className="w-4 h-4 transition-colors" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    align="center"
                    className="text-xs px-2.5 py-1.5 rounded-xl border border-border/40 bg-popover text-popover-foreground shadow-xl leading-relaxed"
                  >
                    Clear chat history
                  </TooltipContent>
                </Tooltip>
              )}

              {onClose && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors flex items-center justify-center"
                      onClick={onClose}
                      aria-label="Close"
                    >
                      <Icons.Close className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    align="center"
                    className="text-xs px-2.5 py-1.5 rounded-xl border border-border/40 bg-popover text-popover-foreground shadow-xl leading-relaxed"
                  >
                    Close
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>
        </div>
      )}

      {/* ── Messages Scroll Area ───────────────────────────────────────── */}
      <div className="flex-1 h-full w-full overflow-y-auto overflow-x-hidden">
        <div
          className={
            isFullPage
              ? "max-w-3xl mx-auto w-full min-w-0 px-4 sm:px-6 pt-16 pb-36 space-y-4"
              : "w-full max-w-full min-w-0 px-3.5 sm:px-4 pt-14 pb-28 space-y-3"
          }
        >
          {messages.length === 0 ? (
            isFullPage ? (
              <div className="h-full min-h-[calc(100dvh-17rem)] flex flex-col items-center justify-center text-center max-w-xl mx-auto py-8">
                <div className="h-12 w-12 rounded-2xl bg-muted/30 border border-border/30 flex items-center justify-center text-foreground mb-4 shadow-2xs">
                  <Icons.Bot className="w-6 h-6" />
                </div>
                <h4 className="text-2xl font-bold tracking-tight text-foreground">
                  How can I help you today{userProfile?.firstName ? `, ${userProfile.firstName}` : ''}?
                </h4>
                <p className="text-xs text-muted-foreground mt-1.5 mb-8 max-w-md mx-auto leading-relaxed">
                  Ask about monthly spending trends, member cuts, category timelines, or balances. All answers are based securely on your personal and group records.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
                  {(groupId ? GROUP_STARTER_PROMPTS : GLOBAL_STARTER_PROMPTS).map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(prompt)}
                      className="text-left text-xs p-3.5 rounded-xl bg-muted/20 hover:bg-muted/50 border border-border/30 text-foreground transition-all flex items-center justify-between group active:scale-[0.99]"
                    >
                      <span className="font-medium text-foreground/90">{prompt}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[380px] flex flex-col items-center justify-center text-center px-2 py-4 max-w-sm mx-auto">
                <div className="h-11 w-11 rounded-2xl bg-muted/30 border border-border/30 flex items-center justify-center text-foreground mb-3 shadow-2xs">
                  <Icons.Bot className="w-5 h-5" />
                </div>
                <h4 className="text-base font-semibold tracking-tight text-foreground">
                  How can I help you today{userProfile?.firstName ? `, ${userProfile.firstName}` : ''}?
                </h4>
                <p className="text-xs text-muted-foreground mt-1 mb-5 leading-relaxed">
                  Ask about spending trends, member cuts, or category timelines.
                </p>

                <div className="flex flex-col gap-2 w-full">
                  {(groupId ? GROUP_STARTER_PROMPTS : GLOBAL_STARTER_PROMPTS).map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(prompt)}
                      className="text-left text-xs px-3.5 py-2.5 rounded-xl bg-muted/20 hover:bg-muted/40 border border-border/30 text-foreground transition-all flex items-center justify-between group active:scale-[0.99]"
                    >
                      <span className="font-medium text-foreground/90">{prompt}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            )
          ) : (
            <>
              {messages.map((msg, idx) => (
                msg.content === '__BUDGET_ACTION_CARD__' && pendingBudgetProposal && msg.budgetProposalId === pendingBudgetProposal.requestId
                  ? (
                    <BudgetActionCard
                      key={idx}
                      proposal={pendingBudgetProposal}
                      onApprove={handleBudgetApprove}
                      onDeny={handleBudgetDeny}
                      status={budgetActionStatus}
                    />
                  ) : msg.content === '__BUDGET_ACTION_CARD__' ? (
                    <div key={idx} className="my-1.5 mx-1 rounded-xl border border-border/30 bg-muted/10 p-3 text-xs text-muted-foreground italic">
                      Budget change proposal expired.
                    </div>
                  ) : (
                    <MessageBubble
                      key={idx}
                      message={msg}
                      userName={userProfile?.firstName || 'You'}
                      isStreaming={isStreaming && idx === messages.length - 1 && msg.role === 'assistant'}
                      status={isStreaming && idx === messages.length - 1 && msg.role === 'assistant' ? streamStatus : null}
                      variant={variant}
                    />
                  )
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* ── Input Box (Floating Glass Overlay for both Full Page & Widget) ── */}
      {isFullPage ? (
        <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none bg-gradient-to-t from-background via-background/90 to-transparent pt-6 pb-4 sm:pb-6">
          <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 pointer-events-auto">
            <div className="relative flex items-end rounded-2xl bg-background/90 dark:bg-muted/30 border border-border/40 backdrop-blur-md shadow-lg focus-within:border-border/60 focus-within:bg-background focus-within:shadow-xl transition-all">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your expenses or balances..."
                rows={1}
                disabled={isStreaming}
                className="min-h-[46px] max-h-[140px] resize-none border-0 !bg-transparent !hover:bg-transparent !focus:bg-transparent !active:bg-transparent shadow-none px-4 py-3 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 leading-relaxed placeholder:text-muted-foreground/60"
              />
              <div className="p-1.5 flex-shrink-0 self-end">
                {isStreaming ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={handleStop}
                    className="h-8 w-8 min-h-[32px] max-h-[32px] rounded-lg bg-muted/40 text-foreground hover:bg-muted/70 hover:text-red-500 transition-all flex items-center justify-center group"
                    title="Stop generating (Esc)"
                    aria-label="Stop generating"
                  >
                    <Square className="w-3 h-3 fill-current text-foreground group-hover:text-red-500 transition-colors" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={!input.trim()}
                    onClick={() => handleSend()}
                    className="h-8 w-8 min-h-[32px] max-h-[32px] rounded-lg bg-transparent text-muted-foreground hover:bg-muted/70 hover:text-primary transition-colors disabled:opacity-25 disabled:pointer-events-none disabled:hover:bg-transparent disabled:hover:text-muted-foreground group"
                    title="Send message"
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4 transition-colors group-hover:text-primary" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 mt-2">
              <span className="text-[11px] text-muted-foreground/75 text-center">
                Insights based on your expense history
              </span>
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center h-4 w-4 rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors focus:outline-none"
                      aria-label="How insights are generated"
                    >
                      <Info className="w-3 h-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    align="center"
                    className="text-xs p-3.5 rounded-2xl border border-border/40 bg-popover text-popover-foreground shadow-2xl leading-relaxed"
                  >
                    <AssistantInfoTooltipContent variant="full" />
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none bg-gradient-to-t from-background via-background/95 to-transparent pt-5 pb-3 px-3.5">
          <div className="w-full pointer-events-auto">
            <div className="relative flex items-end rounded-2xl bg-background/90 dark:bg-muted/30 border border-border/40 backdrop-blur-md shadow-lg focus-within:border-border/60 focus-within:bg-background focus-within:shadow-xl transition-all">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about expenses or balances..."
                rows={1}
                disabled={isStreaming}
                className="min-h-[44px] max-h-[120px] resize-none border-0 !bg-transparent !hover:bg-transparent !focus:bg-transparent !active:bg-transparent shadow-none px-3.5 py-2.5 text-xs sm:text-sm focus-visible:ring-0 focus-visible:ring-offset-0 leading-relaxed placeholder:text-muted-foreground/60"
              />
              <div className="p-1.5 flex-shrink-0 self-end">
                {isStreaming ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={handleStop}
                    className="h-8 w-8 min-h-[32px] max-h-[32px] rounded-lg bg-muted/40 text-foreground hover:bg-muted/70 hover:text-red-500 transition-all flex items-center justify-center group"
                    title="Stop generating (Esc)"
                    aria-label="Stop generating"
                  >
                    <Square className="w-3 h-3 fill-current text-foreground group-hover:text-red-500 transition-colors" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={!input.trim()}
                    onClick={() => handleSend()}
                    className="h-8 w-8 min-h-[32px] max-h-[32px] rounded-lg bg-transparent text-muted-foreground hover:bg-muted/70 hover:text-primary transition-colors disabled:opacity-25 disabled:pointer-events-none disabled:hover:bg-transparent disabled:hover:text-muted-foreground group"
                    title="Send message"
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4 transition-colors group-hover:text-primary" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center gap-1 mt-1.5">
              <span className="text-[10px] text-muted-foreground/75 text-center">
                Private search · Encrypted history
              </span>
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors focus:outline-none"
                      aria-label="How insights are generated"
                    >
                      <Info className="w-2.5 h-2.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    align="center"
                    className="text-xs p-3.5 rounded-2xl border border-border/40 bg-popover text-popover-foreground shadow-2xl leading-relaxed"
                  >
                    <AssistantInfoTooltipContent variant="widget" />
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
