
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getSiteSettings, updateSiteSettings } from '@/lib/mock-data';
import { X } from 'lucide-react';
import Image from 'next/image';
import type { SiteSettings } from '@/types';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

export default function AdminGeneralSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newCoverImageUrl, setNewCoverImageUrl] = useState('');
  
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

  const handleValueChange = <T extends keyof SiteSettings>(key: T, value: SiteSettings[T]) => {
      if (!settings) return;
      setSettings({ ...settings, [key]: value });
  };

  const handleCoverImageChange = (index: number, value: string) => {
    if (!settings) return;
    const newImages = [...settings.coverImages];
    newImages[index] = value;
    setSettings({ ...settings, coverImages: newImages });
  };

  const handleRemoveCoverImage = (index: number) => {
    if (!settings) return;
    const newImages = settings.coverImages.filter((_, i) => i !== index);
    setSettings({ ...settings, coverImages: newImages });
  };

  const handleAddCoverImage = () => {
    if (!settings) return;
    if (newCoverImageUrl && !settings.coverImages.includes(newCoverImageUrl)) {
      setSettings({ ...settings, coverImages: [...settings.coverImages, newCoverImageUrl] });
      setNewCoverImageUrl('');
    } else {
      toast({
        variant: 'destructive',
        title: 'Invalid URL',
        description: 'Please enter a valid and unique image URL.',
      });
    }
  };

  const handleSaveChanges = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      // Only save the settings relevant to this page
      await updateSiteSettings({
        appName: settings.appName,
        logoUrl: settings.logoUrl,
        faviconUrl: settings.faviconUrl,
        coverImages: settings.coverImages,
      });
      toast({
        title: 'Settings Saved',
        description: 'General site settings have been updated.',
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
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <div className="flex items-end gap-4">
                <Skeleton className="h-20 w-20 rounded-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
     <div className="space-y-6">
        <Card id="branding">
            <CardHeader>
                <CardTitle>Branding</CardTitle>
                <CardDescription>Customize the application's name and logo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="space-y-2">
                    <Label htmlFor="appName">Application Name</Label>
                    <Input id="appName" value={settings.appName} onChange={(e) => handleValueChange('appName', e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>Application Logo</Label>
                    <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={settings.logoUrl} alt={settings.appName} />
                            <AvatarFallback>{getInitials(settings.appName)}</AvatarFallback>
                        </Avatar>
                         <div className="w-full space-y-1">
                            <Label htmlFor="logoUrl" className="text-xs text-muted-foreground">Logo Image URL</Label>
                            <Input id="logoUrl" value={settings.logoUrl || ''} onChange={(e) => handleValueChange('logoUrl', e.target.value)} placeholder="https://example.com/logo.png" />
                         </div>
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="faviconUrl">Favicon URL</Label>
                    <Input id="faviconUrl" value={settings.faviconUrl || ''} onChange={(e) => handleValueChange('faviconUrl', e.target.value)} placeholder="https://example.com/favicon.ico" />
                    <p className="text-xs text-muted-foreground">Recommended size: 32x32px. Use .ico, .png, or .svg format.</p>
                </div>
            </CardContent>
        </Card>
        
        <Card id="cover-images">
            <CardHeader>
                <CardTitle>Group Creation: Default Cover Images</CardTitle>
                <CardDescription>Manage the default cover images used when users create a new group. A random image from this list will be chosen.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {settings.coverImages.map((url, index) => (
                        <div key={index} className="relative group space-y-2">
                        <div className="relative aspect-video w-full overflow-hidden rounded-md">
                            <Image src={url} alt={`Cover ${index + 1}`} fill className="object-cover" />
                            <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRemoveCoverImage(index)}
                            >
                            <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <Input
                            value={url}
                            onChange={(e) => handleCoverImageChange(index, e.target.value)}
                            placeholder="Image URL"
                        />
                        </div>
                    ))}
                    </div>
                    <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Add New Cover Image</CardTitle>
                        <CardDescription className="text-sm">Add a new image by pasting a URL.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                        <Input
                            placeholder="https://example.com/image.png"
                            value={newCoverImageUrl}
                            onChange={(e) => setNewCoverImageUrl(e.target.value)}
                        />
                        <Button onClick={handleAddCoverImage}>Add by URL</Button>
                        </div>
                    </CardContent>
                    </Card>
                </div>
            </CardContent>
        </Card>
        
        <div className="flex justify-end">
          <Button onClick={handleSaveChanges} disabled={isSaving || loading || !settings} size="lg">
            {isSaving ? <Icons.AppLogo className="animate-orbit mr-2" /> : null}
            Save Changes
          </Button>
        </div>
      </div>
    );
  };
  
  return renderContent();
}
