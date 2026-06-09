

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

interface DashboardAddExpenseButtonProps {
  groups: Group[];
}

export function DashboardAddExpenseButton({ groups }: DashboardAddExpenseButtonProps) {
  const [isSelectGroupOpen, setIsSelectGroupOpen] = useState(false);

  // If there are no groups, the button is disabled.
  if (groups.length === 0) {
    return (
      <Button disabled size="icon" className="h-14 w-14 rounded-full">
        <Icons.Add className="h-6 w-6" />
      </Button>
    );
  }

  // If there is only one group, render the AddExpenseDialog directly, but with a different button style.
  if (groups.length === 1) {
    return <AddExpenseDialog 
        group={groups[0]} 
        trigger={
            <Button size="icon" className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90">
                <Icons.Add className="h-6 w-6" />
            </Button>
        }
    />;
  }
  
  // If there are multiple groups, show a selection dialog.
  return (
    <Dialog open={isSelectGroupOpen} onOpenChange={setIsSelectGroupOpen}>
      <DialogTrigger asChild>
        <Button size="icon" className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90">
          <Icons.Add className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select a Group</DialogTitle>
          <DialogDescription>
            Choose which group to add the new expense to.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
            <ScrollArea className="h-64">
                <div className="space-y-1 pr-2">
                    {groups.map((group) => (
                        <AddExpenseDialog
                            key={group.id}
                            group={group}
                            onExpenseAdded={() => {
                                setIsSelectGroupOpen(false);
                            }}
                            trigger={
                                <div className="flex w-full items-center gap-3 rounded-md p-3 text-left transition-colors hover:bg-muted">
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
