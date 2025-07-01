
import type { Metadata } from 'next';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { getSiteSettings } from '@/lib/mock-data';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: `Privacy Policy - ${settings.appName}`,
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

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Card className="p-6 sm:p-8">
        <CardHeader className="text-center p-0 mb-8">
          <CardTitle className="text-4xl font-bold font-headline">Privacy Policy</CardTitle>
          <CardDescription>Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
        </CardHeader>
        <CardContent className="p-0 space-y-8">
          <PolicySection title="1. Introduction">
              <p>Welcome to SettleEase ("we", "our", "us"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the application.</p>
          </PolicySection>

          <PolicySection title="2. Information We Collect">
              <p>We may collect information about you in a variety of ways. The information we may collect on the Site includes:</p>
              <ul className="list-disc list-inside space-y-2">
                  <li><strong>Personal Data:</strong> Personally identifiable information, such as your name, shipping address, email address, and telephone number, and demographic information, such as your age, gender, hometown, and interests, that you voluntarily give to us when you register with the Application.</li>
                  <li><strong>Financial Data:</strong> Financial information, such as data related to your payment method (e.g. valid credit card number, card brand, expiration date) that we may collect when you purchase, order, return, exchange, or request information about our services from the Application. We store only very limited, if any, financial information that we collect.</li>
              </ul>
          </PolicySection>
          
          <PolicySection title="3. Use of Your Information">
               <p>Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Application to:</p>
               <ul className="list-disc list-inside space-y-2">
                   <li>Create and manage your account.</li>
                   <li>Email you regarding your account or order.</li>
                   <li>Enable user-to-user communications.</li>
                   <li>Manage purchases, orders, payments, and other transactions related to the Application.</li>
               </ul>
          </PolicySection>

          <PolicySection title="4. Security of Your Information">
              <p>We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.</p>
          </PolicySection>

          <PolicySection title="5. Contact Us">
              <p>If you have questions or comments about this Privacy Policy, please contact us at: [email protected]</p>
          </PolicySection>
        </CardContent>
      </Card>
    </div>
  );
}
