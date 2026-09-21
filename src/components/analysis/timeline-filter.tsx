
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Icons } from '@/components/icons';
import { format, subDays, startOfMonth, startOfYear, isValid } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
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
  isMobile?: boolean;
}

export function TimelineFilter({ selectedRange, onRangeChange, allExpenses, isMobile = false }: TimelineFilterProps) {
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
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2.5 sm:p-3 border rounded-xl bg-card/60 backdrop-blur-md w-full min-w-0 max-w-full overflow-hidden">
        {/* Preset filter pills: smoothly scrollable on mobile, flex-wrap on desktop */}
        <div className="w-full sm:w-auto overflow-x-auto no-scrollbar min-w-0 py-0.5">
          <div className="flex items-center gap-1.5 w-max sm:w-auto sm:flex-wrap">
            {presets.map(p => {
              const isSelected = selectedRange.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePresetChange(p.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                      : "bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground border-border/40"
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Custom Range Popover */}
        <Popover open={isCustomPickerOpen} onOpenChange={setIsCustomPickerOpen}>
            <PopoverTrigger asChild>
                 <Button variant="outline" className="w-full sm:w-auto sm:min-w-[240px] justify-start text-left font-normal h-9 sm:h-10 text-xs sm:text-sm shrink-0 border-border/40 bg-muted/20">
                    <Icons.Calendar className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">
                      {selectedRange.range?.from && isValid(selectedRange.range.from) ? (
                          selectedRange.range.to && isValid(selectedRange.range.to) ? (
                          <>
                              {format(selectedRange.range.from, 'LLL dd, y')} - {format(selectedRange.range.to, 'LLL dd, y')}
                          </>
                          ) : (
                          format(selectedRange.range.from, 'LLL dd, y')
                          )
                      ) : (
                          <span>Custom Date Range</span>
                      )}
                    </span>
                 </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={selectedRange.range?.from}
                    selected={selectedRange.range}
                    onSelect={handleCustomDateChange}
                    numberOfMonths={isMobile ? 1 : 2}
                />
            </PopoverContent>
        </Popover>
    </div>
  );
}
