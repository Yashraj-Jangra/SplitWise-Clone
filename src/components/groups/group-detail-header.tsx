
"use client";
import type { Group } from "@/types";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import { AddMemberDialog } from "@/components/groups/add-member-dialog";
import { CURRENCY_SYMBOL } from "@/lib/constants";

interface GroupDetailHeaderProps {
  group: Group;
}

export function GroupDetailHeader({ group }: GroupDetailHeaderProps) {
  return (
    <div className="mb-6">
      <div className="relative h-48 md:h-64 rounded-lg overflow-hidden mb-6 shadow-lg">
        <Image
          src={group.coverImageUrl || `https://placehold.co/1200x400.png?text=${encodeURIComponent(group.name)}`}
          alt={group.name}
          layout="fill"
          objectFit="cover"
          className="transition-transform duration-500 hover:scale-105"
          data-ai-hint="group event cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-6 flex flex-col justify-end">
          <h1 className="text-3xl md:text-4xl font-bold font-headline text-white mb-1">{group.name}</h1>
          <p className="text-sm text-gray-200 line-clamp-2">{group.description}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-card rounded-lg shadow">
        <div className="space-y-1">
          <div className="flex items-center text-sm text-muted-foreground">
            <Icons.Users className="h-4 w-4 mr-2" />
            <span>{group.members.length} Members</span>
            <span className="mx-2">·</span>
            <Icons.Calendar className="h-4 w-4 mr-1" />
            <span>Created: {new Date(group.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="text-lg font-semibold text-foreground">
            Total Group Expenses: {CURRENCY_SYMBOL}{group.totalExpenses.toFixed(2)}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <AddMemberDialog group={group} />
          <AddExpenseDialog group={group} />
        </div>
      </div>
    </div>
  );
}
