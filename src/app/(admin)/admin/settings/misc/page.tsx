
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getSiteSettings, updateSiteSettings } from '@/lib/mock-data';
import type { SiteSettings, CountryCode } from '@/types';
import { X } from 'lucide-react';

export default function AdminMiscSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const [newCountryCode, setNewCountryCode] = useState<CountryCode>({ name: '', code: '', flag: '' });

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

  const handleCountryCodeChange = (index: number, field: keyof CountryCode, value: string) => {
    if (!settings) return;
    const newCodes = [...settings.countryCodes];
    newCodes[index] = { ...newCodes[index], [field]: value };
    setSettings({ ...settings, countryCodes: newCodes });
  };
  
  const handleAddCountryCode = () => {
    if (!settings || !newCountryCode.name || !newCountryCode.code || !newCountryCode.flag) {
        toast({ variant: 'destructive', title: 'Missing fields', description: 'Please fill out all fields for the new country code.' });
        return;
    }
    const updatedCodes = [...settings.countryCodes, newCountryCode];
    setSettings({ ...settings, countryCodes: updatedCodes });
    setNewCountryCode({ name: '', code: '', flag: '' });
  };

  const handleRemoveCountryCode = (index: number) => {
    if (!settings) return;
    const newCodes = settings.countryCodes.filter((_, i) => i !== index);
    setSettings({ ...settings, countryCodes: newCodes });
  };


  const handleSaveChanges = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      await updateSiteSettings({ countryCodes: settings.countryCodes });
      toast({
        title: 'Settings Saved',
        description: 'Miscellaneous settings have been updated.',
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
        return <Card><CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
    }
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Manage Country Codes</CardTitle>
                    <CardDescription>Add, remove, and manage the country codes available in the user settings dropdown.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-4 gap-2 font-medium text-sm text-muted-foreground px-2">
                        <span>Flag (Emoji)</span>
                        <span>Country Name</span>
                        <span className="col-span-2">Code</span>
                    </div>
                     {settings.countryCodes.map((cc, index) => (
                        <div key={index} className="grid grid-cols-4 gap-2 items-center">
                            <Input value={cc.flag} onChange={(e) => handleCountryCodeChange(index, 'flag', e.target.value)} maxLength={2} />
                            <Input value={cc.name} onChange={(e) => handleCountryCodeChange(index, 'name', e.target.value)} />
                            <Input value={cc.code} onChange={(e) => handleCountryCodeChange(index, 'code', e.target.value)} />
                             <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleRemoveCountryCode(index)}>
                                <X className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    ))}
                    <div className="pt-4 mt-4 border-t">
                        <h4 className="font-medium mb-2">Add New Code</h4>
                         <div className="grid grid-cols-4 gap-2 items-center">
                            <Input placeholder="🇮🇳" value={newCountryCode.flag} onChange={(e) => setNewCountryCode({...newCountryCode, flag: e.target.value})} />
                            <Input placeholder="India" value={newCountryCode.name} onChange={(e) => setNewCountryCode({...newCountryCode, name: e.target.value})} />
                            <Input placeholder="+91" value={newCountryCode.code} onChange={(e) => setNewCountryCode({...newCountryCode, code: e.target.value})} />
                            <Button size="sm" onClick={handleAddCountryCode}><Icons.Add className="mr-2"/>Add</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

             <div className="flex justify-end">
                <Button onClick={handleSaveChanges} disabled={isSaving || loading || !settings} size="lg">
                    {isSaving ? <Icons.AppLogo className="animate-spin mr-2" /> : null}
                    Save All Changes
                </Button>
            </div>
        </div>
    )
  }

  return renderContent();
}
