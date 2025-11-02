
'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { ColorPicker } from '@/components/ui/color-picker';

type ThemeColor = { h: number, s: number, l: number };

function ColorEditor({ label, color, onChange }: { label: string, color: ThemeColor, onChange: (newColor: ThemeColor) => void }) {
    const hslString = `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
    return (
        <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center justify-between">
                <Label className="font-semibold">{label}</Label>
                <div 
                    className="h-8 w-8 rounded-full border-2"
                    style={{ backgroundColor: hslString }}
                />
            </div>
             <ColorPicker
                color={hslString}
                setColor={(newColor) => {
                    // This is a simple parser. A more robust one would be needed for a real app.
                    if (typeof newColor === 'string' && newColor.startsWith('hsl')) {
                         const parts = newColor.match(/hsl\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%\)/);
                         if (parts) {
                            onChange({ h: parseFloat(parts[1]), s: parseFloat(parts[2]), l: parseFloat(parts[3]) });
                         }
                    }
                }}
            />
        </div>
    )
}

function parseHsl(hslString: string): ThemeColor {
    if (!hslString) return { h: 0, s: 0, l: 0 };
    const parts = hslString.match(/([\d.]+)/g);
    if (!parts || parts.length < 3) return { h: 0, s: 0, l: 0 };
    const [h, s, l] = parts.map(parseFloat);
    return { h, s, l };
}

export default function AdminThemeSettingsPage() {
  const { settings: siteSettings, loading: siteSettingsLoading } = useSiteSettings();
  const { theme: currentTheme, setTheme } = useTheme();
  const [selectedThemeId, setSelectedThemeId] = useState('default');
  
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  
  const [livePrimary, setLivePrimary] = useState<ThemeColor>({h: 0, s: 0, l: 0});
  const [liveBackground, setLiveBackground] = useState<ThemeColor>({h: 0, s: 0, l: 0});
  const [liveForeground, setLiveForeground] = useState<ThemeColor>({h: 0, s: 0, l: 0});
  const [liveRadius, setLiveRadius] = useState(0.5);

  const getCssVariable = useCallback((varName: string) => {
    if (typeof window === 'undefined') return '';
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  }, []);

  const initializeLiveTheme = useCallback(() => {
    setLivePrimary(parseHsl(getCssVariable('--primary')));
    setLiveBackground(parseHsl(getCssVariable('--background')));
    setLiveForeground(parseHsl(getCssVariable('--foreground')));
    setLiveRadius(parseFloat(getCssVariable('--radius') || '0.5'));
  }, [getCssVariable]);

  useEffect(() => {
    if (siteSettings.activeTheme) {
        setSelectedThemeId(siteSettings.activeTheme);
    }
  }, [siteSettings.activeTheme]);

  useEffect(() => {
    // When the theme changes (from picker or load), re-initialize the live editor
    initializeLiveTheme();
  }, [currentTheme, initializeLiveTheme]);

  const handlePreview = (themeId: string) => {
    setTheme(themeId);
    setSelectedThemeId(themeId);
  };
  
  const handleLiveColorChange = useCallback((varName: string, color: ThemeColor) => {
    const hslString = `${color.h} ${color.s}% ${color.l}%`;
    document.documentElement.style.setProperty(varName, hslString);

    if (varName === '--primary') setLivePrimary(color);
    if (varName === '--background') setLiveBackground(color);
    if (varName === '--foreground') setLiveForeground(color);
  }, []);

  const handleRadiusChange = useCallback((value: number) => {
    setLiveRadius(value);
    document.documentElement.style.setProperty('--radius', `${value}rem`);
  }, []);

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
                    <ColorEditor label="Primary" color={livePrimary} onChange={(c) => handleLiveColorChange('--primary', c)} />
                    <ColorEditor label="Background" color={liveBackground} onChange={(c) => handleLiveColorChange('--background', c)} />
                    <ColorEditor label="Foreground" color={liveForeground} onChange={(c) => handleLiveColorChange('--foreground', c)} />
                 </div>
                 <Separator />
                 <div className="space-y-4">
                     <div className="flex items-center justify-between">
                        <Label htmlFor="radius-slider" className="font-semibold">Border Radius</Label>
                        <span className="text-sm text-muted-foreground font-mono">{liveRadius.toFixed(2)}rem</span>
                    </div>
                    <Slider id="radius-slider" value={[liveRadius]} onValueChange={([v]) => handleRadiusChange(v)} max={2} step={0.05} />
                 </div>
            </CardContent>
        </Card>
    </div>
  );
}
