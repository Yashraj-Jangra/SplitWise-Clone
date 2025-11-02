
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { updateSiteSettings } from '@/lib/mock-data';
import { useSiteSettings } from '@/contexts/site-settings-context';
import { useTheme } from '@/contexts/theme-context';
import { ALL_THEMES } from '@/themes';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

export default function AdminThemeSettingsPage() {
  const { settings: siteSettings, loading: siteSettingsLoading } = useSiteSettings();
  const { theme: currentTheme, setTheme } = useTheme();
  const [selectedThemeId, setSelectedThemeId] = useState(siteSettings.activeTheme || 'default');

  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  
  const [liveThemeVars, setLiveThemeVars] = useState<Record<string, string>>({});

  useEffect(() => {
    setSelectedThemeId(siteSettings.activeTheme || 'default');
  }, [siteSettings.activeTheme]);

  const handlePreview = (themeId: string) => {
    setTheme(themeId);
    setSelectedThemeId(themeId);
  };
  
  const handleLiveVarChange = (varName: string, value: string) => {
    setLiveThemeVars(prev => ({...prev, [varName]: value}));
    document.documentElement.style.setProperty(varName, value);
  }

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      await updateSiteSettings({ activeTheme: selectedThemeId });
      toast({
        title: 'Theme Saved',
        description: 'The new theme has been applied across the site.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save the new theme setting.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Appearance & Theme</CardTitle>
                <CardDescription>Select a base theme for the entire application.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {ALL_THEMES.map((theme) => (
                        <div key={theme.id} onClick={() => handlePreview(theme.id)} className="cursor-pointer">
                            <div
                                className={cn(
                                'relative rounded-lg border-2 p-4 transition-all',
                                selectedThemeId === theme.id ? 'border-primary shadow-lg' : 'border-border hover:border-primary/50'
                                )}
                            >
                                {selectedThemeId === theme.id && (
                                    <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                        <CheckCircle2 className="h-4 w-4" />
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div
                                        className="h-8 w-8 rounded-full"
                                        style={{ backgroundColor: theme.previewColor }}
                                        />
                                        <h3 className="text-lg font-semibold">{theme.name}</h3>
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <div className="h-5 w-1/3 rounded-sm bg-primary" />
                                        <div className="h-5 w-1/3 rounded-sm bg-secondary" />
                                        <div className="h-5 w-1/3 rounded-sm bg-destructive" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
             <CardContent>
                <div className="flex justify-end">
                    <Button onClick={handleSaveChanges} disabled={isSaving || siteSettingsLoading} size="lg">
                        {isSaving ? <Icons.AppLogo className="animate-spin mr-2" /> : null}
                        Save Theme
                    </Button>
                </div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Live Theme Customizer</CardTitle>
                <CardDescription>
                    Customize the live theme variables. Changes here are temporary and will reset on page reload unless you update your theme file.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="bg-input">Background</Label>
                        <Input id="bg-input" placeholder="e.g., 240 6% 10%" onChange={(e) => handleLiveVarChange('--background', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="fg-input">Foreground</Label>
                        <Input id="fg-input" placeholder="e.g., 240 5% 85%" onChange={(e) => handleLiveVarChange('--foreground', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="card-input">Card Background</Label>
                        <Input id="card-input" placeholder="e.g., 240 5% 15%" onChange={(e) => handleLiveVarChange('--card', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="primary-input">Primary Color</Label>
                        <Input id="primary-input" placeholder="e.g., 255 85% 65%" onChange={(e) => handleLiveVarChange('--primary', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="accent-input">Accent Color</Label>
                        <Input id="accent-input" placeholder="e.g., 190 85% 60%" onChange={(e) => handleLiveVarChange('--accent', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="radius-input">Border Radius</Label>
                        <Input id="radius-input" placeholder="e.g., 0.8rem" onChange={(e) => handleLiveVarChange('--radius', e.target.value)} />
                    </div>
                 </div>
            </CardContent>
        </Card>
    </div>
  );
}
