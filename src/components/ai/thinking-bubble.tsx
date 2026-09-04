'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Database, Sparkles, Calculator, PenLine } from 'lucide-react';
import { resolveStatus, type AIStreamStatus, type AIStreamStage } from './status-pill';

interface ThinkingBubbleProps {
  status?: AIStreamStatus;
  className?: string;
}

function renderStatusIcon(stage: AIStreamStage) {
  switch (stage) {
    case 'searching':
      return <Database className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 animate-pulse flex-shrink-0" />;
    case 'calculating':
      return <Calculator className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 animate-pulse flex-shrink-0" />;
    case 'drafting':
      return <PenLine className="w-3.5 h-3.5 text-primary animate-pulse flex-shrink-0" />;
    case 'analyzing':
    default:
      return <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse flex-shrink-0" />;
  }
}

export function ThinkingBubble({ status = 'analyzing', className }: ThinkingBubbleProps) {
  const { stage, label } = resolveStatus(status);

  return (
    <div
      className={cn(
        'rounded-2xl rounded-tl-xs border border-border/30 bg-muted/25 px-4 py-3 shadow-2xs space-y-2.5 transition-all w-full max-w-[320px]',
        className
      )}
    >
      {/* Top Status Header with Dynamic Icon, Real Label & Bouncing Dots */}
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {renderStatusIcon(stage)}
        <span className="truncate text-foreground/90 font-medium">
          {label}
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
