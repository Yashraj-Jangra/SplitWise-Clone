

'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSiteSettings } from '@/contexts/site-settings-context';

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

function PrivacyPolicySkeleton() {
    return (
        <Card className="p-6 sm:p-8 space-y-8">
            <div className="text-center mb-4">
                <Skeleton className="h-10 w-3/4 mx-auto mb-3" />
                <Skeleton className="h-5 w-1/2 mx-auto" />
            </div>
            <div className="space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-20 w-full" />
            </div>
            <div className="space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-20 w-full" />
            </div>
             <div className="space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-20 w-full" />
            </div>
        </Card>
    )
}

export default function PrivacyPolicyPage() {
    const { settings, loading } = useSiteSettings();

    if (loading || !settings.privacyPolicy) {
        return <PrivacyPolicySkeleton />;
    }

    const { privacyPolicy: policy } = settings;

  return (
      <Card className="p-6 sm:p-8">
        <CardHeader className="text-center p-0 mb-8">
          <CardTitle className="text-4xl font-bold font-headline">{policy.title}</CardTitle>
          <CardDescription>Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
        </CardHeader>
        <CardContent className="p-0 space-y-8">
          <PolicySection title="1. Introduction">
              <p>{policy.introduction}</p>
          </PolicySection>

          <PolicySection title="2. Information We Collect">
              <p>{policy.informationWeCollect}</p>
          </PolicySection>
          
          <PolicySection title="3. Use of Your Information">
               <p>{policy.howWeUseYourInformation}</p>
          </PolicySection>

          <PolicySection title="4. Security of Your Information">
              <p>{policy.securityOfYourInformation}</p>
          </PolicySection>

          <PolicySection title="5. Contact Us">
              <p>{policy.contactUs}</p>
          </PolicySection>
        </CardContent>
      </Card>
  );
}
