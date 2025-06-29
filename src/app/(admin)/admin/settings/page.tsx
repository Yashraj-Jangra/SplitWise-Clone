
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');

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

  const handleLogoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!settings) return;
    setSettings({ ...settings, logoUrl: e.target.value });
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
    if (newImageUrl && !settings.coverImages.includes(newImageUrl)) {
      setSettings({ ...settings, coverImages: [...settings.coverImages, newImageUrl] });
      setNewImageUrl('');
    } else {
      toast({
        variant: 'destructive',
        title: 'Invalid URL',
        description: 'Please enter a valid and unique image URL.',
      });
    }
  };

  const handleAppNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!settings) return;
    setSettings({ ...settings, appName: e.target.value });
  };
  
  const handleSaveChanges = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      await updateSiteSettings(settings);
      toast({
        title: 'Settings Saved',
        description: 'Site settings have been updated.',
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
        <>
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
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-video w-full rounded-md" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      );
    }

    return (
     <>
        <Card>
            <CardHeader>
                <CardTitle>Branding</CardTitle>
                <CardDescription>Customize the application's name and logo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="space-y-2">
                    <Label htmlFor="appName">Application Name</Label>
                    <Input id="appName" value={settings.appName} onChange={handleAppNameChange} />
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
                            <Input id="logoUrl" value={settings.logoUrl || ''} onChange={handleLogoUrlChange} placeholder="https://example.com/logo.png" />
                         </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
            <CardTitle>Default Group Cover Images</CardTitle>
            <CardDescription>These images are used as default covers when creating new groups. Paste URLs from any image hosting service.</CardDescription>
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
                        <CardTitle>Add New Cover Image</CardTitle>
                        <CardDescription>Add a new image by pasting a URL.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                        <Input
                            placeholder="https://example.com/image.png"
                            value={newImageUrl}
                            onChange={(e) => setNewImageUrl(e.target.value)}
                        />
                        <Button onClick={handleAddCoverImage}>Add by URL</Button>
                        </div>
                    </CardContent>
                    </Card>
                </div>
            </CardContent>
        </Card>
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline text-foreground">Site Settings</h1>
        <p className="text-muted-foreground">Manage application-wide configurations.</p>
      </div>
      
      {renderContent()}

      <div className="flex justify-end sticky bottom-6">
        <Button onClick={handleSaveChanges} disabled={isSaving || loading || !settings} size="lg">
          {isSaving ? <Icons.AppLogo className="animate-spin mr-2" /> : null}
          Save All Changes
        </Button>
      </div>
    </div>
  );
}
