
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AnalysisPage() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <Card className="text-center max-w-lg">
            <CardHeader>
                <div className="flex justify-center mb-4">
                    <Icons.Dashboard className="h-16 w-16 text-primary" />
                </div>
                <CardTitle className="text-2xl font-headline">Analysis has Moved!</CardTitle>
                <CardDescription>
                All charting and analysis features have been integrated directly into your main dashboard for a more streamlined experience.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild>
                    <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
            </CardContent>
        </Card>
    </div>
  );
}
