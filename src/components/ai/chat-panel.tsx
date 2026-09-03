'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { MessageBubble } from './message-bubble';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Trash2, ArrowRight } from 'lucide-react';
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
        throw new Error(err.error || 'Failed to connect to AI assistant');
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
              if (data.token) {
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
                Financial Assistant
              </h3>
              <Badge variant="outline" className="rounded-md text-[10px] font-bold uppercase tracking-wider bg-muted text-foreground border-border/40 px-1.5 py-0">
                {groupName ? groupName : 'Oracle 23ai'}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              Private vector-grounded expense analysis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              onClick={handleClearHistory}
              title="Clear chat history"
            >
              <Trash2 className="w-4 h-4" />
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
              Ask about your monthly spending, balances, split debts, or group summaries. Answers are grounded in your private records.
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
            placeholder="Ask anything about your expenses..."
            rows={1}
            disabled={isStreaming}
            className="min-h-[44px] max-h-[120px] resize-none border-0 !bg-transparent !hover:bg-transparent !focus:bg-transparent !active:bg-transparent shadow-none px-3.5 py-3 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 leading-relaxed placeholder:text-muted-foreground/60"
          />
          <div className="p-1.5 flex-shrink-0">
            <Button
              type="button"
              size="icon"
              disabled={!input.trim() || isStreaming}
              onClick={() => handleSend()}
              className="h-8 w-8 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-30"
              title="Send message"
            >
              {isStreaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2 opacity-70">
          Powered by Oracle 23ai Native Vector Retrieval & Gemini
        </p>
      </div>
    </div>
  );
}
