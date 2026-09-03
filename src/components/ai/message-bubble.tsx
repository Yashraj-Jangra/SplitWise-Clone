'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Icons } from '@/components/icons';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { ChatMessage } from '@/types/ai';

interface MessageBubbleProps {
  message: ChatMessage;
  userName?: string;
  isStreaming?: boolean;
}

export function MessageBubble({ message, userName = 'You', isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex gap-2.5 my-2.5 items-start',
        isUser ? 'flex-row-reverse self-end ml-auto' : 'flex-row self-start mr-auto'
      )}
    >
      <Avatar className={cn('w-7 h-7 flex-shrink-0 text-xs mt-0.5', isUser ? 'bg-primary/20 text-primary' : 'bg-muted border border-border')}>
        <AvatarFallback className="text-[11px] font-semibold">
          {isUser ? userName.slice(0, 1).toUpperCase() : <Icons.Sparkles className="w-3.5 h-3.5 text-primary" />}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          'max-w-[85%] sm:max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words transition-all shadow-xs',
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-xs'
            : 'bg-card text-foreground border border-border/70 rounded-tl-xs'
        )}
      >
        {message.content}
        {isStreaming && (
          <span className="inline-block w-1.5 h-3.5 ml-1 bg-primary animate-pulse align-middle" />
        )}
      </div>
    </div>
  );
}
