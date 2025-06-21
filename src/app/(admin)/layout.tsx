
"use client";

import { AdminShell } from "@/components/layout/admin-shell";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!currentUser || currentUser.role !== 'admin')) {
      // Redirect non-admins or non-logged-in users to the user dashboard
      router.replace('/dashboard');
    }
  }, [currentUser, loading, router]);

  if (loading) {
    // Show a loading state while checking auth
    return (
       <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <Icons.AppLogo className="h-20 w-20 text-primary animate-pulse mb-8" />
        <h2 className="text-2xl font-semibold text-foreground mb-4">Loading Admin Area...</h2>
        <div className="w-full max-w-md space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-20 w-full" />
        </div>
       </div>
    );
  }

  if (!currentUser || currentUser.role !== 'admin') {
    // This state is very brief before the redirect, but it's a good practice
    // to have a fallback UI instead of rendering children that might flash.
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-6">
        <Card className="w-full max-w-md text-center shadow-xl">
          <CardHeader>
             <div className="flex justify-center mb-4">
                <Icons.ShieldCheck className="h-16 w-16 text-destructive" />
             </div>
             <CardTitle className="text-2xl font-headline">Access Denied</CardTitle>
             <CardDescription>
                You do not have permission to view this page. Redirecting...
             </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard">Return to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If the user is an admin, render the AdminShell with the children
  return <AdminShell>{children}</AdminShell>;
}
