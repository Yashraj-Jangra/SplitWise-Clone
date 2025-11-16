
'use client';

import type { Expense } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface QuickInsightsProps {
    currentExpenses: Expense[];
    previousExpenses: Expense[];
}

export function QuickInsights({ currentExpenses, previousExpenses }: QuickInsightsProps) {
  // Placeholder content
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Quick Insights</CardTitle>
        <CardDescription>Actionable summaries of your spending.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center h-full text-muted-foreground">
        <p>Quick Insights Widget Coming Soon</p>
      </CardContent>
    </Card>
  );
}

