'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Database, Sparkles } from 'lucide-react';
import type { AIStreamStatus } from './status-pill';

interface ThinkingBubbleProps {
  status?: AIStreamStatus;
  className?: string;
}

export function ThinkingBubble({ status = 'thinking', className }: ThinkingBubbleProps) {
  const isRetrieving = status === 'retrieving';

  return (
    <div
      className={cn(
        'rounded-2xl rounded-tl-xs border border-border/30 bg-muted/25 px-4 py-3 shadow-2xs space-y-2.5 transition-all w-full max-w-[320px]',
        className
      )}
    >
      {/* Top Status Header with Icon & Dots */}
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {isRetrieving ? (
          <Database className="w-3.5 h-3.5 text-muted-foreground animate-pulse flex-shrink-0" />
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse flex-shrink-0" />
        )}
        <span className="truncate">
          {isRetrieving ? 'Searching your records' : 'Thinking & calculating'}
        </span>
        <span className="inline-flex items-center gap-0.5 ml-auto flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
        </span>
      </div>

      {/* Shimmering Skeleton Preview Lines */}
      <div className="space-y-1.5 pt-0.5">
        <div className="h-2 rounded-full bg-muted-foreground/15 animate-pulse w-[85%]" />
        <div className="h-2 rounded-full bg-muted-foreground/10 animate-pulse w-[55%]" />
      </div>
    </div>
  );
}
