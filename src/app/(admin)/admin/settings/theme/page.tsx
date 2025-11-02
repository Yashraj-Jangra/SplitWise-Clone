
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";


function ColorEditor({ label, color, onChange, varName, onMount }: { label: string, color: string, onChange: (newColor: string) => void, varName: string, onMount: (val: string) => void }) {
    
    useEffect(() => {
        const cssVar = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
        const hslString = parseHslString(cssVar);
        onMount(hslString);
    }, [varName, onMount]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label className="font-semibold">{label}</Label>
                <div 
                    className="h-8 w-8 rounded-full border-2"
                    style={{ backgroundColor: color }}
                />
            </div>
             <ColorPicker
                color={color}
                setColor={onChange}
            />
        </div>
    )
}

function parseHslString(hslString: string): string {
    if (!hslString) return 'hsl(0, 0%, 0%)';
    const parts = hslString.match(/([\d.]+)/g);
    if (!parts || parts.length < 3) return 'hsl(0, 0%, 0%)';
    return `hsl(${parts[0]}, ${parts[1]}%, ${parts[2]}%)`;
}


export default function AdminThemeSettingsPage() {
  const { settings: siteSettings, loading: siteSettingsLoading } = useSiteSettings();
  const { theme: currentTheme, setTheme } = useTheme();
  const [selectedThemeId, setSelectedThemeId] = useState('default');
  
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  
  const [livePrimary, setLivePrimary] = useState('hsl(0, 0%, 0%)');
  const [livePrimaryFg, setLivePrimaryFg] = useState('hsl(0, 0%, 0%)');
  const [liveBackground, setLiveBackground] = useState('hsl(0, 0%, 0%)');
  const [liveForeground, setLiveForeground] = useState('hsl(0, 0%, 0%)');
  const [liveCard, setLiveCard] = useState('hsl(0, 0%, 0%)');
  const [liveCardFg, setLiveCardFg] = useState('hsl(0, 0%, 0%)');
  const [liveSecondary, setLiveSecondary] = useState('hsl(0, 0%, 0%)');
  const [liveSecondaryFg, setLiveSecondaryFg] = useState('hsl(0, 0%, 0%)');
  const [liveAccent, setLiveAccent] = useState('hsl(0, 0%, 0%)');
  const [liveAccentFg, setLiveAccentFg] = useState('hsl(0, 0%, 0%)');
  const [liveDestructive, setLiveDestructive] = useState('hsl(0, 0%, 0%)');
  const [liveDestructiveFg, setLiveDestructiveFg] = useState('hsl(0, 0%, 0%)');
  const [liveRadius, setLiveRadius] = useState(0.5);

  const getCssVariable = useCallback((varName: string) => {
    if (typeof window === 'undefined') return '';
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  }, []);

  const initializeLiveTheme = useCallback(() => {
    setLivePrimary(parseHslString(getCssVariable('--primary')));
    setLivePrimaryFg(parseHslString(getCssVariable('--primary-foreground')));
    setLiveBackground(parseHslString(getCssVariable('--background')));
    setLiveForeground(parseHslString(getCssVariable('--foreground')));
    setLiveCard(parseHslString(getCssVariable('--card')));
    setLiveCardFg(parseHslString(getCssVariable('--card-foreground')));
    setLiveSecondary(parseHslString(getCssVariable('--secondary')));
    setLiveSecondaryFg(parseHslString(getCssVariable('--secondary-foreground')));
    setLiveAccent(parseHslString(getCssVariable('--accent')));
    setLiveAccentFg(parseHslString(getCssVariable('--accent-foreground')));
    setLiveDestructive(parseHslString(getCssVariable('--destructive')));
    setLiveDestructiveFg(parseHslString(getCssVariable('--destructive-foreground')));

    const radiusVar = getCssVariable('--radius');
    setLiveRadius(radiusVar ? parseFloat(radiusVar) : 0.5);
  }, [getCssVariable]);

  useEffect(() => {
    if (siteSettings.activeTheme) {
        setSelectedThemeId(siteSettings.activeTheme);
    }
  }, [siteSettings.activeTheme]);

  useEffect(() => {
    const timer = setTimeout(() => {
        initializeLiveTheme();
    }, 100);
    return () => clearTimeout(timer);
  }, [currentTheme, initializeLiveTheme]);

  const handlePreview = (themeId: string) => {
    setTheme(themeId);
    setSelectedThemeId(themeId);
  };
  
  const handleLiveColorChange = useCallback((varName: string, newColor: string) => {
    const parts = newColor.match(/hsl\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%\)/);
    if(parts) {
      const [, h, s, l] = parts;
      const hslString = `${h} ${s}% ${l}%`;
      document.documentElement.style.setProperty(varName, hslString);
    }

    const stateSetters: Record<string, React.Dispatch<React.SetStateAction<string>>> = {
        '--primary': setLivePrimary,
        '--primary-foreground': setLivePrimaryFg,
        '--background': setLiveBackground,
        '--foreground': setLiveForeground,
        '--card': setLiveCard,
        '--card-foreground': setLiveCardFg,
        '--secondary': setLiveSecondary,
        '--secondary-foreground': setLiveSecondaryFg,
        '--accent': setLiveAccent,
        '--accent-foreground': setLiveAccentFg,
        '--destructive': setLiveDestructive,
        '--destructive-foreground': setLiveDestructiveFg,
    };

    if(stateSetters[varName]) {
        stateSetters[varName](newColor);
    }
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
                    Customize the live theme variables. Changes here are temporary and will reset on page reload.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <Accordion type="multiple" className="w-full space-y-4">
                    <AccordionItem value="general" className="border-b-0">
                        <AccordionTrigger className="text-lg font-medium p-4 bg-muted/30 rounded-lg hover:bg-muted/50 [&[data-state=open]]:rounded-b-none">General</AccordionTrigger>
                        <AccordionContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 border border-t-0 rounded-b-lg">
                           <ColorEditor label="Background" varName="--background" color={liveBackground} onChange={(c) => handleLiveColorChange('--background', c)} onMount={setLiveBackground} />
                           <ColorEditor label="Foreground" varName="--foreground" color={liveForeground} onChange={(c) => handleLiveColorChange('--foreground', c)} onMount={setLiveForeground} />
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="primary" className="border-b-0">
                        <AccordionTrigger className="text-lg font-medium p-4 bg-muted/30 rounded-lg hover:bg-muted/50 [&[data-state=open]]:rounded-b-none">Primary Colors</AccordionTrigger>
                        <AccordionContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 border border-t-0 rounded-b-lg">
                           <ColorEditor label="Primary" varName="--primary" color={livePrimary} onChange={(c) => handleLiveColorChange('--primary', c)} onMount={setLivePrimary} />
                           <ColorEditor label="Primary Foreground" varName="--primary-foreground" color={livePrimaryFg} onChange={(c) => handleLiveColorChange('--primary-foreground', c)} onMount={setLivePrimaryFg} />
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="card" className="border-b-0">
                        <AccordionTrigger className="text-lg font-medium p-4 bg-muted/30 rounded-lg hover:bg-muted/50 [&[data-state=open]]:rounded-b-none">Card Colors</AccordionTrigger>
                        <AccordionContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 border border-t-0 rounded-b-lg">
                           <ColorEditor label="Card" varName="--card" color={liveCard} onChange={(c) => handleLiveColorChange('--card', c)} onMount={setLiveCard} />
                           <ColorEditor label="Card Foreground" varName="--card-foreground" color={liveCardFg} onChange={(c) => handleLiveColorChange('--card-foreground', c)} onMount={setLiveCardFg} />
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="secondary" className="border-b-0">
                        <AccordionTrigger className="text-lg font-medium p-4 bg-muted/30 rounded-lg hover:bg-muted/50 [&[data-state=open]]:rounded-b-none">Secondary Colors</AccordionTrigger>
                        <AccordionContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 border border-t-0 rounded-b-lg">
                           <ColorEditor label="Secondary" varName="--secondary" color={liveSecondary} onChange={(c) => handleLiveColorChange('--secondary', c)} onMount={setLiveSecondary} />
                           <ColorEditor label="Secondary Foreground" varName="--secondary-foreground" color={liveSecondaryFg} onChange={(c) => handleLiveColorChange('--secondary-foreground', c)} onMount={setLiveSecondaryFg} />
                        </AccordionContent>
                    </AccordionItem>
                     <AccordionItem value="accent" className="border-b-0">
                        <AccordionTrigger className="text-lg font-medium p-4 bg-muted/30 rounded-lg hover:bg-muted/50 [&[data-state=open]]:rounded-b-none">Accent Colors</AccordionTrigger>
                        <AccordionContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 border border-t-0 rounded-b-lg">
                           <ColorEditor label="Accent" varName="--accent" color={liveAccent} onChange={(c) => handleLiveColorChange('--accent', c)} onMount={setLiveAccent} />
                           <ColorEditor label="Accent Foreground" varName="--accent-foreground" color={liveAccentFg} onChange={(c) => handleLiveColorChange('--accent-foreground', c)} onMount={setLiveAccentFg} />
                        </AccordionContent>
                    </AccordionItem>
                      <AccordionItem value="destructive" className="border-b-0">
                        <AccordionTrigger className="text-lg font-medium p-4 bg-muted/30 rounded-lg hover:bg-muted/50 [&[data-state=open]]:rounded-b-none">Destructive Colors</AccordionTrigger>
                        <AccordionContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 border border-t-0 rounded-b-lg">
                           <ColorEditor label="Destructive" varName="--destructive" color={liveDestructive} onChange={(c) => handleLiveColorChange('--destructive', c)} onMount={setLiveDestructive} />
                           <ColorEditor label="Destructive Foreground" varName="--destructive-foreground" color={liveDestructiveFg} onChange={(c) => handleLiveColorChange('--destructive-foreground', c)} onMount={setLiveDestructiveFg} />
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
                 
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
