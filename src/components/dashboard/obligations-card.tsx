
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
import { AnimatedNumber } from '@/components/ui/animated-number';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { notifyPaymentReminder } from '@/lib/notification-service';
import { Bell } from 'lucide-react';


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
    
    // Remind Dialog States
    const [remindDialogOpen, setRemindDialogOpen] = useState(false);
    const [remindAllDialogOpen, setRemindAllDialogOpen] = useState(false);
    const [remindTarget, setRemindTarget] = useState<Obligation | null>(null);
    const [sendEmail, setSendEmail] = useState(true);
    const [sendingReminder, setSendingReminder] = useState(false);
    const { toast } = useToast();

    const handleSendReminder = async (obligation: Obligation) => {
        if (!userProfile) return;
        setSendingReminder(true);
        try {
            // Find common groups to identify the groupName context
            const allUserGroups = await getGroupsByUserId(userProfile.uid);
            const groupsInCommon = allUserGroups.filter(g => g.members.some(m => m.uid === obligation.user.uid));
            
            let mainGroupName = "Shared Groups";
            let mainGroupId: string | undefined = undefined;
            
            const groupsWithBalances = await Promise.all(
                groupsInCommon.map(async (group) => {
                    const groupBalances = await getGroupBalances(group.id);
                    const simplifiedDebtsForGroup = simplifyDebts(groupBalances);
                    const debt = simplifiedDebtsForGroup.find(
                        s => s.from.uid === obligation.user.uid && s.to.uid === userProfile.uid
                    );
                    return { group, amountOwed: debt?.amount || 0 };
                })
            );
            
            const activeDebts = groupsWithBalances.filter(g => g.amountOwed > 0.01);
            if (activeDebts.length === 1) {
                mainGroupName = activeDebts[0].group.name;
                mainGroupId = activeDebts[0].group.id;
            }

            await notifyPaymentReminder(
                obligation.user.uid,
                userProfile.uid,
                mainGroupId,
                mainGroupName,
                obligation.amount,
                sendEmail
            );

            toast({
                title: "Reminder Sent",
                description: `Sent a settle up reminder to ${getFullName(obligation.user.firstName, obligation.user.lastName)}.`
            });
            setRemindDialogOpen(false);
        } catch (error) {
            console.error("Failed to send reminder:", error);
            toast({
                variant: "destructive",
                title: "Failed to Send Reminder",
                description: error instanceof Error ? error.message : "An unknown error occurred."
            });
        } finally {
            setSendingReminder(false);
        }
    };

    const handleSendReminderAll = async () => {
        if (!userProfile || obligations.length === 0) return;
        setSendingReminder(true);
        let successCount = 0;
        try {
            const allUserGroups = await getGroupsByUserId(userProfile.uid);
            
            for (const obligation of obligations) {
                try {
                    const groupsInCommon = allUserGroups.filter(g => g.members.some(m => m.uid === obligation.user.uid));
                    let mainGroupName = "Shared Groups";
                    let mainGroupId: string | undefined = undefined;
                    
                    const groupsWithBalances = await Promise.all(
                        groupsInCommon.map(async (group) => {
                            const groupBalances = await getGroupBalances(group.id);
                            const simplifiedDebtsForGroup = simplifyDebts(groupBalances);
                            const debt = simplifiedDebtsForGroup.find(
                                s => s.from.uid === obligation.user.uid && s.to.uid === userProfile.uid
                            );
                            return { group, amountOwed: debt?.amount || 0 };
                        })
                    );
                    
                    const activeDebts = groupsWithBalances.filter(g => g.amountOwed > 0.01);
                    if (activeDebts.length === 1) {
                        mainGroupName = activeDebts[0].group.name;
                        mainGroupId = activeDebts[0].group.id;
                    }

                    await notifyPaymentReminder(
                        obligation.user.uid,
                        userProfile.uid,
                        mainGroupId,
                        mainGroupName,
                        obligation.amount,
                        sendEmail
                    );
                    successCount++;
                } catch (e) {
                    console.error(`Failed to remind user ${obligation.user.uid}:`, e);
                }
            }

            toast({
                title: "Reminders Sent",
                description: `Sent settle up reminders to ${successCount} people.`
            });
            setRemindAllDialogOpen(false);
        } catch (error) {
            console.error("Failed to send reminders:", error);
            toast({
                variant: "destructive",
                title: "Failed to Send Reminders",
                description: error instanceof Error ? error.message : "An unknown error occurred."
            });
        } finally {
            setSendingReminder(false);
        }
    };
    
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
                <AnimatedNumber 
                    value={type === 'owed' ? total : -total} 
                    className="text-3xl font-bold tracking-tight"
                    isCurrency={true}
                    prefix={type === 'owes' && total > 0 ? '' : ''} // AnimatedNumber handles signs
                />
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-2 pt-0">
                <p className="text-xs text-muted-foreground">From {obligations.length} {obligations.length === 1 ? 'person' : 'people'}</p>
                {obligations.length > 0 ? (
                    <ScrollArea className="flex-1">
                        <div className="space-y-3 pr-4 mt-2">
                            {obligations.slice(0, 3).map(item => (
                                <div key={item.user.uid} className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 truncate">
                                            <Avatar className="h-7 w-7">
                                                <AvatarImage src={item.user.avatarUrl} />
                                                <AvatarFallback>{getInitials(item.user.firstName, item.user.lastName)}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium truncate">{getFullName(item.user.firstName, item.user.lastName)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-sm font-semibold">{CURRENCY_SYMBOL}{item.amount.toFixed(2)}</div>
                                            {type === 'owed' && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full"
                                                    onClick={() => {
                                                        setRemindTarget(item);
                                                        setSendEmail(true);
                                                        setRemindDialogOpen(true);
                                                    }}
                                                    title={`Remind ${getFullName(item.user.firstName, item.user.lastName)}`}
                                                >
                                                    <Bell className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <Progress value={(item.amount / total) * 100} className="h-1.5" />
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2 animate-in fade-in zoom-in duration-500">
                        <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mb-1">
                            <Icons.ShieldCheck className="h-6 w-6 text-green-500" />
                        </div>
                        <p className="text-sm font-semibold text-foreground">All settled up!</p>
                        <p className="text-xs text-muted-foreground">No outstanding balances here.</p>
                    </div>
                )}
                 {type === 'owed' 
                    ? (
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            className="mt-auto" 
                            disabled={obligations.length === 0}
                            onClick={() => {
                                setSendEmail(true);
                                setRemindAllDialogOpen(true);
                            }}
                        >
                            Remind All
                        </Button>
                      )
                    : SettleNowButton
                }
            </CardContent>

            {/* Individual Reminder Dialog */}
            <Dialog open={remindDialogOpen} onOpenChange={setRemindDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Send Settle Up Reminder</DialogTitle>
                        <DialogDescription>
                            Send an in-app and push notification reminder to {remindTarget && getFullName(remindTarget.user.firstName, remindTarget.user.lastName)}.
                        </DialogDescription>
                    </DialogHeader>
                    {remindTarget && (
                        <div className="space-y-4 py-4">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                                <span className="text-sm font-medium">Outstanding Balance</span>
                                <span className="font-bold text-lg text-green-500">{CURRENCY_SYMBOL}{remindTarget.amount.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="send-email-checkbox" 
                                    checked={sendEmail} 
                                    onCheckedChange={(checked) => setSendEmail(!!checked)} 
                                />
                                <label 
                                    htmlFor="send-email-checkbox" 
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none"
                                >
                                    Also send an email notification reminder
                                </label>
                            </div>
                        </div>
                    )}
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setRemindDialogOpen(false)} disabled={sendingReminder}>
                            Cancel
                        </Button>
                        <Button onClick={() => remindTarget && handleSendReminder(remindTarget)} disabled={sendingReminder}>
                            {sendingReminder ? <Icons.AppLogo className="animate-spin mr-2 h-4 w-4" /> : null}
                            Send Reminder
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Remind All Dialog */}
            <Dialog open={remindAllDialogOpen} onOpenChange={setRemindAllDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Remind All Debtors</DialogTitle>
                        <DialogDescription>
                            Send settle up reminders to all {obligations.length} people who owe you.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                            <span className="text-sm font-medium">Total Amount Owed</span>
                            <span className="font-bold text-lg text-green-500">{CURRENCY_SYMBOL}{total.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox 
                                id="send-email-all-checkbox" 
                                checked={sendEmail} 
                                onCheckedChange={(checked) => setSendEmail(!!checked)} 
                            />
                            <label 
                                htmlFor="send-email-all-checkbox" 
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none"
                            >
                                Also send email notification reminders to everyone
                            </label>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setRemindAllDialogOpen(false)} disabled={sendingReminder}>
                            Cancel
                        </Button>
                        <Button onClick={handleSendReminderAll} disabled={sendingReminder}>
                            {sendingReminder ? <Icons.AppLogo className="animate-spin mr-2 h-4 w-4" /> : null}
                            Send Reminders
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

