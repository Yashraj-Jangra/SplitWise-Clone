
import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from '@/components/icons';
import { mockSettlements, mockCurrentUser } from '@/lib/mock-data';
import { SettlementListItem } from '@/components/settlements/settlement-list-item';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'All Settlements - SettleEase',
  description: 'View all your settlements across all groups.',
};

export default async function AllSettlementsPage() {
  const currentUser = mockCurrentUser;
  // Fetch all settlements where the current user is either the payer or the payee
  const userSettlements = mockSettlements.filter(
    settlement => settlement.paidBy.id === currentUser.id || settlement.paidTo.id === currentUser.id
  ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline text-foreground">My Settlements</h1>
          <p className="text-muted-foreground">A consolidated view of all your payment settlements.</p>
        </div>
        {/* This button might link to a page or open a dialog to select a group first */}
        {/* For now, it's a placeholder or could link to the general groups page */}
        <Button asChild>
            <Link href="/groups"> 
             <Icons.Settle className="mr-2 h-4 w-4" /> Record New Settlement
            </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Settlement History</CardTitle>
          <CardDescription>Showing {userSettlements.length} settlements you are involved in.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {userSettlements.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-20rem)]"> {/* Adjust height as needed */}
              <div className="divide-y">
                {userSettlements.map((settlement) => (
                  <SettlementListItem key={settlement.id} settlement={settlement} currentUserId={currentUser.id} />
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center p-12 text-muted-foreground">
              <Icons.Settle className="h-16 w-16 mx-auto mb-4" />
              <p className="text-lg">No settlements found.</p>
              <p>Settlements appear here when you record payments made or received within your groups.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
