import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import Image from 'next/image';

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="text-center max-w-2xl mx-auto">
        <div className="flex justify-center mb-8">
          <Icons.AppLogo className="h-16 w-16 text-primary" />
        </div>
        <h1 className="text-5xl font-headline font-bold text-foreground mb-6 leading-tight">
          Welcome to <span className="text-primary">SettleEase</span>
        </h1>
        <p className="text-xl text-muted-foreground mb-10">
          The simplest way to manage shared expenses with friends, family, and colleagues. Track, split, and settle your group costs effortlessly.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-transform hover:scale-105">
            <Link href="/auth/login">
              <Icons.Login className="mr-2" /> Login
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-primary text-primary hover:bg-primary/10 shadow-lg transition-transform hover:scale-105">
            <Link href="/auth/signup">
              <Icons.Signup className="mr-2" /> Sign Up
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full">
        <FeatureCard
          icon={<Icons.Users className="h-10 w-10 text-accent" />}
          title="Group Management"
          description="Easily create groups and invite members. Keep all shared expenses organized in one place."
        />
        <FeatureCard
          icon={<Icons.Expense className="h-10 w-10 text-accent" />}
          title="Expense Tracking"
          description="Log expenses quickly with various split options. Supports INR currency for all transactions."
        />
        <FeatureCard
          icon={<Icons.Settle className="h-10 w-10 text-accent" />}
          title="Easy Settlements"
          description="Automated balance calculations show who owes whom. Record payments and track settlements."
        />
      </div>
      
      <div className="mt-16 w-full max-w-4xl">
        <Image 
          src="https://placehold.co/1200x600.png" 
          alt="SettleEase Dashboard Mockup" 
          width={1200} 
          height={600} 
          className="rounded-lg shadow-2xl border-2 border-primary/20"
          data-ai-hint="dashboard finance"
        />
      </div>

      <footer className="mt-20 text-center text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} SettleEase. Simplify your shared expenses.</p>
      </footer>
    </main>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-card p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
      <div className="flex justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-headline font-semibold text-foreground mb-2 text-center">{title}</h3>
      <p className="text-muted-foreground text-sm text-center">{description}</p>
    </div>
  );
}
