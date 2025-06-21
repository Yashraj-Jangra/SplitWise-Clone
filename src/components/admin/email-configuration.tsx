
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { verifyGoogleCredentialsAction } from '@/lib/actions/email';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription as FormDesc } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const credentialsSchema = z.object({
  senderEmail: z.string().email('Please enter a valid email address.'),
  clientId: z.string().min(1, 'Client ID is required.'),
  clientSecret: z.string().min(1, 'Client Secret is required.'),
  refreshToken: z.string().min(1, 'Refresh Token is required.'),
});

type CredentialsFormValues = z.infer<typeof credentialsSchema>;

interface EmailConfigurationProps {
  isConfigured: boolean;
  configuredSender: string | null;
}

export function EmailConfiguration({ isConfigured, configuredSender }: EmailConfigurationProps) {
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  
  const form = useForm<CredentialsFormValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      senderEmail: '',
      clientId: '',
      clientSecret: '',
      refreshToken: '',
    },
  });

  async function onSubmit(values: CredentialsFormValues) {
    setIsVerifying(true);
    // The senderEmail is not part of the Google verification, but it is part of the full config.
    const verificationData = {
      clientId: values.clientId,
      clientSecret: values.clientSecret,
      refreshToken: values.refreshToken,
    };

    const result = await verifyGoogleCredentialsAction(verificationData);

    if (result.success) {
      toast({
        title: "Verification Successful!",
        description: `Credentials are valid. To enable sending from ${values.senderEmail}, save all four values to your .env file and restart the server.`,
        duration: 8000,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: result.error || "An unknown error occurred.",
        duration: 8000,
      });
    }
    setIsVerifying(false);
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Configuration</CardTitle>
        <CardDescription>
          Status of the connection to the Gmail API for sending emails.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isConfigured ? (
          <Alert>
            <Icons.ShieldCheck className="h-4 w-4" />
            <AlertTitle>System Ready</AlertTitle>
            <AlertDescription>
              Email service is configured and ready to send emails from{' '}
              <code className="font-mono bg-muted px-1 py-0.5 rounded">
                {configuredSender}
              </code>. To change settings, update your <code className="font-mono bg-muted px-1 py-0.5 rounded">.env</code> file.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <Icons.ShieldCheck className="h-4 w-4" />
            <AlertTitle>Configuration Required</AlertTitle>
            <AlertDescription>
              The email sending service is not configured. Use the form below to verify your credentials, then add them to your <code className="font-mono bg-muted px-1 py-0.5 rounded">.env</code> file and restart the server.
            </AlertDescription>
          </Alert>
        )}

        <Accordion type="single" collapsible className="w-full mt-4">
          <AccordionItem value="item-1">
            <AccordionTrigger className='text-sm'>
              {isConfigured ? 'Verify New Credentials' : 'Enter Credentials for Verification'}
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-4">
                 <p className="text-sm text-muted-foreground mb-4">
                  Follow the instructions in the <code className="font-mono bg-muted px-1 py-0.5 rounded">.env</code> file to obtain these values from your Google Cloud project. This form only verifies the credentials; it does not save them.
                </p>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="senderEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sender Gmail Address</FormLabel>
                          <FormControl><Input placeholder="your-email@gmail.com" {...field} /></FormControl>
                          <FormDesc>The email address emails will be sent from.</FormDesc>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Google OAuth Client ID</FormLabel>
                          <FormControl><Input placeholder="Your Client ID from Google Cloud" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="clientSecret"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Google OAuth Client Secret</FormLabel>
                          <FormControl><Input type="password" placeholder="Your Client Secret from Google Cloud" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="refreshToken"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Google OAuth Refresh Token</FormLabel>
                          <FormControl><Input type="password" placeholder="Your Refresh Token from OAuth Playground" {...field} /></FormControl>
                           <FormDesc>This is a long-lived token used to generate new access tokens.</FormDesc>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={isVerifying}>
                      {isVerifying && <Icons.AppLogo className="mr-2 h-4 w-4 animate-spin" />}
                      Verify Credentials
                    </Button>
                  </form>
                </Form>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
