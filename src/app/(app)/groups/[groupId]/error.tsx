"use client"; 

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import Link from "next/link";

export default function GroupDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Group Detail Error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] p-6">
      <Card className="w-full max-w-lg text-center shadow-xl">
        <CardHeader>
           <div className="flex justify-center mb-4">
            <Icons.Users className="h-16 w-16 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-headline">Error Loading Group</CardTitle>
          <CardDescription>
            We couldn't load the details for this group. It might not exist or there was a temporary issue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Details: {error.message || "An unexpected error occurred."}
          </p>
          <div className="flex justify-center space-x-3">
            <Button onClick={() => reset()} variant="outline">
                Try Again
            </Button>
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/groups">
                    Back to Groups
                </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}