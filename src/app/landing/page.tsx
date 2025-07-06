
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Icons, type IconName } from '@/components/icons';
import { DynamicYear } from '@/components/layout/dynamic-year';
import { getSiteSettings } from '@/lib/mock-data';
import { CheckCircle2 } from 'lucide-react';

export default async function LandingPage() {
  const settings = await getSiteSettings();
  const lp = settings.landingPage!;
  
  const randomImage = settings.landingImages?.length > 0
    ? settings.landingImages[Math.floor(Math.random() * settings.landingImages.length)]
    : 'https://placehold.co/1920x1080.png';

  const replaceAppName = (text: string) => text.replace(/{appName}/g, settings.appName);

  return (
    <div className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <Link href="/landing" className="flex items-center space-x-2">
                    <Icons.Logo className="h-8 w-8 text-primary" />
                    <span className="inline-block font-bold text-xl">{settings.appName}</span>
                </Link>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" asChild className="text-white hover:bg-white/10 hover:text-white">
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
            <section className="relative flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] py-12 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <Image
                        src={randomImage}
                        alt="Background image"
                        fill
                        className="object-cover"
                        quality={100}
                        priority
                        data-ai-hint="office workspace"
                    />
                </div>
                <div className="absolute inset-0 bg-black/60 z-10" />

                <div className="container mx-auto relative z-20 text-center px-4">
                    <h1 className="text-5xl md:text-7xl font-headline font-extrabold text-white mb-6 leading-tight animate-in fade-in slide-in-from-top-10 duration-1000 delay-200 drop-shadow-lg">
                        {replaceAppName(lp.headline)}
                    </h1>
                    <p className="text-xl text-slate-200 mb-10 animate-in fade-in slide-in-from-top-8 duration-1000 delay-400 drop-shadow-md max-w-4xl mx-auto">
                        {replaceAppName(lp.subheadline)}
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12 animate-in fade-in zoom-in-95 duration-500 delay-700">
                        <Button asChild size="lg">
                            <Link href="/auth/signup">
                            <Icons.Signup className="mr-2" />
                                {lp.ctaButtonText}
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="container mx-auto py-16 px-6 md:py-24">
                <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
                    <h2 className="text-3xl font-bold font-headline md:text-4xl">{replaceAppName(lp.featuresTitle)}</h2>
                    <p className="mt-4 text-lg text-muted-foreground">{replaceAppName(lp.featuresSubtitle)}</p>
                </div>
                <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2">
                    {lp.features.map((feature) => {
                        const Icon = Icons[feature.icon as IconName] || Icons.Wallet;
                        return (
                            <div key={feature.title} className="flex items-start gap-4">
                                <div className="flex-shrink-0 pt-1"><Icon className="h-8 w-8 text-primary" /></div>
                                <div>
                                    <h3 className="font-semibold">{feature.title}</h3>
                                    <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </section>

            {/* How it Works */}
            <section className="bg-muted/30 py-16 md:py-24 px-6">
                <div className="container mx-auto grid gap-12 md:grid-cols-2 md:items-center">
                     <div>
                        <h2 className="text-3xl font-bold font-headline md:text-4xl">{replaceAppName(lp.howItWorksTitle)}</h2>
                        <p className="mt-4 text-lg text-muted-foreground">{replaceAppName(lp.howItWorksSubtitle)}</p>
                         <ul className="mt-8 space-y-4">
                            {lp.howItWorksSteps.map((step, index) => (
                                <li key={index} className="flex items-start gap-3">
                                    <CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                                    <div>
                                        <h4 className="font-semibold">{step.title}</h4>
                                        <p className="text-sm text-muted-foreground">{step.description}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="rounded-lg border bg-card p-2 shadow-lg">
                       <Image
                            src={lp.howItWorksImageUrl}
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
            <section className="container mx-auto py-16 px-6 md:py-24 text-center">
                <h2 className="text-3xl font-bold font-headline md:text-4xl">{replaceAppName(lp.finalCtaTitle)}</h2>
                <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">{replaceAppName(lp.finalCtaSubtitle)}</p>
                <div className="mt-8">
                     <Button asChild size="lg">
                        <Link href="/auth/signup">
                            {lp.finalCtaButtonText}
                        </Link>
                    </Button>
                </div>
            </section>
        </main>

        <footer className="border-t">
            <div className="container mx-auto flex flex-col items-center justify-between gap-4 py-8 px-4 md:h-24 md:flex-row">
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
