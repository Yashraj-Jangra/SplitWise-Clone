
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

type EmailTemplateName = keyof NonNullable<SiteSettings['emailTemplates']>;
type FromAddressKey = keyof NonNullable<SiteSettings['emailSettings']>['fromAddresses'];

const FROM_ADDRESS_CONFIG: { key: FromAddressKey; label: string; description: string; badge?: string }[] = [
  { key: 'auth', label: 'Authentication', description: 'Used for password resets, registration confirmation, and login alerts.', badge: 'Auth' },
  { key: 'notifications', label: 'Notifications', description: 'Used for expense alerts, settlements, member invitations, and balance reminders.', badge: 'Notifications' },
  { key: 'support', label: 'Support', description: 'Used for support ticket confirmations and admin replies.', badge: 'Support' },
  { key: 'broadcast', label: 'Broadcast', description: 'Used for admin-sent bulk announcements to all users.', badge: 'Broadcast' },
];

const templatePlaceholders: Partial<Record<EmailTemplateName, string[]>> = {
    registration: ['{appName}', '{userName}'],
    forgotPassword: ['{appName}', '{userName}', '{resetLink}'],
    loginNotification: ['{appName}', '{userName}'],
    monthlyReport: ['{appName}', '{totalSpent}', '{expenseCount}', '{userName}'],
    paymentReminder: ['{appName}', '{userName}', '{balanceAmount}', '{groupName}'],
    supportTicketConfirmation: ['{appName}', '{userName}', '{ticketId}', '{ticketSubject}'],
    supportTicketAdminNotification: ['{appName}', '{userName}', '{userEmail}', '{ticketSubject}', '{ticketCategory}', '{ticketMessage}', '{ticketLink}'],
    supportTicketReply: ['{appName}', '{userName}', '{ticketId}', '{replyMessage}', '{ticketLink}'],
    expenseAdded: ['{appName}', '{userName}', '{actorName}', '{description}', '{amount}', '{groupName}'],
    settlementAdded: ['{appName}', '{userName}', '{actorName}', '{amount}', '{groupName}'],
    memberAdded: ['{appName}', '{userName}', '{actorName}', '{groupName}'],
    balanceReminder: ['{appName}', '{userName}'],
    broadcast: ['{broadcastSubject}', '{broadcastBody}'],
};

const templateGroups = [
  { label: 'Auth & Account', templates: ['registration', 'forgotPassword', 'loginNotification'] },
  { label: 'Expenses & Groups', templates: ['expenseAdded', 'settlementAdded', 'memberAdded', 'balanceReminder'] },
  { label: 'Support', templates: ['supportTicketConfirmation', 'supportTicketReply', 'supportTicketAdminNotification'] },
  { label: 'Broadcast', templates: ['broadcast'] },
];

export default function AdminMailSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState<FromAddressKey | null>(null);
  const { toast } = useToast();
  const { firebaseUser } = useAuth();

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

  const handleFromAddressChange = (key: FromAddressKey, value: string) => {
    if (!settings?.emailSettings) return;
    const newFrom = { ...settings.emailSettings.fromAddresses, [key]: value };
    handleEmailSettingsChange('fromAddresses', newFrom);
  };
  
  const handleSmtpChange = (field: string, value: any) => {
      if (!settings?.emailSettings) return;
      const newSmtp = { ...settings.emailSettings.smtpSettings, [field]: value };
      handleEmailSettingsChange('smtpSettings', newSmtp);
  };
  
  const handleGmailChange = (field: string, value: any) => {
    if (!settings?.emailSettings) return;
    const newGmail = { ...settings.emailSettings.gmailSettings, [field]: value };
    handleEmailSettingsChange('gmailSettings', newGmail);
  };

  const handleTemplateChange = (templateName: EmailTemplateName, field: keyof EmailTemplate, value: string) => {
    if (!settings) return;
    setSettings(prev => {
        if (!prev || !prev.emailTemplates) return prev;
        const newTemplates = { ...prev.emailTemplates };
        newTemplates[templateName] = { ...newTemplates[templateName], [field]: value };
        return { ...prev, emailTemplates: newTemplates };
    });
  };
  
  const handleSendTestMail = async (testTarget: FromAddressKey) => {
    if (!firebaseUser) {
        toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to send a test email.' });
        return;
    }

    if (!settings?.emailSettings || !settings.emailSettings.fromAddresses[testTarget] || !settings.emailSettings.smtpSettings) {
        toast({ variant: 'destructive', title: 'Missing Settings', description: 'Please fill out all SMTP fields and the target "From" address first.' });
        return;
    }
    setIsSendingTest(testTarget);
    try {
        const idToken = await firebaseUser.getIdToken();
        const response = await fetch('/api/send-test-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
            },
            body: JSON.stringify({ emailSettings: settings.emailSettings, testTarget }),
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Failed to send email.');
        }

        toast({
            title: "Test Email Sent",
            description: `A test email has been sent to your account from ${settings.emailSettings.fromAddresses[testTarget]}.`,
        });

    } catch (error) {
         toast({
            variant: "destructive",
            title: "Failed to Send Test Email",
            description: error instanceof Error ? error.message : "An unknown error occurred.",
        });
    } finally {
        setIsSendingTest(null);
    }
  };


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

  if (loading || !settings) {
    return (
      <div className="space-y-6">
        <Card><CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
      </div>
    );
  }

  const { emailSettings, emailTemplates } = settings;

  return (
    <div className="space-y-6">

      {/* ─── SENDING METHOD ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icons.Mail className="h-5 w-5 text-primary" />
            Mail Sending Method
          </CardTitle>
          <CardDescription>Choose how your application sends transactional emails.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={emailSettings?.sendingMethod}
            onValueChange={(value: 'firebase' | 'custom' | 'gmail') => handleEmailSettingsChange('sendingMethod', value)}
            className="space-y-3"
          >
            {/* Firebase option */}
            <Label className="flex items-start gap-4 border p-4 rounded-lg has-[:checked]:bg-muted has-[:checked]:border-primary transition-all cursor-pointer">
              <RadioGroupItem value="firebase" id="firebase-mail" className="mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-base">Firebase Authentication Emailing</span>
                  <Badge variant="secondary" className="text-xs">Free</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Use Firebase's built-in service for password resets and email verification. No configuration needed, but templates cannot be customized.</p>
              </div>
            </Label>

            {/* Custom SMTP option */}
            <Label className="flex items-start gap-4 border p-4 rounded-lg has-[:checked]:bg-muted has-[:checked]:border-primary transition-all cursor-pointer">
              <RadioGroupItem value="custom" id="custom-mail" className="mt-0.5" />
              <div className="flex-1 space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-base">Custom SMTP Server</span>
                    <Badge variant="outline" className="text-xs">Recommended</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Connect your own SMTP server (e.g., SendGrid, Postmark, Brevo) for full template control and multiple from-addresses.</p>
                </div>

                {emailSettings?.sendingMethod === 'custom' && (
                  <div className="space-y-6 pt-4 border-t" onClick={(e) => e.preventDefault()}>

                    {/* From Addresses */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-0.5">From Addresses</h4>
                        <p className="text-xs text-muted-foreground">Configure a dedicated sending address for each email category.</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {FROM_ADDRESS_CONFIG.map(({ key, label, description, badge }) => (
                          <div key={key} className="space-y-1.5 p-3 rounded-md bg-muted/30 border">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{badge}</Badge>
                              <Label htmlFor={`from-${key}`} className="text-sm font-medium">{label}</Label>
                            </div>
                            <Input
                              id={`from-${key}`}
                              value={emailSettings.fromAddresses[key] || ''}
                              onChange={(e) => handleFromAddressChange(key, e.target.value)}
                              placeholder={`${key}@yourapp.com`}
                              className="font-mono text-sm"
                            />
                            <p className="text-[11px] text-muted-foreground leading-tight">{description}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* SMTP Server */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-foreground">SMTP Server Configuration</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="smtpHost">SMTP Host</Label>
                          <Input id="smtpHost" value={emailSettings.smtpSettings.host} onChange={(e) => handleSmtpChange('host', e.target.value)} placeholder="smtp.example.com" />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="smtpPort">Port</Label>
                          <Input id="smtpPort" type="number" value={emailSettings.smtpSettings.port} onChange={(e) => handleSmtpChange('port', parseInt(e.target.value, 10))} />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="smtpUser">Username</Label>
                          <Input id="smtpUser" value={emailSettings.smtpSettings.user} onChange={(e) => handleSmtpChange('user', e.target.value)} placeholder="smtp_username" />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="smtpPass">Password / API Key</Label>
                          <Input id="smtpPass" type="password" value={emailSettings.smtpSettings.pass} onChange={(e) => handleSmtpChange('pass', e.target.value)} placeholder="••••••••••••" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch id="smtp-secure" checked={emailSettings.smtpSettings.secure} onCheckedChange={(checked) => handleSmtpChange('secure', checked)} />
                        <Label htmlFor="smtp-secure" className="text-sm">Use SSL/TLS (recommended for port 465)</Label>
                      </div>
                    </div>

                    <Separator />

                    {/* Test Buttons */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground">Send Test Emails</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {FROM_ADDRESS_CONFIG.map(({ key, label }) => (
                          <Button
                            key={key}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendTestMail(key)}
                            disabled={!!isSendingTest}
                            className="text-xs h-8"
                          >
                            {isSendingTest === key && <Icons.AppLogo className="mr-1.5 h-3 w-3 animate-spin" />}
                            Test {label}
                          </Button>
                        ))}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            </Label>

            {/* Gmail API option */}
            <Label className="flex items-start gap-4 border p-4 rounded-lg has-[:checked]:bg-muted has-[:checked]:border-primary transition-all cursor-pointer">
              <RadioGroupItem value="gmail" id="gmail-api" className="mt-0.5" />
              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-base">Gmail API</span>
                    <Badge variant="outline" className="text-xs">Advanced</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Send via the Gmail API for high deliverability. Requires a Google Cloud project with OAuth 2.0.</p>
                </div>
                {emailSettings?.sendingMethod === 'gmail' && (
                  <div className="space-y-4 pt-4 border-t" onClick={(e) => e.preventDefault()}>
                    {emailSettings.gmailSettings?.connectedEmail ? (
                      <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                        <div className="flex items-center gap-2">
                          <Icons.Mail className="h-5 w-5 text-primary" />
                          <p className="text-sm font-medium">Connected as {emailSettings.gmailSettings.connectedEmail}</p>
                        </div>
                        <Button size="sm" variant="secondary" onClick={() => handleGmailChange('connectedEmail', '')}>Disconnect</Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-6 border-2 border-dashed rounded-lg">
                        <Icons.Google className="h-8 w-8 mb-3 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-4">No Gmail account connected.</p>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button type="button" variant="secondary" onClick={() => toast({ title: 'Feature Not Implemented', description: 'Gmail API connection requires backend logic not yet implemented.' })}>
                                <Icons.Google className="mr-2 h-4 w-4" />
                                Connect with Gmail
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>This feature requires backend implementation.</p></TooltipContent>
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

      {/* ─── EMAIL TEMPLATES ────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icons.Bell className="h-5 w-5 text-primary" />
            Email Templates
          </CardTitle>
          <CardDescription>
            Customize the content of transactional emails. Applies when using Custom SMTP or Gmail API.
            Use <code className="text-xs bg-muted px-1 py-0.5 rounded">[Button Text](https://link)</code> syntax to render CTA buttons.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="registration" className="w-full">
            <div className="overflow-x-auto">
              <TabsList className="flex w-max gap-1 mb-4">
                {templateGroups.map(group => (
                  <div key={group.label} className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground px-2 font-medium whitespace-nowrap">{group.label}</span>
                    {group.templates.map(t => (
                      <TabsTrigger key={t} value={t} className="text-xs capitalize whitespace-nowrap">
                        {t.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                      </TabsTrigger>
                    ))}
                    <div className="w-px h-4 bg-border mx-1" />
                  </div>
                ))}
              </TabsList>
            </div>

            {(Object.keys(templatePlaceholders) as EmailTemplateName[]).map(tKey => (
              <TabsContent key={tKey} value={tKey} className="mt-0">
                <div className="space-y-4 p-4 border rounded-lg bg-muted/10">
                  <div className="space-y-1.5">
                    <Label htmlFor={`${tKey}-subject`} className="text-sm font-medium">Subject Line</Label>
                    <Input
                      id={`${tKey}-subject`}
                      value={emailTemplates?.[tKey]?.subject || ''}
                      onChange={(e) => handleTemplateChange(tKey, 'subject', e.target.value)}
                      placeholder="Email subject..."
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`${tKey}-body`} className="text-sm font-medium">Body</Label>
                    <Textarea
                      id={`${tKey}-body`}
                      value={emailTemplates?.[tKey]?.body || ''}
                      onChange={(e) => handleTemplateChange(tKey, 'body', e.target.value)}
                      rows={10}
                      className="font-mono text-sm resize-y"
                      placeholder="Email body content..."
                    />
                  </div>
                  <Accordion type="single" collapsible>
                    <AccordionItem value="placeholders" className="border-b-0">
                      <AccordionTrigger className="text-xs text-muted-foreground hover:no-underline p-0 h-auto">
                        View available placeholders
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="flex flex-wrap gap-2 pt-2">
                          {templatePlaceholders[tKey]?.map(p => (
                            <Badge key={p} variant="secondary" className="font-mono text-xs">{p}</Badge>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* ─── SAVE ───────────────────────────────────────── */}
      <div className="flex justify-end pb-6">
        <Button onClick={handleSaveChanges} disabled={isSaving || loading || !settings} size="lg" className="min-w-36">
          {isSaving ? <Icons.AppLogo className="animate-spin mr-2 h-4 w-4" /> : <Icons.Check className="mr-2 h-4 w-4" />}
          {isSaving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>
    </div>
  );
}
