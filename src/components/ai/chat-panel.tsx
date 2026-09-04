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
import { Send, Trash2, ArrowRight, Info, Square, Maximize2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ChatMessage } from '@/types/ai';

const STARTER_PROMPTS = [
  'How much did I spend this month?',
  'Who owes me money right now?',
  'What are my highest expense categories?',
  'Summarize recent group expenses',
];

interface ChatPanelProps {
  groupId?: string;
  groupName?: string;
  className?: string;
  onClose?: () => void;
  variant?: 'widget' | 'full';
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
          setMessages(parsed);
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
    const isBalance = /(balance|owe|owed|debt|dues|who owes|settle|net balance)/i.test(lower);
    const isExpense = /(spend|spent|expense|cost|receipt|bill|category|hotel|flight|food|dinner|lunch|groceries|trip)/i.test(lower);

    if (isExplicitDraft) {
      setStreamStatus({ stage: 'drafting', label: 'Drafting response...' });
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

          <div className="flex items-center gap-1">
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors flex items-center justify-center"
                    aria-label="Assistant information"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  align="end"
                  className="max-w-xs text-xs p-3 rounded-xl border border-border/40 bg-popover text-popover-foreground shadow-xl leading-relaxed"
                >
                  <p className="font-semibold text-foreground mb-1">Financial Assistant</p>
                  <p className="text-muted-foreground text-[11px]">
                    Answers questions using your recorded transactions, balances, and group expenses. Calculations and insights are performed securely and kept private to your account.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-red-500 dark:hover:text-red-400 hover:bg-transparent active:bg-transparent transition-colors"
                onClick={handleClearHistory}
                title="Clear chat history"
              >
                <Trash2 className="w-4 h-4 transition-colors" />
              </Button>
            )}
          </div>
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

          <div className="flex items-center gap-0.5 flex-shrink-0">
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/assistant"
                    onClick={onClose}
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors flex items-center justify-center"
                    aria-label="Open full assistant page"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
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
            </TooltipProvider>

            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors flex items-center justify-center"
                    aria-label="Assistant information"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  align="end"
                  className="max-w-xs text-xs p-3 rounded-xl border border-border/40 bg-popover text-popover-foreground shadow-xl leading-relaxed"
                >
                  <p className="font-semibold text-foreground mb-1">Financial Assistant</p>
                  <p className="text-muted-foreground text-[11px]">
                    Answers questions using your recorded transactions, balances, and group expenses. Calculations and insights are performed securely and kept private to your account.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-red-500 dark:hover:text-red-400 hover:bg-transparent active:bg-transparent transition-colors"
                onClick={handleClearHistory}
                title="Clear chat history"
              >
                <Trash2 className="w-4 h-4 transition-colors" />
              </Button>
            )}

            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                onClick={onClose}
                title="Close"
              >
                <Icons.Close className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Messages Scroll Area ───────────────────────────────────────── */}
      <div className="flex-1 h-full w-full overflow-y-auto">
        <div
          className={
            isFullPage
              ? "max-w-3xl mx-auto w-full px-4 sm:px-6 pt-16 pb-36 space-y-4"
              : "w-full px-3.5 sm:px-4 pt-14 pb-28 space-y-3"
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
                  Ask about your monthly spending, balances, or who owes you money. All answers are based securely on your personal and group records.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
                  {STARTER_PROMPTS.map((prompt, idx) => (
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
                  Ask about your monthly spending, balances, or who owes you money.
                </p>

                <div className="flex flex-col gap-2 w-full">
                  {STARTER_PROMPTS.map((prompt, idx) => (
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
                <MessageBubble
                  key={idx}
                  message={msg}
                  userName={userProfile?.firstName || 'You'}
                  isStreaming={isStreaming && idx === messages.length - 1 && msg.role === 'assistant'}
                  status={isStreaming && idx === messages.length - 1 && msg.role === 'assistant' ? streamStatus : null}
                  variant={variant}
                />
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
                    className="max-w-xs text-xs p-2.5 rounded-xl border border-border/40 bg-popover text-popover-foreground shadow-xl leading-relaxed"
                  >
                    <p className="font-semibold text-foreground mb-0.5">Private Context Retrieval</p>
                    <p className="text-muted-foreground text-[11px]">
                      Answers are generated strictly from your personal expense history and shared group balances using private search. No personal financial data is shared or used for model training.
                    </p>
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
                    className="max-w-xs text-xs p-2.5 rounded-xl border border-border/40 bg-popover text-popover-foreground shadow-xl leading-relaxed"
                  >
                    <p className="font-semibold text-foreground mb-0.5">Private Context Retrieval</p>
                    <p className="text-muted-foreground text-[11px]">
                      Answers are generated strictly from your personal expense history and shared group balances using private search. No personal financial data is shared or used for model training.
                    </p>
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
