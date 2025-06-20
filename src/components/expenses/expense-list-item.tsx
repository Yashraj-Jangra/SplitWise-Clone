"use client";

import type { Expense } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icons } from "@/components/icons";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface ExpenseListItemProps {
  expense: Expense;
  currentUserId: string; // To determine user's involvement
}

const getInitials = (name: string) => {
    const names = name.split(' ');
    let initials = names[0].substring(0, 1).toUpperCase();
    if (names.length > 1) {
      initials += names[names.length - 1].substring(0, 1).toUpperCase();
    }
    return initials;
};

export function ExpenseListItem({ expense, currentUserId }: ExpenseListItemProps) {
  const { toast } = useToast();
  const currentUserParticipation = expense.participants.find(p => p.user.id === currentUserId);
  const amountUserOwes = currentUserParticipation ? currentUserParticipation.amountOwed : 0;
  const isPayer = expense.paidBy.id === currentUserId;

  const handleDelete = () => {
    // Simulate delete
    toast({ title: "Expense Deleted", description: `"${expense.description}" has been removed.` });
    // Here you would call an API and update state/refresh
  };

  const handleEdit = () => {
    // Simulate edit - typically open a dialog with form
    toast({ title: "Edit Expense", description: `Editing "${expense.description}". (Not implemented)` });
  };

  return (
    <div className="flex items-center justify-between p-4 border-b hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src={expense.paidBy.avatarUrl} alt={expense.paidBy.name} />
          <AvatarFallback>{getInitials(expense.paidBy.name)}</AvatarFallback>
        </Avatar>
        <div className="grid gap-0.5">
          <p className="text-sm font-medium leading-none truncate max-w-[150px] sm:max-w-xs">{expense.description}</p>
          <p className="text-xs text-muted-foreground">
            Paid by {isPayer ? "You" : expense.paidBy.name} • {formatDistanceToNow(new Date(expense.date), { addSuffix: true })}
          </p>
          {expense.category && <Badge variant="outline" className="w-fit text-xs">{expense.category}</Badge>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <p className="text-sm font-semibold text-foreground">{CURRENCY_SYMBOL}{expense.amount.toFixed(2)}</p>
          {currentUserParticipation && !isPayer && (
            <p className="text-xs text-red-600">You owe: {CURRENCY_SYMBOL}{amountUserOwes.toFixed(2)}</p>
          )}
          {isPayer && (
             <p className="text-xs text-green-600">You paid</p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Icons.MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Expense options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleEdit}>
              <Icons.Edit className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600 focus:bg-red-50">
              <Icons.Delete className="mr-2 h-4 w-4" /> Delete
            </Dropdown