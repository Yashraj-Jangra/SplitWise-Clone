'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { MessageBubble } from './message-bubble';
import type { AIStreamStatus } from './status-pill';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Trash2, ArrowRight, Info } from 'lucide-react';
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
}

export function ChatPanel({ groupId, groupName, className, onClose }: ChatPanelProps) {
  const { userProfile } = useAuth();
  const userId = userProfile?.uid || 'guest';
  const storageKey = `splitit_ai_history_${userId}${groupId ? `_${groupId}` : ''}`;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStatus, setStreamStatus] = useState<AIStreamStatus>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleSend = async (userText?: string) => {
    const textToSend = (userText || input).trim();
    if (!textToSend || isStreaming) return;

    setInput('');
    const userMsg: ChatMessage = { role: 'user', content: textToSend };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    setIsStreaming(true);
    setStreamStatus('retrieving');

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: updatedMessages.slice(-6),
          groupId,
        }),
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

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

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
              if (data.status === 'retrieving' || data.status === 'thinking') {
                setStreamStatus(data.status);
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
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ ${err.message || 'Sorry, I encountered an issue processing your query. Please try again.'}`,
        },
      ]);
    } finally {
      setStreamStatus(null);
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`flex flex-col h-full bg-background ${className || ''}`}>
      {/* ── Dialog Header Style Top Bar ───────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/30 bg-background flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/30 border border-border/40 text-foreground flex-shrink-0">
            <Icons.Bot className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight text-foreground truncate">
                {groupName ? `${groupName} Assistant` : 'Financial Assistant'}
              </h3>
              {groupName && (
                <Badge variant="outline" className="rounded-md text-[10px] font-medium bg-muted/40 text-muted-foreground border-border/40 px-1.5 py-0">
                  {groupName}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              Ask about your spending, balances, and shared debts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
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

      {/* ── Messages Scroll Area ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 max-w-sm mx-auto">
            <div className="h-12 w-12 rounded-2xl bg-muted/30 border border-border/30 flex items-center justify-center text-foreground mb-3 shadow-2xs">
              <Icons.Bot className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-foreground">
              Welcome{userProfile?.firstName ? `, ${userProfile.firstName}` : ''}
            </h4>
            <p className="text-xs text-muted-foreground mt-1 mb-5 leading-relaxed">
              Ask about your monthly spending, balances, or who owes you money. All answers are based securely on your personal and group records.
            </p>

            {/* Quick Prompt Cards matching the dialog style */}
            <div className="flex flex-col gap-2 w-full">
              {STARTER_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  className="text-left text-xs px-3.5 py-2.5 rounded-xl bg-muted/20 hover:bg-muted/50 border border-border/30 text-foreground transition-all flex items-center justify-between group active:scale-[0.99]"
                >
                  <span className="font-medium text-foreground/90">{prompt}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <MessageBubble
                key={idx}
                message={msg}
                userName={userProfile?.firstName || 'You'}
                isStreaming={isStreaming && idx === messages.length - 1 && msg.role === 'assistant'}
                status={isStreaming && idx === messages.length - 1 && msg.role === 'assistant' ? streamStatus : null}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* ── Dialog-Themed Input Box ────────────────────────────────────── */}
      <div className="p-3.5 sm:p-4 border-t border-border/30 bg-background flex-shrink-0">
        <div className="relative flex items-end rounded-xl bg-muted/20 border border-border/30 focus-within:border-border/60 focus-within:bg-background transition-all">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your expenses or balances..."
            rows={1}
            disabled={isStreaming}
            className="min-h-[44px] max-h-[120px] resize-none border-0 !bg-transparent !hover:bg-transparent !focus:bg-transparent !active:bg-transparent shadow-none px-3.5 py-3 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 leading-relaxed placeholder:text-muted-foreground/60"
          />
          <div className="p-1.5 flex-shrink-0 self-end">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              disabled={!input.trim() || isStreaming}
              onClick={() => handleSend()}
              className="h-8 w-8 min-h-[32px] max-h-[32px] rounded-lg bg-transparent text-muted-foreground hover:bg-muted/70 hover:text-primary transition-colors disabled:opacity-25 disabled:pointer-events-none disabled:hover:bg-transparent disabled:hover:text-muted-foreground group"
              title="Send message"
              aria-label="Send message"
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <Send className="w-4 h-4 transition-colors group-hover:text-primary" />
              )}
            </Button>
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
  );
}
