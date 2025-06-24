import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import Image from 'next/image';
import { DynamicYear } from '@/components/layout/dynamic-year';
import { Card } from '@/components/ui/card';

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="text-center max-w-3xl mx-auto z-10">
        <div className="flex justify-center mb-8 animate-in fade-in slide-in-from-top-12 duration-1000">
          <Icons.AppLogo className="h-20 w-20 text-primary" />
        </div>
        <h1 className="text-5xl md:text-7xl font-headline font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary mb-6 leading-tight animate-in fade-in slide-in-from-top-10 duration-1000 delay-200">
          Welcome to SettleEase
        </h1>
        <p className="text-xl text-muted-foreground mb-10 animate-in fade-in slide-in-from-top-8 duration-1000 delay-400">
          The simplest way to manage shared expenses with friends, family, and colleagues. Track, split, and settle your group costs effortlessly.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12 animate-in fade-in zoom-in-95 duration-500 delay-700">
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-105">
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

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full z-10 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
        <FeatureCard
          icon={<Icons.Users className="h-10 w-10 text-accent" />}
          title="Group Management"
          description="Easily create groups and invite members. Keep all shared expenses organized in one place."
        />
        <FeatureCard
          icon={<Icons.Expense className="h-10 w-10 text-accent" />}
          title="Expense Tracking"
          description="Log expenses quickly with various split options. Supports multiple currencies for all transactions."
        />
        <FeatureCard
          icon={<Icons.Settle className="h-10 w-10 text-accent" />}
          title="Easy Settlements"
          description="Automated balance calculations show who owes whom. Record payments and track settlements."
        />
      </div>
      
      <div className="mt-16 w-full max-w-5xl z-10 animate-in fade-in zoom-in-95 duration-1000 delay-700">
        <Image 
          src="https://placehold.co/1200x675.png" 
          alt="SettleEase Dashboard Mockup" 
          width={1200} 
          height={675} 
          className="rounded-xl shadow-2xl shadow-primary/10 border-2 border-primary/20"
          data-ai-hint="dashboard finance dark"
        />
      </div>

      <footer className="mt-20 text-center text-muted-foreground z-10">
        <p>&copy; <DynamicYear /> SettleEase. Simplify your shared expenses.</p>
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
    <Card className="p-6 rounded-xl shadow-lg hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-2 transition-all duration-300 bg-card/50 backdrop-blur-sm border-border/20">
      <div className="flex justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-headline font-semibold text-foreground mb-2 text-center">{title}</h3>
      <p className="text-muted-foreground text-sm text-center">{description}</p>
    </Card>
  );
}
