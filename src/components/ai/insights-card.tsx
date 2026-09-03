'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Sparkles, RefreshCw, ArrowRight, Loader2 } from 'lucide-react';
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
    <Card className="h-full flex flex-col justify-between border-border/70 shadow-2xs">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <div>
          <div className="flex items-center gap-1.5 text-primary mb-1">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">AI Insights</span>
          </div>
          <CardTitle className="text-base font-bold">Monthly Digest</CardTitle>
          <CardDescription className="text-xs">Smart trends from your spending</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          disabled={isLoading || isRefreshing}
          onClick={() => fetchInsights(true)}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Regenerate insights"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
        </Button>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-between pt-2">
        <div className="space-y-3">
          {isLoading && !insight ? (
            <div className="space-y-2 py-2">
              <div className="h-4 bg-muted rounded-md animate-pulse w-full" />
              <div className="h-4 bg-muted rounded-md animate-pulse w-5/6" />
              <div className="h-4 bg-muted rounded-md animate-pulse w-4/6" />
            </div>
          ) : insight?.summary ? (
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40 text-xs leading-relaxed text-foreground whitespace-pre-wrap">
              {insight.summary}
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-muted/20 text-xs text-muted-foreground">
              Add your first few expenses this month to unlock personalized AI financial insights.
            </div>
          )}
        </div>

        <div className="pt-3 mt-2 border-t border-border/30 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {insight?.cached ? '6h cached digest' : 'Live generated'}
          </span>
          <Link
            href="/assistant"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline group"
          >
            <span>Ask Assistant</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
