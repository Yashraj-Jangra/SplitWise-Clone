'use client';

import { useState } from 'react';
import type { Group } from '@/types';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { AddExpenseDialog } from '@/components/expenses/add-expense-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronRight } from 'lucide-react';
import React from 'react';
import { useHaptics } from '@/hooks/use-haptics';

interface BottomNavAddButtonProps {
  groups: Group[];
  currentGroup?: Group;
}

const FabTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ onClick, ...props }, ref) => {
    const haptic = useHaptics();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      haptic.medium();
      onClick?.(e);
    };

    return (
      <Button
        ref={ref}
        {...props}
        onClick={handleClick}
        size="icon"
        className={[
          // Base
          'relative h-16 w-16 rounded-full shadow-lg',
          'bg-primary text-primary-foreground',
          // Glow
          'shadow-[0_4px_24px_hsl(var(--primary)/0.45)]',
          // Press feel — more dramatic than regular buttons
          'active:scale-[0.88] active:shadow-[0_2px_8px_hsl(var(--primary)/0.3)]',
          'transition-all duration-150',
          // Hover
          'hover:bg-primary/90 hover:shadow-[0_6px_32px_hsl(var(--primary)/0.6)]',
          // Rotation on the icon handled inside
        ].join(' ')}
      >
        {/* Ripple ring */}
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-white/20 scale-0 active:scale-110 transition-transform duration-200"
        />
        <Icons.Add className="h-8 w-8 transition-transform duration-200 group-hover:rotate-90 relative z-10" />
        <span className="sr-only">Add Expense</span>
      </Button>
    );
  }
);
FabTrigger.displayName = 'FabTrigger';


export function BottomNavAddButton({ groups, currentGroup }: BottomNavAddButtonProps) {
  const [isSelectGroupOpen, setIsSelectGroupOpen] = useState(false);
  const haptic = useHaptics();

  if (currentGroup) {
    return (
      <AddExpenseDialog
        group={currentGroup}
        trigger={<FabTrigger />}
      />
    );
  }

  if (groups.length === 0) {
    return <FabTrigger disabled />;
  }

  if (groups.length === 1) {
    return (
      <AddExpenseDialog
        group={groups[0]}
        trigger={<FabTrigger />}
      />
    );
  }

  return (
    <Dialog open={isSelectGroupOpen} onOpenChange={setIsSelectGroupOpen}>
      <DialogTrigger asChild>
        <FabTrigger />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select a Group</DialogTitle>
          <DialogDescription>
            Choose which group to add the new expense to.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <ScrollArea className="h-64 scroll-momentum">
            <div className="space-y-1 pr-2">
              {groups.map((group) => (
                <AddExpenseDialog
                  key={group.id}
                  group={group}
                  onExpenseAdded={() => {
                    haptic.success();
                    setIsSelectGroupOpen(false);
                  }}
                  trigger={
                    <div
                      className="flex w-full items-center gap-3 rounded-md p-3 text-left transition-all active:scale-[0.98] active:bg-muted cursor-pointer hover:bg-muted"
                      onClick={() => haptic.light()}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={group.coverImageUrl} alt={group.name} />
                        <AvatarFallback>{getInitials(group.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold">{group.name}</p>
                        <p className="text-sm text-muted-foreground">{group.members.length} members</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  }
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
