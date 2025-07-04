
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Icons, IconName } from '@/components/icons';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getSiteSettings, updateSiteSettings } from '@/lib/mock-data';
import { X } from 'lucide-react';
import Image from 'next/image';
import type { SiteSettings, LandingPageFeature, LandingPageStep } from '@/types';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

export default function AdminLandingSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newLandingImageUrl, setNewLandingImageUrl] = useState('');

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

  const handleLandingPageChange = (field: string, value: any) => {
    if (!settings) return;
    setSettings(prev => prev ? ({ ...prev, landingPage: { ...prev.landingPage!, [field]: value }}) : null);
  }
  
  const handleLandingImageChange = (index: number, value: string) => {
    if (!settings) return;
    const newImages = [...settings.landingImages];
    newImages[index] = value;
    setSettings({ ...settings, landingImages: newImages });
  };
  
  const handleRemoveLandingImage = (index: number) => {
    if (!settings) return;
    const newImages = settings.landingImages.filter((_, i) => i !== index);
    setSettings({ ...settings, landingImages: newImages });
  };

  const handleAddLandingImage = () => {
    if (!settings) return;
    if (newLandingImageUrl && !settings.landingImages.includes(newLandingImageUrl)) {
      setSettings({ ...settings, landingImages: [...settings.landingImages, newLandingImageUrl] });
      setNewLandingImageUrl('');
    } else {
      toast({
        variant: 'destructive',
        title: 'Invalid URL',
        description: 'Please enter a valid and unique image URL.',
      });
    }
  };

  const handleLandingFeatureChange = (index: number, field: keyof LandingPageFeature, value: string) => {
      if (!settings?.landingPage) return;
      const newFeatures = [...settings.landingPage.features];
      newFeatures[index] = { ...newFeatures[index], [field]: value };
      handleLandingPageChange('features', newFeatures);
  };

  const addLandingFeature = () => {
      if (!settings?.landingPage) return;
      const newFeature: LandingPageFeature = {
          icon: 'Wallet',
          title: 'New Feature',
          description: 'A description for the new feature.',
      };
      const newFeatures = [...settings.landingPage.features, newFeature];
      handleLandingPageChange('features', newFeatures);
  };

  const removeLandingFeature = (index: number) => {
      if (!settings?.landingPage) return;
      const newFeatures = settings.landingPage.features.filter((_, i) => i !== index);
      handleLandingPageChange('features', newFeatures);
  };

  const handleLandingStepChange = (index: number, field: keyof LandingPageStep, value: string) => {
      if (!settings?.landingPage) return;
      const newSteps = [...settings.landingPage.howItWorksSteps];
      newSteps[index] = { ...newSteps[index], [field]: value };
      handleLandingPageChange('howItWorksSteps', newSteps);
  };

  const addLandingStep = () => {
      if (!settings?.landingPage) return;
      const newStep: LandingPageStep = {
          title: 'New Step',
          description: 'A description for the new step.',
      };
      const newSteps = [...settings.landingPage.howItWorksSteps, newStep];
      handleLandingPageChange('howItWorksSteps', newSteps);
  };

  const removeLandingStep = (index: number) => {
      if (!settings?.landingPage) return;
      const newSteps = settings.landingPage.howItWorksSteps.filter((_, i) => i !== index);
      handleLandingPageChange('howItWorksSteps', newSteps);
  };

  const handleSaveChanges = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      await updateSiteSettings({
          landingPage: settings.landingPage,
          landingImages: settings.landingImages,
      });
      toast({
        title: 'Settings Saved',
        description: 'Landing page settings have been updated.',
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
    if (loading || !settings?.landingPage) {
        return (
             <Card>
                <CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-48 w-full" />
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <Card id="landing-page" className="scroll-mt-24">
                <CardHeader>
                    <CardTitle>Landing Page Content</CardTitle>
                    <CardDescription>Customize the content on the public landing page. Use {'{appName}'} to insert your app name.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <h4 className="text-md font-medium text-primary">Hero Section</h4>
                    <div className="space-y-2">
                        <Label htmlFor="landingHeadline">Headline</Label>
                        <Input id="landingHeadline" value={settings.landingPage?.headline || ''} onChange={(e) => handleLandingPageChange('headline', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="landingSubheadline">Sub-headline</Label>
                        <Textarea id="landingSubheadline" value={settings.landingPage?.subheadline || ''} onChange={(e) => handleLandingPageChange('subheadline', e.target.value)} rows={3} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="landingCta">CTA Button Text</Label>
                        <Input id="landingCta" value={settings.landingPage?.ctaButtonText || ''} onChange={(e) => handleLandingPageChange('ctaButtonText', e.target.value)} />
                    </div>

                    <Separator />
                    <h4 className="text-md font-medium text-primary">Hero Background Images</h4>
                    <div className="space-y-6">
                        <p className="text-sm text-muted-foreground">Manage the background images for the public landing page hero section. A random image is chosen on each visit.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {settings.landingImages.map((url, index) => (
                            <div key={index} className="relative group space-y-2">
                            <div className="relative aspect-video w-full overflow-hidden rounded-md">
                                <Image src={url} alt={`Landing Image ${index + 1}`} fill className="object-cover" />
                                <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleRemoveLandingImage(index)}
                                >
                                <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <Input
                                value={url}
                                onChange={(e) => handleLandingImageChange(index, e.target.value)}
                                placeholder="Image URL"
                            />
                            </div>
                        ))}
                        </div>
                        <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Add New Background Image</CardTitle>
                            <CardDescription className="text-sm">Add a new image by pasting a publicly accessible URL.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2">
                            <Input
                                placeholder="https://images.unsplash.com/..."
                                value={newLandingImageUrl}
                                onChange={(e) => setNewLandingImageUrl(e.target.value)}
                            />
                            <Button onClick={handleAddLandingImage}>Add Image</Button>
                            </div>
                        </CardContent>
                        </Card>
                    </div>


                    <Separator />
                    <h4 className="text-md font-medium text-primary">Features Section</h4>
                    <div className="space-y-2">
                        <Label htmlFor="featuresTitle">Features Title</Label>
                        <Input id="featuresTitle" value={settings.landingPage?.featuresTitle || ''} onChange={(e) => handleLandingPageChange('featuresTitle', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="featuresSubtitle">Features Subtitle</Label>
                        <Input id="featuresSubtitle" value={settings.landingPage?.featuresSubtitle || ''} onChange={(e) => handleLandingPageChange('featuresSubtitle', e.target.value)} />
                    </div>
                    <div className="space-y-4">
                        {settings.landingPage?.features.map((feature, index) => (
                            <div key={index} className="p-4 border rounded-lg relative space-y-4 bg-muted/20">
                                <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => removeLandingFeature(index)}>
                                    <X className="h-4 w-4 text-destructive" /><span className="sr-only">Remove Feature</span>
                                </Button>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Icon Name</Label>
                                        <Input value={feature.icon} onChange={(e) => handleLandingFeatureChange(index, 'icon', e.target.value as IconName)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Title</Label>
                                        <Input value={feature.title} onChange={(e) => handleLandingFeatureChange(index, 'title', e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Textarea value={feature.description} onChange={(e) => handleLandingFeatureChange(index, 'description', e.target.value)} rows={2} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <Button variant="outline" size="sm" onClick={addLandingFeature}><Icons.Add className="mr-2"/>Add Feature</Button>

                    <Separator />
                    <h4 className="text-md font-medium text-primary">"How It Works" Section</h4>
                    <div className="space-y-2">
                        <Label>Title</Label>
                        <Input value={settings.landingPage?.howItWorksTitle || ''} onChange={(e) => handleLandingPageChange('howItWorksTitle', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Subtitle</Label>
                        <Input value={settings.landingPage?.howItWorksSubtitle || ''} onChange={(e) => handleLandingPageChange('howItWorksSubtitle', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Image URL</Label>
                        <Input value={settings.landingPage?.howItWorksImageUrl || ''} onChange={(e) => handleLandingPageChange('howItWorksImageUrl', e.target.value)} />
                    </div>
                    <div className="space-y-4">
                        {settings.landingPage?.howItWorksSteps.map((step, index) => (
                            <div key={index} className="p-4 border rounded-lg relative space-y-4 bg-muted/20">
                                <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => removeLandingStep(index)}>
                                    <X className="h-4 w-4 text-destructive" /><span className="sr-only">Remove Step</span>
                                </Button>
                                <div className="space-y-2">
                                    <Label>Step Title</Label>
                                    <Input value={step.title} onChange={(e) => handleLandingStepChange(index, 'title', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Step Description</Label>
                                    <Textarea value={step.description} onChange={(e) => handleLandingStepChange(index, 'description', e.target.value)} rows={2}/>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Button variant="outline" size="sm" onClick={addLandingStep}><Icons.Add className="mr-2"/>Add Step</Button>

                    <Separator />
                    <h4 className="text-md font-medium text-primary">Final CTA Section</h4>
                    <div className="space-y-2">
                        <Label>Title</Label>
                        <Input value={settings.landingPage?.finalCtaTitle || ''} onChange={(e) => handleLandingPageChange('finalCtaTitle', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Subtitle</Label>
                        <Input value={settings.landingPage?.finalCtaSubtitle || ''} onChange={(e) => handleLandingPageChange('finalCtaSubtitle', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Button Text</Label>
                        <Input value={settings.landingPage?.finalCtaButtonText || ''} onChange={(e) => handleLandingPageChange('finalCtaButtonText', e.target.value)} />
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
    );
  }

  return renderContent();
}
