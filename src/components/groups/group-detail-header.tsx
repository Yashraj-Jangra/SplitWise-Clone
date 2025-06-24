
"use client";
import type { Group } from "@/types";
import { Icons } from "@/components/icons";
import Image from "next/image";
import { AddMemberDialog } from "@/components/groups/add-member-dialog";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { useState, useEffect } from "react";
import { format } from 'date-fns';
import { Button } from "../ui/button";

interface GroupDetailHeaderProps {
  group: Group;
}

export function GroupDetailHeader({ group }: GroupDetailHeaderProps) {

  return (
     <div className="p-6 bg-card rounded-xl border border-border/50">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
                <h1 className="text-3xl md:text-4xl font-bold font-headline text-foreground mb-1">{group.name}</h1>
                <p className="text-muted-foreground max-w-prose">{group.description}</p>
                <div className="mt-4 flex items-center text-sm text-muted-foreground">
                    <Icons.Users className="h-4 w-4 mr-2" />
                    <span>{group.members.length} Members</span>
                    <span className="mx-2">·</span>
                    <div className="font-semibold text-foreground">
                        Total Expenses: {CURRENCY_SYMBOL}{group.totalExpenses.toFixed(2)}
                    </div>
                </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
                <AddMemberDialog group={group} />
            </div>
        </div>
     </div>
  );
}
