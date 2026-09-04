'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
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
    <Card className="h-full flex flex-col">
      {/* ── Header Matching DynamicSpendingChart & Dashboard Cards ── */}
      <CardHeader className="flex flex-row items-start justify-between pb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 flex-shrink-0 mt-0.5">
            <Icons.Bot className="w-4 h-4" />
          </div>
          <div>
            <CardTitle>Monthly Digest</CardTitle>
            <CardDescription>Smart trends from your group spending.</CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 rounded-full border-border/60 text-muted-foreground">
            {insight?.cached ? 'Cached' : 'AI'}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            disabled={isLoading || isRefreshing}
            onClick={() => fetchInsights(true)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
            title="Regenerate insights"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-foreground' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <Separator />

      {/* ── Content ── */}
      <CardContent className="flex-1 flex flex-col justify-between pt-6 space-y-4">
        <div className="flex-1">
          {isLoading && !insight ? (
            <div className="space-y-3 py-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : insight?.summary ? (
            <div className="text-sm text-foreground/90 leading-relaxed">
              <FormattedMarkdown content={insight.summary} className="text-sm space-y-2" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground space-y-2">
              <Icons.Bot className="w-10 h-10 opacity-30 mb-1" />
              <p className="text-sm font-medium text-foreground">No insights yet</p>
              <p className="text-xs text-muted-foreground max-w-[260px]">
                Add your first expenses this month to generate personalized AI financial insights.
              </p>
            </div>
          )}
        </div>

        {/* ── Action Footer ── */}
        <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-mono text-[11px]">
            {insight?.cached ? '6h cached' : 'Live generated'}
          </span>
          <Link
            href="/assistant"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors group"
          >
            <span>Open Assistant</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
