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
  variant?: 'widget' | 'full';
}

export function MessageBubble({ message, userName = 'You', isStreaming, status, variant = 'widget' }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const showThinkingState = !isUser && !message.content && (isStreaming || Boolean(status));
  const isFullPage = variant === 'full';

  return (
    <div
      className={cn(
        'flex items-start transition-all',
        isFullPage ? 'gap-3.5 my-4' : 'gap-2.5 my-2.5',
        isUser
          ? 'flex-row-reverse self-end ml-auto max-w-[85%] sm:max-w-[75%]'
          : 'flex-row self-start mr-auto w-full max-w-full'
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
            'text-sm transition-all',
            isUser
              ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-xs px-4 py-2.5 leading-relaxed whitespace-pre-wrap break-words font-normal shadow-2xs'
              : isFullPage
              ? 'text-foreground leading-relaxed w-full pt-0.5'
              : 'bg-muted/25 text-foreground border border-border/30 rounded-2xl rounded-tl-xs px-4 py-2.5 shadow-2xs w-full'
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
