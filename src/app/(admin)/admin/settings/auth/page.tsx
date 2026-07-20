'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getSiteSettings, updateSiteSettings } from '@/lib/mock-data';
import type { SiteSettings } from '@/types';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { Sparkles, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRESET_WALLPAPERS = [
  {
    name: 'Mountain Dusk',
    url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1920&q=80',
  },
  {
    name: 'Dark Alpine Glow',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80',
  },
  {
    name: 'Northern Lights',
    url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=1920&q=80',
  },
  {
    name: 'Abstract Dark Mesh',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80',
  },
];

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

  const handleImageUrlChange = (url: string) => {
    if (!settings) return;
    setSettings(prev => {
      if (!prev) return null;
      return {
        ...prev,
        authPage: {
          ...prev.authPage,
          imageUrl: url,
        } as any,
      };
    });
  };

  const handleSaveChanges = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      await updateSiteSettings({ authPage: settings.authPage });
      toast({
        title: 'Background Image Updated',
        description: 'Authentication background wallpaper has been saved successfully.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save the background image settings.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !settings?.authPage) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  const currentImageUrl = settings.authPage?.imageUrl || PRESET_WALLPAPERS[0].url;

  return (
    <div className="space-y-6 max-w-4xl">
      <Card id="auth-page">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icons.Camera className="h-5 w-5 text-primary" />
            Authentication Background Image
          </CardTitle>
          <CardDescription>
            Customize the full-page background wallpaper rendered behind the login, sign-up, and password reset glassmorphic cards.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Image URL Input */}
          <div className="space-y-2">
            <Label htmlFor="authImageUrl" className="text-sm font-semibold">Background Image URL</Label>
            <div className="flex gap-2">
              <Input
                id="authImageUrl"
                value={settings.authPage?.imageUrl || ''}
                onChange={(e) => handleImageUrlChange(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className="font-mono text-xs"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Provide a direct high-resolution image link (e.g. Unsplash, CDN, or custom host). High aspect ratio wallpapers (1920x1080 or 16:9/2:3) work best.
            </p>
          </div>

          {/* Quick Preset Wallpapers */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Featured Wallpapers
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PRESET_WALLPAPERS.map((preset) => {
                const isSelected = currentImageUrl === preset.url;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleImageUrlChange(preset.url)}
                    className={cn(
                      "relative h-24 rounded-xl overflow-hidden border-2 text-left transition-all group focus:outline-none",
                      isSelected ? "border-primary ring-2 ring-primary/30 scale-[1.02]" : "border-border/60 hover:border-foreground/40"
                    )}
                  >
                    <Image
                      src={preset.url}
                      alt={preset.name}
                      fill
                      sizes="200px"
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-2">
                      <span className="text-[11px] font-medium text-white line-clamp-1">{preset.name}</span>
                    </div>
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Preview Container */}
          <div className="space-y-2 pt-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Live Wallpaper Preview</Label>
            <div className="relative h-64 w-full rounded-2xl overflow-hidden border border-border/80 shadow-md">
              <Image
                src={currentImageUrl}
                alt="Auth wallpaper preview"
                fill
                sizes="800px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                <div className="px-6 py-4 rounded-xl bg-black/40 backdrop-blur-md border border-white/20 text-white text-center shadow-lg">
                  <p className="text-sm font-semibold mb-1">Welcome to {settings.appName}</p>
                  <p className="text-xs text-white/70">Glassmorphic Card Overlay Preview</p>
                </div>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSaveChanges} disabled={isSaving || loading || !settings} size="lg" className="min-w-[140px]">
          {isSaving ? <Icons.AppLogo className="animate-spin mr-2 h-4 w-4" /> : null}
          Save Image
        </Button>
      </div>
    </div>
  );
}
