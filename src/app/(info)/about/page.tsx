
import type { Metadata } from 'next';
import { Card } from '@/components/ui/card';
import { getSiteSettings } from '@/lib/mock-data';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: `About Us - ${settings.appName}`,
  };
}

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold font-headline mb-2 text-foreground">About SettleEase</h1>
        <p className="text-xl text-muted-foreground">
          Simplifying shared expenses for everyone, everywhere.
        </p>
      </div>

      <Card className="p-6 sm:p-8">
        <div className="space-y-6 text-base text-muted-foreground">
          <p>
            Welcome to SettleEase, the ultimate solution for managing group expenses without the hassle. Born from the common frustration of tracking who paid for what during trips, shared housing, and group events, SettleEase was designed to be intuitive, powerful, and transparent.
          </p>
          <p>
            Our mission is to eliminate the awkwardness and complexity of splitting bills. We believe that focusing on shared memories should be the priority, not crunching numbers. With our smart settlement algorithm, real-time balance tracking, and flexible expense splitting, you can be sure that everyone is paid back fairly and efficiently.
          </p>
          
          <h2 className="text-2xl font-bold font-headline pt-6 border-t text-foreground">Our Commitment</h2>
          <p>
            We are committed to providing a secure, reliable, and user-friendly platform. Your data privacy is paramount, and we continuously work to enhance our features to meet your evolving needs. Whether you're a student sharing an apartment, a group of friends on vacation, or a family managing household budgets, SettleEase is here to make your life easier.
          </p>
          
          <p>
            Thank you for choosing SettleEase. Let's make sharing simple.
          </p>
        </div>
      </Card>
    </div>
  );
}
