
'use client';

import type { Expense } from '@/types';
import type { DateRange } from 'react-day-picker';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';

interface BudgetPerformanceProps {
  currentExpenses: Expense[];
  dateRange: DateRange;
}

export function BudgetPerformance({ currentExpenses, dateRange }: BudgetPerformanceProps) {
  // Placeholder content since budget feature is not implemented
  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Performance</CardTitle>
        <CardDescription>How you're tracking against your budget goals.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
        <Icons.Landmark className="h-16 w-16 mb-4" />
        <p className="text-lg font-semibold">Budgeting Feature Coming Soon!</p>
        <p className="max-w-xs mx-auto">Set monthly or custom budgets for your spending categories and track your progress here.</p>
        <Button variant="secondary" className="mt-4" disabled>Set New Budget</Button>
      </CardContent>
    </Card>
  );
}
