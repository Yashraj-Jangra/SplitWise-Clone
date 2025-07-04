
import Link from 'next/link';
import Image from 'next/image';
import { getSiteSettings } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Lightbulb, Mail } from 'lucide-react';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const pageContent = settings.notFoundPage!;
  return {
    title: pageContent.title,
  };
}

export default async function NotFound() {
  const settings = await getSiteSettings();
  const pageContent = settings.notFoundPage!;

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
        <div className="flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-background">
            <div className="w-full max-w-md space-y-8">
                <div>
                    <span className="text-9xl font-black text-primary/20 leading-none">404</span>
                    <h1 className="mt-2 text-4xl font-bold font-headline tracking-tighter sm:text-5xl">
                        {pageContent.heading}
                    </h1>
                    <p className="mt-4 text-lg text-muted-foreground">
                        {pageContent.mainContent}
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-4">
                        <Lightbulb className="h-5 w-5 flex-shrink-0 text-yellow-400 mt-1" />
                        <div>
                            <h3 className="font-semibold">Helpful Hint</h3>
                            <p className="text-sm text-muted-foreground">{pageContent.helpfulHint}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-4">
                        <Mail className="h-5 w-5 flex-shrink-0 text-blue-400 mt-1" />
                        <div>
                            <h3 className="font-semibold">Support Note</h3>
                            <p className="text-sm text-muted-foreground">{pageContent.supportNote}</p>
                        </div>
                    </div>
                </div>

                <Button asChild size="lg" className="w-full">
                    <Link href="/">
                    <Icons.Home className="mr-2 h-5 w-5" />
                    {pageContent.buttonText}
                    </Link>
                </Button>
            </div>
        </div>

        <div className="hidden lg:block relative">
            <Image
            src={pageContent.imageUrl}
            alt="An image depicting a lost or abstract concept for a 404 page"
            fill
            className="object-cover"
            data-ai-hint="space galaxy"
            />
            <div className="absolute inset-0 bg-black/20" />
        </div>
    </div>
  );
}
