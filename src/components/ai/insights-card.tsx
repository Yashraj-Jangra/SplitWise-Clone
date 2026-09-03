'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { RefreshCw, ArrowRight } from 'lucide-react';
import { FormattedMarkdown } from './formatted-markdown';
import type { AIInsight } from '@/types/ai';

export function AIInsightsCard() {
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchInsights = async (force = false) => {
    if (force) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });

      if (!res.ok) throw new Error('Failed to load insights');
      const data: AIInsight = await res.json();
      setInsight(data);
    } catch (err) {
      console.warn('Could not load AI insights:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInsights(false);
  }, []);

  return (
    <Card className="h-full flex flex-col justify-between border-border/30 rounded-2xl shadow-2xs bg-background overflow-hidden">
      {/* ── Minimalist Dialog-Style Header ─────────────────────────────── */}
      <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/30 flex flex-row items-center justify-between space-y-0 bg-background">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted/40 border border-border/40 text-foreground">
            <Icons.Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Monthly Digest</h3>
            <p className="text-[11px] text-muted-foreground">Smart trends from your group spending</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="rounded-md text-[10px] font-bold uppercase tracking-wider bg-muted text-foreground border-border/40 px-1.5 py-0.5">
            {insight?.cached ? 'Cached' : 'AI'}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            disabled={isLoading || isRefreshing}
            onClick={() => fetchInsights(true)}
            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            title="Regenerate insights"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-foreground' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      {/* ── Formatted Content ─────────────────────────────────────────── */}
      <CardContent className="p-4 sm:p-5 pt-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {isLoading && !insight ? (
            <div className="space-y-2 py-2">
              <div className="h-3.5 bg-muted/50 rounded-md animate-pulse w-full" />
              <div className="h-3.5 bg-muted/50 rounded-md animate-pulse w-5/6" />
              <div className="h-3.5 bg-muted/50 rounded-md animate-pulse w-4/6" />
            </div>
          ) : insight?.summary ? (
            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/30 text-xs text-foreground">
              <FormattedMarkdown content={insight.summary} className="text-xs space-y-1.5" />
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/30 text-xs text-muted-foreground">
              Add your first expenses this month to generate personalized AI financial insights.
            </div>
          )}
        </div>

        {/* ── Action Footer ────────────────────────────────────────────── */}
        <div className="pt-3 border-t border-border/20 flex items-center justify-between text-xs">
          <span className="text-[10px] text-muted-foreground font-mono">
            {insight?.cached ? '6h cached' : 'Live generated'}
          </span>
          <Link
            href="/assistant"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-primary transition-colors group"
          >
            <span>Open Assistant</span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
