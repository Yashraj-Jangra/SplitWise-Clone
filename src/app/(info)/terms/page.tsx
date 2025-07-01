
import type { Metadata } from 'next';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { getSiteSettings } from '@/lib/mock-data';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: `Terms of Service - ${settings.appName}`,
  };
}

function PolicySection({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
            <div className="space-y-4 text-muted-foreground">
                {children}
            </div>
        </div>
    );
}

export default function TermsAndConditionsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Card className="p-6 sm:p-8">
        <CardHeader className="text-center p-0 mb-8">
          <CardTitle className="text-4xl font-bold font-headline">Terms of Service</CardTitle>
          <CardDescription>Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
        </CardHeader>
        <CardContent className="p-0 space-y-8">
          <PolicySection title="1. Acceptance of Terms">
              <p>By accessing or using the SettleEase application ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of the terms, then you may not access the Service.</p>
          </PolicySection>

          <PolicySection title="2. User Accounts">
              <p>When you create an account with us, you must provide us with information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.</p>
              <p>You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password, whether your password is with our Service or a third-party service.</p>
          </PolicySection>
          
          <PolicySection title="3. User Conduct">
               <p>You agree not to use the Service to:</p>
               <ul className="list-disc list-inside space-y-2">
                   <li>Violate any local, state, national, or international law.</li>
                   <li>Transmit any material that is abusive, harassing, tortious, defamatory, vulgar, pornographic, obscene, libelous, invasive of another's privacy, hateful, or racially, ethnically, or otherwise objectionable.</li>
                   <li>Impersonate any person or entity, or falsely state or otherwise misrepresent your affiliation with a person or entity.</li>
               </ul>
          </PolicySection>

          <PolicySection title="4. Limitation of Liability">
              <p>In no event shall SettleEase, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.</p>
          </PolicySection>

          <PolicySection title="5. Governing Law">
              <p>These Terms shall be governed and construed in accordance with the laws of the jurisdiction in which the company is based, without regard to its conflict of law provisions.</p>
          </PolicySection>
        </CardContent>
      </Card>
    </div>
  );
}
