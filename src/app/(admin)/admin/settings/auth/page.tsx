
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getSiteSettings, updateSiteSettings } from '@/lib/mock-data';
import type { SiteSettings } from '@/types';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export default function AdminAuthSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

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

  const handleAuthPageChange = (field: string, value: string) => {
      if (!settings) return;
      setSettings(prev => prev ? ({ ...prev, authPage: { ...prev.authPage!, [field]: value }}) : null);
  }

  const handleSaveChanges = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      await updateSiteSettings({ authPage: settings.authPage });
      toast({
        title: 'Settings Saved',
        description: 'Authentication page settings have been updated.',
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
    if (loading || !settings?.authPage) {
        return (
            <Card>
                <CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <Card id="auth-page" className="scroll-mt-24">
                <CardHeader>
                    <CardTitle>Authentication Page</CardTitle>
                    <CardDescription>Customize the content on the Login, Signup, and Forgot Password pages.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="authImageUrl">Side Image URL</Label>
                        <Input id="authImageUrl" value={settings.authPage?.imageUrl || ''} onChange={(e) => handleAuthPageChange('imageUrl', e.target.value)} placeholder="https://images.unsplash.com/..."/>
                        <p className="text-xs text-muted-foreground">Recommended aspect ratio: 2:3 (e.g., 800x1200px).</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="authLoginTitle">Login Title</Label>
                        <Input id="authLoginTitle" value={settings.authPage?.loginTitle || ''} onChange={(e) => handleAuthPageChange('loginTitle', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="authLoginSubtitle">Login Subtitle</Label>
                        <Input id="authLoginSubtitle" value={settings.authPage?.loginSubtitle || ''} onChange={(e) => handleAuthPageChange('loginSubtitle', e.target.value)} />
                    </div>
                    <Separator />
                    <div className="space-y-2">
                        <Label htmlFor="authSignupTitle">Signup Title</Label>
                        <Input id="authSignupTitle" value={settings.authPage?.signupTitle || ''} onChange={(e) => handleAuthPageChange('signupTitle', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="authSignupSubtitle">Signup Subtitle</Label>
                        <Input id="authSignupSubtitle" value={settings.authPage?.signupSubtitle || ''} onChange={(e) => handleAuthPageChange('signupSubtitle', e.target.value)} />
                    </div>
                    <Separator />
                    <div className="space-y-2">
                        <Label htmlFor="authForgotTitle">Forgot Password Title</Label>
                        <Input id="authForgotTitle" value={settings.authPage?.forgotPasswordTitle || ''} onChange={(e) => handleAuthPageChange('forgotPasswordTitle', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="authForgotSubtitle">Forgot Password Subtitle</Label>
                        <Input id="authForgotSubtitle" value={settings.authPage?.forgotPasswordSubtitle || ''} onChange={(e) => handleAuthPageChange('forgotPasswordSubtitle', e.target.value)} />
                    </div>
                    <Separator />
                    <h4 className="text-md font-medium pt-2">Form Placeholders</h4>
                    <div className="space-y-2">
                        <Label htmlFor="authLoginEmailPlaceholder">Login Email Placeholder</Label>
                        <Input id="authLoginEmailPlaceholder" value={settings.authPage?.loginEmailPlaceholder || ''} onChange={(e) => handleAuthPageChange('loginEmailPlaceholder', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="authLoginPasswordPlaceholder">Login Password Placeholder</Label>
                        <Input id="authLoginPasswordPlaceholder" value={settings.authPage?.loginPasswordPlaceholder || ''} onChange={(e) => handleAuthPageChange('loginPasswordPlaceholder', e.target.value)} />
                    </div>
                    <Separator />
                    <div className="space-y-2">
                        <Label htmlFor="authSignupFirstNamePlaceholder">Signup First Name Placeholder</Label>
                        <Input id="authSignupFirstNamePlaceholder" value={settings.authPage?.signupFirstNamePlaceholder || ''} onChange={(e) => handleAuthPageChange('signupFirstNamePlaceholder', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="authSignupLastNamePlaceholder">Signup Last Name Placeholder</Label>
                        <Input id="authSignupLastNamePlaceholder" value={settings.authPage?.signupLastNamePlaceholder || ''} onChange={(e) => handleAuthPageChange('signupLastNamePlaceholder', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="authSignupUsernamePlaceholder">Signup Username Placeholder</Label>
                        <Input id="authSignupUsernamePlaceholder" value={settings.authPage?.signupUsernamePlaceholder || ''} onChange={(e) => handleAuthPageChange('signupUsernamePlaceholder', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="authSignupEmailPlaceholder">Signup Email Placeholder</Label>
                        <Input id="authSignupEmailPlaceholder" value={settings.authPage?.signupEmailPlaceholder || ''} onChange={(e) => handleAuthPageChange('signupEmailPlaceholder', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="authSignupPasswordPlaceholder">Signup Password Placeholder</Label>
                        <Input id="authSignupPasswordPlaceholder" value={settings.authPage?.signupPasswordPlaceholder || ''} onChange={(e) => handleAuthPageChange('signupPasswordPlaceholder', e.target.value)} />
                    </div>
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
