'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Database, Sparkles } from 'lucide-react';

export type AIStreamStatus = 'retrieving' | 'thinking' | null;

interface StatusPillProps {
  status: AIStreamStatus;
  className?: string;
}

export function StatusPill({ status, className }: StatusPillProps) {
  if (!status) return null;

  const isRetrieving = status === 'retrieving';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/40 border border-border/30 text-xs text-muted-foreground font-medium select-none animate-in fade-in zoom-in-95 duration-200',
        className
      )}
    >
      {isRetrieving ? (
        <Database className="w-3.5 h-3.5 text-muted-foreground animate-pulse" />
      ) : (
        <Sparkles className="w-3.5 h-3.5 text-primary" />
      )}
      <span>{isRetrieving ? 'Searching records' : 'Thinking'}</span>
      <span className="inline-flex items-center gap-0.5 ml-0.5">
        <span className="w-1 h-1 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1 h-1 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1 h-1 rounded-full bg-muted-foreground/60 animate-bounce" />
      </span>
    </div>
  );
}
