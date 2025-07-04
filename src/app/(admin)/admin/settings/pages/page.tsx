
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
import type { SiteSettings, TeamMember } from '@/types';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

export default function AdminContentPagesPage() {
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
  
  const handleAboutChange = (field: keyof SiteSettings['about'], value: any) => {
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

  const handleNotFoundPageChange = (field: string, value: string) => {
    if (!settings) return;
    setSettings(prev => prev ? ({ ...prev, notFoundPage: { ...prev.notFoundPage!, [field]: value }}) : null);
  }

  const handleSaveChanges = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      await updateSiteSettings({
          about: settings.about,
          privacyPolicy: settings.privacyPolicy,
          termsAndConditions: settings.termsAndConditions,
          notFoundPage: settings.notFoundPage,
      });
      toast({
        title: 'Settings Saved',
        description: 'Content page settings have been updated.',
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
          <Card><CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
        </div>
      );
    }

    return (
     <div className="space-y-6">
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
        
        <Card id="404-settings" className="scroll-mt-24">
            <CardHeader>
                <CardTitle>404 "Not Found" Page</CardTitle>
                <CardDescription>Customize the content of your 404 error page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="404Title">Page Title</Label>
                    <Input id="404Title" value={settings.notFoundPage?.title || ''} onChange={(e) => handleNotFoundPageChange('title', e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="404Subtitle">Page Subtitle</Label>
                    <Textarea id="404Subtitle" value={settings.notFoundPage?.subtitle || ''} onChange={(e) => handleNotFoundPageChange('subtitle', e.target.value)} rows={3} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="404Button">Button Text</Label>
                    <Input id="404Button" value={settings.notFoundPage?.buttonText || ''} onChange={(e) => handleNotFoundPageChange('buttonText', e.target.value)} />
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
  };
  
  return renderContent();
}
