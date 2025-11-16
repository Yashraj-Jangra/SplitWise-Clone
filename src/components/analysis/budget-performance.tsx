
'use client';

import type { Expense } from '@/types';
import type { DateRange } from 'react-day-picker';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface BudgetPerformanceProps {
  currentExpenses: Expense[];
  dateRange: DateRange;
}

export function BudgetPerformance({ currentExpenses, dateRange }: BudgetPerformanceProps) {
  // Placeholder content
  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Performance</CardTitle>
        <CardDescription>How you're tracking against your budget goals.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
        <p>Budget Performance Widget Coming Soon</p>
      </CardContent>
    </Card>
  );
}
