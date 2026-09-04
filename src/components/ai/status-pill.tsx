'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Database, Sparkles, Calculator, PenLine } from 'lucide-react';

export type AIStreamStage = 'analyzing' | 'searching' | 'calculating' | 'drafting';

export interface AIStatusDetail {
  stage: AIStreamStage;
  label?: string;
}

export type AIStreamStatus =
  | AIStreamStage
  | AIStatusDetail
  | 'retrieving'
  | 'thinking'
  | null;

export function resolveStatus(status: AIStreamStatus): { stage: AIStreamStage; label: string } {
  if (!status) {
    return { stage: 'analyzing', label: 'Understanding request' };
  }
  if (typeof status === 'object' && status !== null) {
    const stage = normalizeStage(status.stage);
    return {
      stage,
      label: status.label || getDefaultLabel(stage),
    };
  }
  const stage = normalizeStage(status);
  return {
    stage,
    label: getDefaultLabel(stage),
  };
}

function normalizeStage(stage: string): AIStreamStage {
  switch (stage) {
    case 'searching':
    case 'retrieving':
      return 'searching';
    case 'calculating':
      return 'calculating';
    case 'drafting':
      return 'drafting';
    case 'analyzing':
    case 'thinking':
    default:
      return 'analyzing';
  }
}

export function getDefaultLabel(stage: AIStreamStage): string {
  switch (stage) {
    case 'searching':
      return 'Searching expense records';
    case 'calculating':
      return 'Checking ledger & balances';
    case 'drafting':
      return 'Drafting answer';
    case 'analyzing':
    default:
      return 'Understanding request';
  }
}

interface StatusPillProps {
  status: AIStreamStatus;
  className?: string;
}

export function StatusPill({ status, className }: StatusPillProps) {
  if (!status) return null;
  const { stage, label } = resolveStatus(status);

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/40 border border-border/30 text-xs text-muted-foreground font-medium select-none animate-in fade-in zoom-in-95 duration-200',
        className
      )}
    >
      {stage === 'searching' && <Database className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 animate-pulse" />}
      {stage === 'calculating' && <Calculator className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 animate-pulse" />}
      {stage === 'drafting' && <PenLine className="w-3.5 h-3.5 text-primary animate-pulse" />}
      {stage === 'analyzing' && <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />}
      <span>{label}</span>
      <span className="inline-flex items-center gap-0.5 ml-0.5">
        <span className="w-1 h-1 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1 h-1 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1 h-1 rounded-full bg-muted-foreground/60 animate-bounce" />
      </span>
    </div>
  );
}
