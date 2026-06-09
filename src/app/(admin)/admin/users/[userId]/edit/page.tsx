

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { EditUserForm } from '@/components/admin/edit-user-form';
import { getUserProfile } from '@/lib/mock-data';
import type { UserProfile } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getFullName } from '@/lib/utils';
import { UserGroupsList } from '@/components/shared/user-groups-list';
import { Separator } from '@/components/ui/separator';

export default function EditUserPage() {
  const params = useParams();
  const userId = params.userId as string;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    
    async function fetchUser() {
      try {
        setLoading(true);
        const fetchedUser = await getUserProfile(userId);
        if (fetchedUser) {
          setUser(fetchedUser);
        } else {
          setError("User not found.");
        }
      } catch (err) {
        setError("Failed to fetch user data.");
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [userId]);

  const renderContent = () => {
    if (loading) {
      return (
          <div className="space-y-6">
            <Card>
            <CardHeader>
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-10 w-full" />
                </div>
                <div className="flex justify-end gap-2">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-24" />
                </div>
            </CardContent>
            </Card>
            <Skeleton className="h-48 w-full" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center text-red-500 bg-red-50 p-6 rounded-lg">
          <p className="font-bold">Error</p>
          <p>{error}</p>
           <Button asChild variant="link" className="mt-4">
                <Link href="/admin/users">Return to Users List</Link>
           </Button>
        </div>
      );
    }

    if (user) {
      return (
        <div className="space-y-6">
            <EditUserForm user={user} />
            <Separator />
            <UserGroupsList userId={user.uid} />
        </div>
      );
    }

    return null; // Should be covered by error state
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline text-foreground">Edit User</h1>
        <p className="text-muted-foreground">Modify user details for {user ? getFullName(user.firstName, user.lastName) : '...'}.</p>
      </div>
      {renderContent()}
    </div>
  );
}
