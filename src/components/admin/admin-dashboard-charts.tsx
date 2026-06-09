'use client';

import { useMemo } from 'react';
import type { UserProfile, Group, Expense, SupportTicket } from '@/types';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer,
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { format, startOfMonth, subMonths } from 'date-fns';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { getFullName } from '@/lib/utils';

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-6))',
  'hsl(var(--chart-7))',
  'hsl(var(--chart-8))',
];

/* ─── User Growth (Area) ─── */
export function UserGrowthChart({ users }: { users: UserProfile[] }) {
  const data = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = startOfMonth(subMonths(now, 11 - i));
      return { key: format(d, 'yyyy-MM'), label: format(d, 'MMM yy'), count: 0, cumulative: 0 };
    });
    users.forEach(u => {
      if (!u.createdAt) return;
      const key = format(new Date(u.createdAt), 'yyyy-MM');
      const month = months.find(m => m.key === key);
      if (month) month.count++;
    });
    let cum = 0;
    months.forEach(m => { cum += m.count; m.cumulative = cum; });
    return months;
  }, [users]);

  const config: ChartConfig = {
    count: { label: 'New Users', color: 'hsl(var(--chart-1))' },
    cumulative: { label: 'Total Users', color: 'hsl(var(--chart-2))' },
  };

  return (
    <ChartContainer config={config} className="h-[260px] w-full">
      <AreaChart data={data} margin={{ left: -10, right: 10 }}>
        <defs>
          <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.2} />
            <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />
        <YAxis tickLine={false} axisLine={false} tickMargin={4} className="text-xs" />
        <Tooltip content={<ChartTooltipContent indicator="dot" />} />
        <Legend iconSize={10} formatter={v => <span className="text-xs text-muted-foreground">{config[v]?.label ?? v}</span>} />
        <Area type="monotone" dataKey="cumulative" stroke="hsl(var(--chart-2))" fill="url(#grad2)" strokeWidth={2} dot={false} name="cumulative" />
        <Area type="monotone" dataKey="count" stroke="hsl(var(--chart-1))" fill="url(#grad1)" strokeWidth={2} dot={false} name="count" />
      </AreaChart>
    </ChartContainer>
  );
}

/* ─── Expense Volume Over Time (Bar) ─── */
export function ExpenseVolumeChart({ expenses }: { expenses: Expense[] }) {
  const data = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = startOfMonth(subMonths(now, 5 - i));
      return { key: format(d, 'yyyy-MM'), label: format(d, 'MMM yy'), volume: 0, count: 0 };
    });
    expenses.forEach(e => {
      const key = format(new Date(e.date), 'yyyy-MM');
      const month = months.find(m => m.key === key);
      if (month) { month.volume += e.amount; month.count++; }
    });
    return months;
  }, [expenses]);

  const config: ChartConfig = {
    volume: { label: `Volume (${CURRENCY_SYMBOL})`, color: 'hsl(var(--chart-3))' },
  };

  return (
    <ChartContainer config={config} className="h-[240px] w-full">
      <BarChart data={data} margin={{ left: -10, right: 10 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />
        <YAxis tickLine={false} axisLine={false} tickMargin={4} tickFormatter={v => `${CURRENCY_SYMBOL}${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}`} className="text-xs" />
        <Tooltip content={<ChartTooltipContent indicator="dot" formatter={(val) => [`${CURRENCY_SYMBOL}${Number(val).toFixed(2)}`, `Volume`]} />} />
        <Bar dataKey="volume" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} name="volume" />
      </BarChart>
    </ChartContainer>
  );
}

/* ─── Category Breakdown (Donut) ─── */
export function CategoryDonutChart({ expenses }: { expenses: Expense[] }) {
  const data = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => {
      const cat = e.masterCategory || 'Other';
      map[cat] = (map[cat] || 0) + e.amount;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [expenses]);

  const config = useMemo(() => data.reduce((acc, d, i) => {
    acc[d.name] = { label: d.name, color: CHART_COLORS[i % CHART_COLORS.length] };
    return acc;
  }, {} as ChartConfig), [data]);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <ChartContainer config={config} className="h-[240px] w-full">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Pie>
        <Tooltip
          content={<ChartTooltipContent formatter={(val, name) => [
            <span key="v">{CURRENCY_SYMBOL}{Number(val).toFixed(2)} <span className="text-muted-foreground text-xs">({total > 0 ? ((Number(val)/total)*100).toFixed(1) : 0}%)</span></span>,
            name
          ]} />}
        />
        <Legend iconSize={10} formatter={v => <span className="text-xs text-muted-foreground">{v}</span>} />
      </PieChart>
    </ChartContainer>
  );
}

/* ─── Group Size Distribution (Histogram) ─── */
export function GroupSizeHistogram({ groups }: { groups: Group[] }) {
  const data = useMemo(() => {
    const buckets = [
      { label: '2', min: 2, max: 2, count: 0 },
      { label: '3–4', min: 3, max: 4, count: 0 },
      { label: '5–6', min: 5, max: 6, count: 0 },
      { label: '7–10', min: 7, max: 10, count: 0 },
      { label: '11+', min: 11, max: Infinity, count: 0 },
    ];
    groups.forEach(g => {
      const size = g.members.length;
      const bucket = buckets.find(b => size >= b.min && size <= b.max);
      if (bucket) bucket.count++;
    });
    return buckets;
  }, [groups]);

  const config: ChartConfig = { count: { label: 'Groups', color: 'hsl(var(--chart-4))' } };

  return (
    <ChartContainer config={config} className="h-[240px] w-full">
      <BarChart data={data} margin={{ left: -10, right: 10 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} className="text-xs" label={{ value: 'Members', position: 'insideBottom', offset: -2, className: 'text-xs fill-muted-foreground' }} />
        <YAxis tickLine={false} axisLine={false} tickMargin={4} allowDecimals={false} className="text-xs" />
        <Tooltip content={<ChartTooltipContent indicator="dot" />} />
        <Bar dataKey="count" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} name="count" />
      </BarChart>
    </ChartContainer>
  );
}

/* ─── Top Groups by Spend (Horizontal Bar) ─── */
export function TopGroupsChart({ groups }: { groups: Group[] }) {
  const data = useMemo(() =>
    [...groups]
      .filter(g => g.totalExpenses > 0)
      .sort((a, b) => b.totalExpenses - a.totalExpenses)
      .slice(0, 6)
      .map(g => ({ name: g.name.length > 16 ? g.name.slice(0, 14) + '…' : g.name, total: g.totalExpenses })),
    [groups]);

  const config: ChartConfig = { total: { label: 'Total Spent', color: 'hsl(var(--chart-5))' } };

  return (
    <ChartContainer config={config} className="h-[240px] w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20 }}>
        <XAxis type="number" hide />
        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={6} width={110} className="text-xs" stroke="hsl(var(--muted-foreground))" />
        <Tooltip content={<ChartTooltipContent formatter={(val) => [`${CURRENCY_SYMBOL}${Number(val).toFixed(2)}`, 'Total']} />} />
        <Bar dataKey="total" radius={4} name="total">
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
