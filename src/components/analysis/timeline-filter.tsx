
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Icons } from '@/components/icons';
import { format, subDays, startOfMonth, startOfYear, isValid } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { Expense } from '@/types';

export interface DateRangePreset {
  id: string;
  label: string;
  range: DateRange;
}

const presets: Omit<DateRangePreset, 'range'>[] = [
  { id: 'last7', label: 'Last 7 Days' },
  { id: 'last30', label: 'Last 30 Days' },
  { id: 'last90', label: 'Last 90 Days' },
  { id: 'thisMonth', label: 'This Month' },
  { id: 'thisYear', label: 'This Year' },
  { id: 'allTime', label: 'All Time' },
];

interface TimelineFilterProps {
  selectedRange: DateRangePreset;
  onRangeChange: (range: DateRangePreset) => void;
  allExpenses: Expense[];
}

export function TimelineFilter({ selectedRange, onRangeChange, allExpenses }: TimelineFilterProps) {
  const [isCustomPickerOpen, setIsCustomPickerOpen] = useState(false);

  const getRangeForPreset = (id: string): DateRange => {
    const now = new Date();
    switch (id) {
      case 'last7':
        return { from: subDays(now, 6), to: now };
      case 'last30':
        return { from: subDays(now, 29), to: now };
      case 'last90':
        return { from: subDays(now, 89), to: now };
      case 'thisMonth':
        return { from: startOfMonth(now), to: now };
      case 'thisYear':
        return { from: startOfYear(now), to: now };
      case 'allTime':
        if (allExpenses.length === 0) return { from: subDays(now, 29), to: now };
        const firstDate = allExpenses.reduce((min, e) => new Date(e.date) < min ? new Date(e.date) : min, new Date());
        return { from: firstDate, to: now };
      default:
        return { from: subDays(now, 29), to: now };
    }
  };

  const handlePresetChange = (id: string | undefined) => {
    if (id) {
      onRangeChange({ id, label: presets.find(p => p.id === id)?.label || 'Custom', range: getRangeForPreset(id) });
    }
  };
  
  const handleCustomDateChange = (range: DateRange | undefined) => {
    if (range?.from) {
      onRangeChange({
        id: 'custom',
        label: 'Custom Range',
        range: range
      });
      setIsCustomPickerOpen(false);
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 border rounded-lg bg-card/80">
        <ToggleGroup
            type="single"
            value={selectedRange.id}
            onValueChange={handlePresetChange}
            className="flex-wrap justify-start"
        >
            {presets.map(p => (
                <ToggleGroupItem key={p.id} value={p.id} size="sm" variant="outline" className="text-xs sm:text-sm">
                    {p.label}
                </ToggleGroupItem>
            ))}
        </ToggleGroup>
        
        <Popover open={isCustomPickerOpen} onOpenChange={setIsCustomPickerOpen}>
            <PopoverTrigger asChild>
                 <Button variant="outline" className="w-full sm:w-[280px] justify-start text-left font-normal h-10">
                    <Icons.Calendar className="mr-2 h-4 w-4" />
                    {selectedRange.range?.from && isValid(selectedRange.range.from) ? (
                        selectedRange.range.to && isValid(selectedRange.range.to) ? (
                        <>
                            {format(selectedRange.range.from, 'LLL dd, y')} - {format(selectedRange.range.to, 'LLL dd, y')}
                        </>
                        ) : (
                        format(selectedRange.range.from, 'LLL dd, y')
                        )
                    ) : (
                        <span>Pick a date range</span>
                    )}
                    </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={selectedRange.range?.from}
                    selected={selectedRange.range}
                    onSelect={handleCustomDateChange}
                    numberOfMonths={2}
                />
            </PopoverContent>
        </Popover>
    </div>
  );
}
