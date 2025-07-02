

'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSiteSettings } from '@/contexts/site-settings-context';
import { format } from 'date-fns';

function PolicySection({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
            <div className="space-y-4 text-muted-foreground prose prose-invert max-w-none">
                {children}
            </div>
        </div>
    );
}

function TermsSkeleton() {
    return (
        <Card className="p-6 sm:p-8 space-y-8">
            <div className="text-center mb-4">
                <Skeleton className="h-10 w-3/4 mx-auto mb-3" />
                <Skeleton className="h-5 w-1/2 mx-auto" />
            </div>
            <div className="space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-16 w-full" />
            </div>
            <div className="space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-20 w-full" />
            </div>
             <div className="space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-24 w-full" />
            </div>
        </Card>
    );
}

export default function TermsAndConditionsPage() {
    const { settings, loading } = useSiteSettings();

    if (loading || !settings.termsAndConditions) {
        return <TermsSkeleton />;
    }

    const { termsAndConditions: terms, appName } = settings;

  return (
    <Card className="p-6 sm:p-8">
      <CardHeader className="text-center p-0 mb-8">
        <CardTitle className="text-4xl font-bold font-headline">{terms.title}</CardTitle>
        <CardDescription>Last Updated: {format(new Date(), "PPP")}</CardDescription>
      </CardHeader>
      <CardContent className="p-0 space-y-8">
        {terms.sections.map((section, index) => (
            <PolicySection key={section.id || index} title={section.title}>
                <div className="whitespace-pre-wrap">{section.content.replace(/{appName}/g, appName)}</div>
            </PolicySection>
        ))}
      </CardContent>
    </Card>
  );
}
