
'use client';

import { useState, useEffect } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from '@/components/icons';
import { getSettlementsByUserId } from '@/lib/mock-data';
import { SettlementListItem } from '@/components/settlements/settlement-list-item';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import type { Settlement } from '@/types';


// export const metadata: Metadata = {
//   title: 'All Settlements - SettleEase',
//   description: 'View all your settlements across all groups.',
// };

export default function AllSettlementsPage() {
  const { userProfile } = useAuth();
  const [userSettlements, setUserSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSettlements() {
      if (!userProfile?.uid) return;
      setLoading(true);
      const settlements = await getSettlementsByUserId(userProfile.uid);
      setUserSettlements(settlements.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setLoading(false);
    }
    loadSettlements();
  }, [userProfile]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline text-foreground">My Settlements</h1>
          <p className="text-muted-foreground">A consolidated view of all your payment settlements.</p>
        </div>
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
          {loading ? (
             <div className="p-4 space-y-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : userSettlements.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-20rem)]"> {/* Adjust height as needed */}
              <div className="divide-y">
                {userSettlements.map((settlement) => (
                  <SettlementListItem key={settlement.id} settlement={settlement} currentUserId={userProfile!.uid} />
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
