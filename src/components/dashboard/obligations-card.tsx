
'use client';

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { UserProfile, Balance, Group } from '@/types';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { getFullName, getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AddSettlementDialog } from '@/components/settlements/add-settlement-dialog';
import { useAuth } from '@/contexts/auth-context';
import { getGroupsByUserId, getGroupBalances, simplifyDebts } from '@/lib/mock-data';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';


interface Obligation {
    user: UserProfile;
    amount: number;
}

interface ObligationsCardProps {
    balances: Balance[];
    type: 'owed' | 'owes';
}

export function ObligationsCard({ balances, type }: ObligationsCardProps) {
    const { total, obligations } = useMemo(() => {
        let totalAmount = 0;
        let obligationList: Obligation[] = [];

        if (type === 'owed') {
            // You are owed -> other people's balance is negative
            obligationList = balances
                .filter(b => b.netBalance < -0.01)
                .map(b => ({ user: b.user, amount: Math.abs(b.netBalance) }));
            totalAmount = obligationList.reduce((sum, item) => sum + item.amount, 0);
        } else {
            // You owe -> other people's balance is positive
            obligationList = balances
                .filter(b => b.netBalance > 0.01)
                .map(b => ({ user: b.user, amount: b.netBalance }));
            totalAmount = obligationList.reduce((sum, item) => sum + item.amount, 0);
        }

        return { total: totalAmount, obligations: obligationList.sort((a,b) => b.amount - a.amount) };
    }, [balances, type]);

    const [open, setOpen] = useState(false);
    const [view, setView] = useState<'list' | 'groups'>('list');
    const [selectedObligation, setSelectedObligation] = useState<Obligation | null>(null);
    const [sharedGroupsWithBalance, setSharedGroupsWithBalance] = useState<Array<{ group: Group; amountOwed: number }>>([]);
    const [groupsLoading, setGroupsLoading] = useState(false);
    const { userProfile } = useAuth();
    
    const handleObligationSelect = async (obligation: Obligation) => {
        if (!userProfile) return;
        setGroupsLoading(true);
        setSelectedObligation(obligation);

        const allUserGroups = await getGroupsByUserId(userProfile.uid);
        const groupsInCommon = allUserGroups.filter(g => g.members.some(m => m.uid === obligation.user.uid));
        
        const groupsWithBalances = await Promise.all(
            groupsInCommon.map(async (group) => {
                const groupBalances = await getGroupBalances(group.id);
                const simplifiedDebtsForGroup = simplifyDebts(groupBalances);

                // Find the specific debt from you to the selected user in this group
                const debt = simplifiedDebtsForGroup.find(
                    s => s.from.uid === userProfile.uid && s.to.uid === obligation.user.uid
                );
                
                // Also check if they owe you in this group, to calculate the net debt for just this group
                const credit = simplifiedDebtsForGroup.find(
                    s => s.to.uid === userProfile.uid && s.from.uid === obligation.user.uid
                );

                const amountOwed = (debt?.amount || 0) - (credit?.amount || 0);

                return { group, amountOwed: amountOwed > 0.01 ? amountOwed : 0 };
            })
        );
        
        setSharedGroupsWithBalance(groupsWithBalances.sort((a,b) => b.amountOwed - a.amountOwed));
        
        setGroupsLoading(false);
        setView('groups');
    }

    const handleBack = () => {
        setView('list');
        setSelectedObligation(null);
        setSharedGroupsWithBalance([]);
    }

    useEffect(() => {
        if (!open) {
            setTimeout(() => {
                handleBack();
            }, 300);
        }
    }, [open]);


    const title = type === 'owed' ? 'You Are Owed' : 'You Owe';
    const totalColor = type === 'owed' ? 'text-green-500' : 'text-red-500';
    
    const GroupToSettleItem = ({ group, amountOwed }: { group: Group, amountOwed: number }) => {
        const hasDebt = amountOwed > 0.01;

        const itemContent = (
            <div
                className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-md p-3 text-left transition-colors",
                    hasDebt ? "hover:bg-muted cursor-pointer" : "opacity-60 bg-muted/30 cursor-not-allowed"
                )}
            >
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={group.coverImageUrl} alt={group.name} />
                        <AvatarFallback>{getInitials(group.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold">{group.name}</p>
                        <p className="text-sm text-muted-foreground">{group.members.length} members</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">You Owe</p>
                        <p className={cn("font-bold", hasDebt ? "text-destructive" : "text-muted-foreground")}>
                            {CURRENCY_SYMBOL}{amountOwed.toFixed(2)}
                        </p>
                    </div>
                    {hasDebt && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                </div>
            </div>
        );

        if (hasDebt) {
            return (
                <AddSettlementDialog
                    key={group.id}
                    group={group}
                    initialSettlement={{
                        paidById: userProfile!.uid,
                        paidToId: selectedObligation!.user.uid,
                        amount: amountOwed,
                    }}
                    trigger={itemContent}
                />
            );
        }
        
        return <div key={group.id}>{itemContent}</div>;
    };


    const SettleNowButton = (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary" size="sm" className="mt-auto" disabled={obligations.length === 0}>
                    Settle Now
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    {view === 'list' && (
                        <>
                            <DialogTitle>Settle Your Debts</DialogTitle>
                            <DialogDescription>Select who you want to settle up with.</DialogDescription>
                        </>
                    )}
                    {view === 'groups' && selectedObligation && (
                        <div className="flex items-center gap-2">
                             <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleBack}>
                                <Icons.ArrowRight className="h-4 w-4 rotate-180"/>
                             </Button>
                             <div>
                                <DialogTitle>Settle with {getFullName(selectedObligation.user.firstName, selectedObligation.user.lastName)}</DialogTitle>
                                <DialogDescription>Choose a group to record this settlement in.</DialogDescription>
                             </div>
                        </div>
                    )}
                </DialogHeader>
                <div className="py-4">
                    {view === 'list' && (
                        <div className="space-y-2">
                            {obligations.map(obligation => (
                                <div key={obligation.user.uid} onClick={() => handleObligationSelect(obligation)} className="flex items-center justify-between p-3 rounded-md hover:bg-muted cursor-pointer">
                                     <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={obligation.user.avatarUrl} alt={getFullName(obligation.user.firstName, obligation.user.lastName)} />
                                            <AvatarFallback>{getInitials(obligation.user.firstName, obligation.user.lastName)}</AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium">{getFullName(obligation.user.firstName, obligation.user.lastName)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-right">
                                            <p className="text-sm text-muted-foreground">You Owe</p>
                                            <p className="font-bold text-destructive">{CURRENCY_SYMBOL}{obligation.amount.toFixed(2)}</p>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-muted-foreground"/>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {view === 'groups' && (
                        <>
                        {groupsLoading ? (
                             <div className="space-y-2">
                                {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                             </div>
                        ): sharedGroupsWithBalance.length > 0 ? (
                            <div className="space-y-2">
                                {sharedGroupsWithBalance.map(({ group, amountOwed }) => (
                                    <GroupToSettleItem key={group.id} group={group} amountOwed={amountOwed} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-muted-foreground p-4">You have no shared groups with this person.</p>
                        )}
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground">{title}</CardTitle>
                <div className={`text-3xl font-bold ${totalColor}`}>
                    {CURRENCY_SYMBOL}{total.toFixed(2)}
                </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-2 pt-0">
                <p className="text-xs text-muted-foreground">From {obligations.length} people</p>
                {obligations.length > 0 ? (
                    <ScrollArea className="flex-1">
                        <div className="space-y-2 pr-4">
                            {obligations.slice(0,2).map(item => (
                                <div key={item.user.uid} className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 truncate">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={item.user.avatarUrl} />
                                            <AvatarFallback>{getInitials(item.user.firstName, item.user.lastName)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium truncate">{getFullName(item.user.firstName, item.user.lastName)}</span>
                                    </div>
                                    <div className="text-sm font-semibold">{CURRENCY_SYMBOL}{item.amount.toFixed(2)}</div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">All settled up!</p>
                    </div>
                )}
                 {type === 'owed' 
                    ? <Button variant="secondary" size="sm" className="mt-auto" disabled={obligations.length === 0}>Remind All</Button>
                    : SettleNowButton
                }
            </CardContent>
        </Card>
    );
}
