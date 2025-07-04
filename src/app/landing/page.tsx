import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { DynamicYear } from '@/components/layout/dynamic-year';
import { getSiteSettings } from '@/lib/mock-data';
import { CheckCircle2 } from 'lucide-react';

const features = [
    {
        icon: <Icons.Users className="h-8 w-8 text-primary" />,
        title: "Group Management",
        description: "Create shared expense groups, invite members via email, and manage group settings.",
    },
    {
        icon: <Icons.Expense className="h-8 w-8 text-primary" />,
        title: "Complex Expense Tracking",
        description: "Add detailed expenses with complex splits (equal, unequal, by shares, by percentage).",
    },
    {
        icon: <Icons.Wallet className="h-8 w-8 text-primary" />,
        title: "Real-time Balances",
        description: "Instantly see who owes whom within each group with a clear and concise balance sheet.",
    },
    {
        icon: <Icons.Settle className="h-8 w-8 text-primary" />,
        title: "Simplified Settlements",
        description: "A smart algorithm calculates the most efficient way to settle all debts in the group.",
    },
];

export default async function LandingPage() {
  const settings = await getSiteSettings();
  
  const randomImage = settings.landingImages?.length > 0
    ? settings.landingImages[Math.floor(Math.random() * settings.landingImages.length)]
    : 'https://placehold.co/1920x1080.png';

  return (
    <div className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
            <div className="container flex h-16 items-center justify-between">
                <Link href="/landing" className="flex items-center space-x-2">
                    <Icons.Logo className="h-8 w-8 text-primary" />
                    <span className="inline-block font-bold text-xl">{settings.appName}</span>
                </Link>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" asChild>
                        <Link href="/auth/login">Log In</Link>
                    </Button>
                    <Button asChild>
                        <Link href="/auth/signup">Sign Up</Link>
                    </Button>
                </div>
            </div>
        </header>

        <main className="flex-1">
            {/* Hero Section */}
            <section className="relative flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-6 overflow-hidden">
                <Image
                    src={randomImage}
                    alt="Background image"
                    fill
                    className="object-cover -z-10"
                    quality={100}
                    priority
                    data-ai-hint="office workspace"
                />
                <div className="absolute inset-0 bg-black/60 -z-10" />

                <div className="text-center max-w-4xl mx-auto z-10">
                    <h1 className="text-5xl md:text-7xl font-headline font-extrabold text-white mb-6 leading-tight animate-in fade-in slide-in-from-top-10 duration-1000 delay-200 drop-shadow-lg">
                    {settings.landingPage?.headline || settings.appName}
                    </h1>
                    <p className="text-xl text-slate-200 mb-10 animate-in fade-in slide-in-from-top-8 duration-1000 delay-400 drop-shadow-md">
                    {settings.landingPage?.subheadline || 'A default subheadline for your amazing application.'}
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12 animate-in fade-in zoom-in-95 duration-500 delay-700">
                        <Button asChild size="lg">
                            <Link href="/auth/signup">
                            <Icons.Signup className="mr-2" />
                            {settings.landingPage?.ctaButtonText || 'Get Started'}
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="container py-16 md:py-24">
                <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
                    <h2 className="text-3xl font-bold font-headline md:text-4xl">Everything You Need to Settle Up</h2>
                    <p className="mt-4 text-lg text-muted-foreground">From weekend trips to monthly bills, {settings.appName} handles the math so you don't have to.</p>
                </div>
                <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2">
                    {features.map((feature) => (
                        <div key={feature.title} className="flex items-start gap-4">
                            <div>{feature.icon}</div>
                            <div>
                                <h3 className="font-semibold">{feature.title}</h3>
                                <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* How it Works */}
            <section className="bg-muted/30 py-16 md:py-24">
                <div className="container grid gap-12 md:grid-cols-2 md:items-center">
                     <div>
                        <h2 className="text-3xl font-bold font-headline md:text-4xl">Split Expenses in a Snap</h2>
                        <p className="mt-4 text-lg text-muted-foreground">Get started in three simple steps. Spend more time making memories, less time on math.</p>
                         <ul className="mt-8 space-y-4">
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                                <div>
                                    <h4 className="font-semibold">1. Create a Group</h4>
                                    <p className="text-sm text-muted-foreground">Start a new group for any occasion and invite your friends, family, or roommates.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                                <div>
                                    <h4 className="font-semibold">2. Add Expenses</h4>
                                    <p className="text-sm text-muted-foreground">Log expenses as they happen. Our flexible splitting options handle any scenario.</p>
                                </div>
                            </li>
                             <li className="flex items-start gap-3">
                                <CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                                <div>
                                    <h4 className="font-semibold">3. Settle Up</h4>
                                    <p className="text-sm text-muted-foreground">View balances and settle debts with the minimal number of payments. Everyone is happy!</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                    <div className="rounded-lg border bg-card p-2 shadow-lg">
                       <Image
                            src="https://placehold.co/800x600.png"
                            alt="App screenshot"
                            width={800}
                            height={600}
                            className="rounded-md"
                            data-ai-hint="mobile app finances"
                        />
                    </div>
                </div>
            </section>
            
             {/* Final CTA */}
            <section className="container py-16 md:py-24 text-center">
                <h2 className="text-3xl font-bold font-headline md:text-4xl">Ready to Simplify Your Shared Expenses?</h2>
                <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">Create an account for free and say goodbye to awkward money conversations.</p>
                <div className="mt-8">
                     <Button asChild size="lg">
                        <Link href="/auth/signup">
                        Sign Up Now - It's Free
                        </Link>
                    </Button>
                </div>
            </section>
        </main>

        <footer className="border-t">
            <div className="container flex flex-col items-center justify-between gap-4 py-8 md:h-24 md:flex-row">
                <p className="text-sm text-muted-foreground">
                    &copy; <DynamicYear /> {settings.appName}. All rights reserved.
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <Link href="/about" className="hover:text-primary transition-colors">About</Link>
                    <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
                    <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
                </div>
            </div>
        </footer>
    </div>
  );
}
