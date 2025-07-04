
import Link from 'next/link';
import { getSiteSettings } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';

export default async function NotFound() {
  const settings = await getSiteSettings();
  const pageContent = settings.notFoundPage!;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <Card className="w-full max-w-lg text-center shadow-2xl glass-pane">
        <CardHeader>
           <div className="flex justify-center mb-4">
            <Icons.SearchX className="h-20 w-20 text-destructive" />
          </div>
          <CardTitle className="text-4xl font-bold font-headline">
            {pageContent.title}
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground mt-2">
            {pageContent.subtitle}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="lg">
            <Link href="/">
              <Icons.Home className="mr-2 h-5 w-5" />
              {pageContent.buttonText}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
