
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getSiteSettings, updateSiteSettings } from '@/lib/mock-data';
import type { SiteSettings, EmailTemplate } from '@/types';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/auth-context';

type EmailTemplateName = keyof SiteSettings['emailTemplates'];

const templatePlaceholders: Record<EmailTemplateName, string[]> = {
    registration: ['{appName}', '{userName}'],
    forgotPassword: ['{appName}', '{userName}', '{resetLink}'],
    loginNotification: ['{appName}', '{userName}'],
    monthlyReport: ['{appName}', 'totalSpent', 'expenseCount', 'userName'],
    paymentReminder: ['{appName}', '{userName}', 'balanceAmount', 'groupName'],
};

export default function AdminMailSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const { toast } = useToast();
  const { firebaseUser } = useAuth(); // Get the firebaseUser for the auth token

  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      try {
        const siteSettings = await getSiteSettings();
        setSettings(siteSettings);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load site settings.' });
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, [toast]);

  const handleEmailSettingsChange = (field: string, value: any) => {
    if (!settings) return;
    setSettings(prev => prev ? ({ ...prev, emailSettings: { ...prev.emailSettings!, [field]: value } }) : null);
  };
  
  const handleSmtpChange = (field: string, value: any) => {
      if (!settings?.emailSettings) return;
      const newSmtp = { ...settings.emailSettings.smtpSettings, [field]: value };
      handleEmailSettingsChange('smtpSettings', newSmtp);
  }
  
  const handleGmailChange = (field: string, value: any) => {
    if (!settings?.emailSettings) return;
    const newGmail = { ...settings.emailSettings.gmailSettings, [field]: value };
    handleEmailSettingsChange('gmailSettings', newGmail);
  }

  const handleTemplateChange = (templateName: EmailTemplateName, field: keyof EmailTemplate, value: string) => {
    if (!settings) return;
    setSettings(prev => {
        if (!prev || !prev.emailTemplates) return prev;
        const newTemplates = { ...prev.emailTemplates };
        newTemplates[templateName] = { ...newTemplates[templateName], [field]: value };
        return { ...prev, emailTemplates: newTemplates };
    })
  }
  
  const handleSendTestMail = async () => {
    if (!firebaseUser) {
        toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to send a test email.' });
        return;
    }

    if (!settings?.emailSettings?.smtpSettings || !settings?.emailSettings?.fromEmail) {
        toast({ variant: 'destructive', title: 'Missing Settings', description: 'Please fill out From Email and all SMTP fields first.' });
        return;
    }
    setIsSendingTest(true);
    try {
        const idToken = await firebaseUser.getIdToken();
        const response = await fetch('/api/send-test-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
            },
            body: JSON.stringify(settings.emailSettings),
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Failed to send email.');
        }

        toast({
            title: "Test Email Sent",
            description: `A test email has been sent to your logged-in account email address.`,
        });

    } catch (error) {
         toast({
            variant: "destructive",
            title: "Failed to Send Test Email",
            description: error instanceof Error ? error.message : "An unknown error occurred.",
        });
    } finally {
        setIsSendingTest(false);
    }
  }


  const handleSaveChanges = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      await updateSiteSettings({ 
          emailSettings: settings.emailSettings,
          emailTemplates: settings.emailTemplates,
       });
      toast({
        title: 'Settings Saved',
        description: 'Mail settings have been updated.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save the settings.',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const renderContent = () => {
    if (loading || !settings) {
        return (
            <div className="space-y-6">
                <Card><CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
            </div>
        )
    }

    const { emailSettings, emailTemplates } = settings;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Mail Sending Method</CardTitle>
                    <CardDescription>Choose how your application sends transactional emails.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                     <RadioGroup 
                        value={emailSettings?.sendingMethod} 
                        onValueChange={(value: 'firebase' | 'custom' | 'gmail') => handleEmailSettingsChange('sendingMethod', value)}
                        className="space-y-4"
                     >
                        <Label className="flex items-center gap-4 border p-4 rounded-md has-[:checked]:bg-muted has-[:checked]:border-primary transition-all">
                            <RadioGroupItem value="firebase" id="firebase-mail" />
                            <div className="flex-1">
                                <span className="font-semibold text-base">Firebase Authentication Emailing</span>
                                <p className="text-sm text-muted-foreground">Use the free, built-in Firebase service for password resets and email verification. No configuration needed, but templates cannot be customized.</p>
                            </div>
                        </Label>
                        <Label className="flex items-start gap-4 border p-4 rounded-md has-[:checked]:bg-muted has-[:checked]:border-primary transition-all">
                            <RadioGroupItem value="custom" id="custom-mail" />
                            <div className="flex-1 space-y-4">
                                <span className="font-semibold text-base">Custom SMTP Server</span>
                                <p className="text-sm text-muted-foreground">Connect to your own SMTP server (e.g., SendGrid, Postmark, or a personal email account) for full control over templates and sending.</p>
                                {emailSettings?.sendingMethod === 'custom' && (
                                    <div className="space-y-4 pt-4 border-t">
                                        <div className="space-y-2">
                                            <Label htmlFor="fromEmail">From Email Address</Label>
                                            <Input id="fromEmail" value={emailSettings.fromEmail || ''} onChange={(e) => handleEmailSettingsChange('fromEmail', e.target.value)} placeholder="noreply@yourapp.com" />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="smtpHost">SMTP Host</Label>
                                                <Input id="smtpHost" value={emailSettings.smtpSettings.host} onChange={(e) => handleSmtpChange('host', e.target.value)} placeholder="smtp.example.com" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="smtpPort">Port</Label>
                                                <Input id="smtpPort" type="number" value={emailSettings.smtpSettings.port} onChange={(e) => handleSmtpChange('port', parseInt(e.target.value, 10))} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="smtpUser">Username</Label>
                                                <Input id="smtpUser" value={emailSettings.smtpSettings.user} onChange={(e) => handleSmtpChange('user', e.target.value)} placeholder="your_smtp_username" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="smtpPass">Password/API Key</Label>
                                                <Input id="smtpPass" type="password" value={emailSettings.smtpSettings.pass} onChange={(e) => handleSmtpChange('pass', e.target.value)} placeholder="••••••••••••" />
                                            </div>
                                        </div>
                                         <div className="flex items-center space-x-2 pt-2">
                                            <Switch id="smtp-secure" checked={emailSettings.smtpSettings.secure} onCheckedChange={(checked) => handleSmtpChange('secure', checked)} />
                                            <Label htmlFor="smtp-secure">Use SSL/TLS</Label>
                                        </div>
                                        <div className="pt-4 border-t flex justify-end">
                                            <Button type="button" variant="secondary" onClick={handleSendTestMail} disabled={isSendingTest}>
                                                {isSendingTest && <Icons.AppLogo className="mr-2 animate-spin" />}
                                                Send Test Mail
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Label>
                        <Label className="flex items-start gap-4 border p-4 rounded-md has-[:checked]:bg-muted has-[:checked]:border-primary transition-all">
                            <RadioGroupItem value="gmail" id="gmail-api" />
                            <div className="flex-1 space-y-4">
                                <span className="font-semibold text-base">Gmail API</span>
                                <p className="text-sm text-muted-foreground">Send emails via the official Gmail API for high deliverability. Requires a Google Cloud project with OAuth 2.0 configured.</p>
                                {emailSettings?.sendingMethod === 'gmail' && (
                                     <div className="space-y-4 pt-4 border-t">
                                        {emailSettings.gmailSettings?.connectedEmail ? (
                                            <div className='flex items-center justify-between p-3 bg-muted rounded-md'>
                                                <div className='flex items-center gap-2'>
                                                    <Icons.Mail className='h-5 w-5 text-primary' />
                                                    <p className='text-sm font-medium'>Connected as {emailSettings.gmailSettings.connectedEmail}</p>
                                                </div>
                                                <Button size="sm" variant="secondary" onClick={() => handleGmailChange('connectedEmail', '')}>Disconnect</Button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center text-center p-4 border-2 border-dashed rounded-md">
                                                <Icons.Google className="h-8 w-8 mb-2 text-muted-foreground" />
                                                <p className='text-sm text-muted-foreground mb-3'>No Gmail account connected.</p>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button type="button" variant="secondary" onClick={() => toast({ title: 'Feature Not Implemented', description: 'Gmail API connection requires backend logic not yet implemented.' })}>
                                                                <Icons.Google className='mr-2' />
                                                                Connect with Gmail
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>This feature requires backend implementation.</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                        )}
                                     </div>
                                )}
                            </div>
                        </Label>
                    </RadioGroup>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Email Templates</CardTitle>
                    <CardDescription>Customize the content of transactional emails. This only applies if you are using a Custom SMTP Server or Gmail API.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Tabs defaultValue="registration" className="w-full" orientation="vertical">
                        <TabsList>
                            <TabsTrigger value="registration">Registration</TabsTrigger>
                            <TabsTrigger value="forgotPassword">Forgot Password</TabsTrigger>
                            <TabsTrigger value="loginNotification">Login Alert</TabsTrigger>
                            <TabsTrigger value="monthlyReport">Monthly Report</TabsTrigger>
                            <TabsTrigger value="paymentReminder">Reminder</TabsTrigger>
                        </TabsList>
                        
                        {Object.keys(templatePlaceholders).map(key => {
                            const tKey = key as EmailTemplateName;
                            return (
                                <TabsContent key={tKey} value={tKey} className="mt-0">
                                    <div className="space-y-4 p-4 border rounded-md">
                                        <h3 className="text-lg font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</h3>
                                        <div className="space-y-2">
                                            <Label htmlFor={`${tKey}-subject`}>Subject</Label>
                                            <Input id={`${tKey}-subject`} value={emailTemplates?.[tKey]?.subject || ''} onChange={(e) => handleTemplateChange(tKey, 'subject', e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor={`${tKey}-body`}>Body</Label>
                                            <Textarea id={`${tKey}-body`} value={emailTemplates?.[tKey]?.body || ''} onChange={(e) => handleTemplateChange(tKey, 'body', e.target.value)} rows={8} />
                                        </div>
                                        <Accordion type="single" collapsible>
                                            <AccordionItem value="placeholders" className="border-b-0">
                                                <AccordionTrigger className="text-xs text-muted-foreground hover:no-underline p-0 h-auto">View available placeholders</AccordionTrigger>
                                                <AccordionContent>
                                                    <div className="flex flex-wrap gap-2 pt-2">
                                                        {templatePlaceholders[tKey].map(p => <Badge key={p} variant="secondary">{p}</Badge>)}
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        </Accordion>
                                    </div>
                                </TabsContent>
                            )
                        })}
                    </Tabs>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={handleSaveChanges} disabled={isSaving || loading || !settings} size="lg">
                    {isSaving ? <Icons.AppLogo className="animate-spin mr-2" /> : null}
                    Save Changes
                </Button>
            </div>
        </div>
    )
  }

  return renderContent();
}
