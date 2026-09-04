'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Icons } from '@/components/icons';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FormattedMarkdown } from './formatted-markdown';
import { ThinkingBubble } from './thinking-bubble';
import type { AIStreamStatus } from './status-pill';
import type { ChatMessage } from '@/types/ai';

interface MessageBubbleProps {
  message: ChatMessage;
  userName?: string;
  isStreaming?: boolean;
  status?: AIStreamStatus;
}

export function MessageBubble({ message, userName = 'You', isStreaming, status }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const showThinkingState = !isUser && !message.content && (isStreaming || Boolean(status));

  return (
    <div
      className={cn(
        'flex gap-2.5 my-2.5 items-start',
        isUser ? 'flex-row-reverse self-end ml-auto max-w-[88%] sm:max-w-[80%]' : 'flex-row self-start mr-auto max-w-[95%] sm:max-w-[88%]'
      )}
    >
      <Avatar
        className={cn(
          'w-7 h-7 flex-shrink-0 rounded-lg text-xs mt-0.5 border',
          isUser
            ? 'bg-muted/40 border-border/40 text-foreground'
            : 'bg-muted/50 border-border/40 text-foreground'
        )}
      >
        <AvatarFallback className="rounded-lg text-[11px] font-semibold">
          {isUser ? userName.slice(0, 1).toUpperCase() : <Icons.Bot className="w-3.5 h-3.5 text-foreground" />}
        </AvatarFallback>
      </Avatar>

      {showThinkingState ? (
        <ThinkingBubble status={status || 'analyzing'} />
      ) : (
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm transition-all shadow-2xs',
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-xs leading-relaxed whitespace-pre-wrap break-words font-normal'
              : 'bg-muted/25 text-foreground border border-border/30 rounded-tl-xs w-full'
          )}
        >
          {isUser ? (
            message.content
          ) : (
            <FormattedMarkdown content={message.content} isStreaming={isStreaming} />
          )}
        </div>
      )}
    </div>
  );
}
