

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
import type { SiteSettings, PolicySection, TeamMember } from '@/types';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newCoverImageUrl, setNewCoverImageUrl] = useState('');
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

  const handleValueChange = <T extends keyof SiteSettings>(key: T, value: SiteSettings[T]) => {
      if (!settings) return;
      setSettings({ ...settings, [key]: value });
  };

  const handleLandingPageChange = (field: string, value: string) => {
    if (!settings) return;
    setSettings(prev => prev ? ({ ...prev, landingPage: { ...prev.landingPage!, [field]: value }}) : null);
  }
  
   const handleAuthPageChange = (field: string, value: string) => {
      if (!settings) return;
      setSettings(prev => prev ? ({ ...prev, authPage: { ...prev.authPage!, [field]: value }}) : null);
  }

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

    const handleAboutChange = (field: keyof SiteSettings['about'], value: string) => {
        if (!settings) return;
        setSettings(prev => prev ? ({ ...prev, about: { ...prev.about!, [field]: value }}) : null);
    }
    
    const handleTeamMemberChange = (index: number, field: keyof TeamMember, value: string) => {
        if (!settings?.about?.team) return;
        const newTeam = [...settings.about.team];
        newTeam[index] = { ...newTeam[index], [field]: value };
        handleAboutChange('team', newTeam as any); 
    };

    const addTeamMember = () => {
        if (!settings?.about) return;
        const newMember: TeamMember = {
            id: `tm-${Date.now()}`,
            name: 'New Member',
            title: 'Role',
            bio: '',
            avatarUrl: 'https://placehold.co/100x100.png',
            githubUrl: '',
            linkedinUrl: '',
            portfolioUrl: '',
        };
        const newTeam = [...settings.about.team, newMember];
        handleAboutChange('team', newTeam as any);
    };

    const removeTeamMember = (index: number) => {
        if (!settings?.about?.team) return;
        const newTeam = settings.about.team.filter((_, i) => i !== index);
        handleAboutChange('team', newTeam as any);
    };
  
  const handlePolicyChange = (
    policy: 'privacyPolicy' | 'termsAndConditions',
    index: number,
    field: 'title' | 'content',
    value: string
  ) => {
    if (!settings) return;
    setSettings(prev => {
        if (!prev) return null;
        const newPolicyData = { ...prev[policy]! };
        const newSections = [...newPolicyData.sections];
        if (index === -1) { // -1 is a sentinel for the main title
            newPolicyData.title = value;
        } else {
            newSections[index] = { ...newSections[index], [field]: value };
            newPolicyData.sections = newSections;
        }
        return { ...prev, [policy]: newPolicyData };
    });
  };

  const addPolicySection = (policy: 'privacyPolicy' | 'termsAndConditions') => {
    if (!settings) return;
    setSettings(prev => {
        if (!prev) return null;
        const newPolicyData = { ...prev[policy]! };
        const newSections = [
            ...newPolicyData.sections,
            { id: `new-${Date.now()}`, title: 'New Section', content: '' }
        ];
        newPolicyData.sections = newSections;
        return { ...prev, [policy]: newPolicyData };
    });
  };

  const removePolicySection = (policy: 'privacyPolicy' | 'termsAndConditions', index: number) => {
    if (!settings) return;
    setSettings(prev => {
        if (!prev) return null;
        const newPolicyData = { ...prev[policy]! };
        const newSections = newPolicyData.sections.filter((_, i) => i !== index);
        newPolicyData.sections = newSections;
        return { ...prev, [policy]: newPolicyData };
    });
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
        <Card id="branding" className="scroll-mt-24">
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
            </CardContent>
        </Card>
        
        <Card id="landing-page" className="scroll-mt-24">
            <CardHeader>
                <CardTitle>Landing Page</CardTitle>
                <CardDescription>Customize the content on the public landing page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
            </CardContent>
        </Card>

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
            </CardContent>
        </Card>
        
        <Card id="landing-images" className="scroll-mt-24">
            <CardHeader>
            <CardTitle>Landing Page Backgrounds</CardTitle>
            <CardDescription>Manage the background images for the public home page. One will be chosen randomly on each visit.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="space-y-6">
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
                        <CardTitle>Add New Landing Image</CardTitle>
                        <CardDescription>Add a new image by pasting a URL.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                        <Input
                            placeholder="https://example.com/image.png"
                            value={newLandingImageUrl}
                            onChange={(e) => setNewLandingImageUrl(e.target.value)}
                        />
                        <Button onClick={handleAddLandingImage}>Add by URL</Button>
                        </div>
                    </CardContent>
                    </Card>
                </div>
            </CardContent>
        </Card>

        <Card id="cover-images" className="scroll-mt-24">
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
        
        <Card id="about-settings" className="scroll-mt-24">
            <CardHeader>
                <CardTitle>About Page Settings</CardTitle>
                <CardDescription>Customize the content of the "About Us" page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="aboutTitle">Page Title</Label>
                    <Input id="aboutTitle" value={settings.about?.title || ''} onChange={(e) => handleAboutChange('title', e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="aboutSubtitle">Page Subtitle</Label>
                    <Input id="aboutSubtitle" value={settings.about?.subtitle || ''} onChange={(e) => handleAboutChange('subtitle', e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="aboutContent">Main Content</Label>
                    <Textarea id="aboutContent" value={settings.about?.mainContent || ''} onChange={(e) => handleAboutChange('mainContent', e.target.value)} rows={5} />
                </div>
                
                <Separator />
                <h3 className="text-lg font-medium">Meet the Team</h3>
                <div className="space-y-6">
                    {settings.about?.team.map((member, index) => (
                        <div key={member.id} className="p-4 border rounded-lg relative space-y-4 bg-muted/20">
                            <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => removeTeamMember(index)}>
                                <X className="h-4 w-4 text-destructive" />
                                <span className="sr-only">Remove Member</span>
                            </Button>
                            
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="space-y-2 sm:w-1/3">
                                    <Label htmlFor={`team-avatar-${index}`}>Avatar URL</Label>
                                    <Input id={`team-avatar-${index}`} value={member.avatarUrl || ''} onChange={(e) => handleTeamMemberChange(index, 'avatarUrl', e.target.value)} />
                                    <Avatar className="h-20 w-20 mt-2">
                                        <AvatarImage src={member.avatarUrl} alt={member.name} />
                                        <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                                    </Avatar>
                                </div>
                                <div className="space-y-4 sm:w-2/3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor={`team-name-${index}`}>Name</Label>
                                            <Input id={`team-name-${index}`} value={member.name} onChange={(e) => handleTeamMemberChange(index, 'name', e.target.value)} />
                                        </div>
                                         <div className="space-y-2">
                                            <Label htmlFor={`team-title-${index}`}>Title</Label>
                                            <Input id={`team-title-${index}`} value={member.title} onChange={(e) => handleTeamMemberChange(index, 'title', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor={`team-bio-${index}`}>Bio</Label>
                                        <Textarea id={`team-bio-${index}`} value={member.bio} onChange={(e) => handleTeamMemberChange(index, 'bio', e.target.value)} rows={3}/>
                                    </div>
                                </div>
                            </div>

                            <Separator />
                             <h4 className="text-sm font-medium">Social Links</h4>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor={`team-github-${index}`}>GitHub URL</Label>
                                    <Input id={`team-github-${index}`} value={member.githubUrl || ''} onChange={(e) => handleTeamMemberChange(index, 'githubUrl', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor={`team-linkedin-${index}`}>LinkedIn URL</Label>
                                    <Input id={`team-linkedin-${index}`} value={member.linkedinUrl || ''} onChange={(e) => handleTeamMemberChange(index, 'linkedinUrl', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor={`team-portfolio-${index}`}>Portfolio URL</Label>
                                    <Input id={`team-portfolio-${index}`} value={member.portfolioUrl || ''} onChange={(e) => handleTeamMemberChange(index, 'portfolioUrl', e.target.value)} />
                                </div>
                             </div>
                        </div>
                    ))}
                </div>
                <Button variant="secondary" onClick={addTeamMember}>
                    <Icons.Add className="mr-2" /> Add Team Member
                </Button>
            </CardContent>
        </Card>

        <Card id="privacy-settings" className="scroll-mt-24">
          <CardHeader>
            <CardTitle>Privacy Policy Settings</CardTitle>
            <CardDescription>Customize the content of the "Privacy Policy" page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
                <Label>Page Title</Label>
                <Input value={settings.privacyPolicy?.title || ''} onChange={(e) => handlePolicyChange('privacyPolicy', -1, 'title', e.target.value)} />
            </div>
            {settings.privacyPolicy?.sections.map((section, index) => (
                <div key={section.id} className="space-y-3 p-4 border rounded-md relative">
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => removePolicySection('privacyPolicy', index)}>
                        <X className="h-4 w-4 text-destructive" />
                    </Button>
                    <div className="space-y-2">
                        <Label>Section Title</Label>
                        <Input value={section.title} onChange={(e) => handlePolicyChange('privacyPolicy', index, 'title', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Section Content</Label>
                        <Textarea value={section.content} onChange={(e) => handlePolicyChange('privacyPolicy', index, 'content', e.target.value)} rows={5} />
                    </div>
                </div>
            ))}
          </CardContent>
          <CardFooter>
             <Button variant="secondary" onClick={() => addPolicySection('privacyPolicy')}>
                <Icons.Add className="mr-2" /> Add Section
            </Button>
          </CardFooter>
        </Card>

        <Card id="terms-settings" className="scroll-mt-24">
          <CardHeader>
            <CardTitle>Terms & Conditions Settings</CardTitle>
            <CardDescription>Customize the content of the "Terms & Conditions" page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="space-y-2">
                <Label>Page Title</Label>
                <Input value={settings.termsAndConditions?.title || ''} onChange={(e) => handlePolicyChange('termsAndConditions', -1, 'title', e.target.value)} />
            </div>
            {settings.termsAndConditions?.sections.map((section, index) => (
                <div key={section.id} className="space-y-3 p-4 border rounded-md relative">
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => removePolicySection('termsAndConditions', index)}>
                        <X className="h-4 w-4 text-destructive" />
                    </Button>
                    <div className="space-y-2">
                        <Label>Section Title</Label>
                        <Input value={section.title} onChange={(e) => handlePolicyChange('termsAndConditions', index, 'title', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Section Content</Label>
                        <Textarea value={section.content} onChange={(e) => handlePolicyChange('termsAndConditions', index, 'content', e.target.value)} rows={5} />
                    </div>
                </div>
            ))}
          </CardContent>
           <CardFooter>
             <Button variant="secondary" onClick={() => addPolicySection('termsAndConditions')}>
                <Icons.Add className="mr-2" /> Add Section
            </Button>
          </CardFooter>
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
