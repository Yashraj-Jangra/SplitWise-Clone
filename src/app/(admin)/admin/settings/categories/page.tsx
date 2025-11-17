
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Icons, IconName } from '@/components/icons';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getSiteSettings, updateSiteSettings } from '@/lib/mock-data';
import type { SiteSettings, MasterCategory, SubCategory } from '@/types';
import { X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AdminCategorySettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const [newMasterCategoryName, setNewMasterCategoryName] = useState("");
  const [newSubCategory, setNewSubCategory] = useState<Record<string, string>>({});
  const [newKeyword, setNewKeyword] = useState<Record<string, string>>({});
  
  const [masterCategoryToDelete, setMasterCategoryToDelete] = useState<string | null>(null);
  const [subCategoryToDelete, setSubCategoryToDelete] = useState<{ master: string; sub: string } | null>(null);

  const iconNames = Object.keys(Icons).filter(
    (key) => !['AppLogo', 'Logo', 'Google', 'Github', 'Linkedin', 'NextJs', 'ReactLogo', 'FirebaseLogo', 'TailwindLogo', 'ShadcnLogo', 'FirebaseStudio', 'GenkitLogo'].includes(key)
  ) as IconName[];

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

  const handleSaveChanges = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      await updateSiteSettings({ expenseCategories: settings.expenseCategories });
      toast({
        title: 'Settings Saved',
        description: 'Expense category settings have been updated.',
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

  const handleSubCategoryDetailChange = (master: string, sub: string, field: keyof SubCategory, value: any) => {
    if (!settings) return;
    const updatedCategories = { ...settings.expenseCategories };
    if (updatedCategories[master]) {
      updatedCategories[master].subCategories[sub] = { ...updatedCategories[master].subCategories[sub], [field]: value };
      setSettings({ ...settings, expenseCategories: updatedCategories });
    }
  };
  
  const handleAddMasterCategory = () => {
    if (!settings || !newMasterCategoryName.trim()) return;
    const trimmedName = newMasterCategoryName.trim();
    if (settings.expenseCategories[trimmedName]) {
      toast({ variant: 'destructive', title: 'Category exists', description: 'This master category name already exists.' });
      return;
    }
    const newMasterCategory: MasterCategory = { subCategories: {} };
    const updatedCategories = { ...settings.expenseCategories, [trimmedName]: newMasterCategory };
    setSettings({ ...settings, expenseCategories: updatedCategories });
    setNewMasterCategoryName("");
  };

  const handleDeleteMasterCategory = () => {
    if (!settings || !masterCategoryToDelete) return;
    if (['Uncategorized'].includes(masterCategoryToDelete)) {
        toast({ variant: 'destructive', title: 'Cannot Delete', description: 'This is a default master category and cannot be deleted.' });
        setMasterCategoryToDelete(null);
        return;
    }
    const updatedCategories = { ...settings.expenseCategories };
    delete updatedCategories[masterCategoryToDelete];
    setSettings({ ...settings, expenseCategories: updatedCategories });
    setMasterCategoryToDelete(null);
    toast({ title: 'Master Category Deleted' });
  };
  
  const handleAddSubCategory = (master: string) => {
    if (!settings || !newSubCategory[master]?.trim()) return;
    const subName = newSubCategory[master].trim();
    if (settings.expenseCategories[master].subCategories[subName]) {
        toast({ variant: 'destructive', title: 'Sub-category exists' });
        return;
    }
    const updatedCategories = { ...settings.expenseCategories };
    updatedCategories[master].subCategories[subName] = { icon: 'Wallet', keywords: [] };
    setSettings({ ...settings, expenseCategories: updatedCategories });
    setNewSubCategory({ ...newSubCategory, [master]: "" });
  };
  
  const handleDeleteSubCategory = () => {
      if (!settings || !subCategoryToDelete) return;
      const { master, sub } = subCategoryToDelete;
      if (master === 'Uncategorized' && sub === 'Other') {
        toast({ variant: 'destructive', title: 'Cannot Delete', description: 'The "Other" sub-category cannot be deleted.' });
      } else {
        const updatedCategories = { ...settings.expenseCategories };
        delete updatedCategories[master].subCategories[sub];
        setSettings({ ...settings, expenseCategories: updatedCategories });
        toast({ title: 'Sub-Category Deleted' });
      }
      setSubCategoryToDelete(null);
  };
  

  const handleAddKeyword = (master: string, sub: string) => {
    if (!settings || !newKeyword[`${master}-${sub}`]?.trim()) return;
    const keyword = newKeyword[`${master}-${sub}`].trim().toLowerCase();
    const currentKeywords = settings.expenseCategories[master].subCategories[sub].keywords || [];
    if (currentKeywords.includes(keyword)) {
      toast({ variant: 'destructive', title: 'Keyword exists' });
      return;
    }
    const updatedCategories = { ...settings.expenseCategories };
    updatedCategories[master].subCategories[sub].keywords = [...currentKeywords, keyword];
    setSettings({ ...settings, expenseCategories: updatedCategories });
    setNewKeyword({ ...newKeyword, [`${master}-${sub}`]: "" });
  };

  const handleRemoveKeyword = (master: string, sub: string, keyword: string) => {
    if (!settings) return;
    const updatedCategories = { ...settings.expenseCategories };
    updatedCategories[master].subCategories[sub].keywords = (updatedCategories[master].subCategories[sub].keywords || []).filter(k => k !== keyword);
    setSettings({ ...settings, expenseCategories: updatedCategories });
  };

  const renderContent = () => {
    if (loading || !settings) {
      return <Card><CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Manage Expense Categories</CardTitle>
                    <CardDescription>Group expenses by master and sub-categories. Assign icons and keywords for auto-detection.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="multiple" className="w-full space-y-4">
                        {Object.entries(settings.expenseCategories).map(([masterCat, masterDetails]) => (
                            <AccordionItem value={masterCat} key={masterCat} className="border rounded-lg px-4">
                                <div className="flex items-center">
                                    <AccordionTrigger className="flex-1">
                                        <h3 className="text-xl font-semibold">{masterCat}</h3>
                                    </AccordionTrigger>
                                    {!['Uncategorized'].includes(masterCat) && (
                                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setMasterCategoryToDelete(masterCat) }} className="h-8 w-8 ml-2 hover:bg-destructive/10 text-destructive">
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                                <AccordionContent className="space-y-4 pt-4">
                                     {Object.entries(masterDetails.subCategories || {}).map(([subCat, subDetails]) => {
                                        const IconComponent = Icons[subDetails.icon] || Icons.Wallet;
                                        return (
                                            <div key={subCat} className="p-3 border rounded-lg space-y-3 bg-muted/30">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-4">
                                                        <Select
                                                            value={subDetails.icon}
                                                            onValueChange={(value) => handleSubCategoryDetailChange(masterCat, subCat, 'icon', value as IconName)}
                                                        >
                                                            <SelectTrigger className="w-24 h-10 bg-background">
                                                                <SelectValue>
                                                                    <div className="flex items-center gap-2">
                                                                        <IconComponent className="h-4 w-4" />
                                                                        <span className="truncate">{subDetails.icon}</span>
                                                                    </div>
                                                                </SelectValue>
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {iconNames.map(name => {
                                                                    const Icon = Icons[name];
                                                                    return (
                                                                        <SelectItem key={name} value={name}>
                                                                            <div className="flex items-center gap-2">
                                                                                <Icon className="h-4 w-4" />
                                                                                <span>{name}</span>
                                                                            </div>
                                                                        </SelectItem>
                                                                    )
                                                                })}
                                                            </SelectContent>
                                                        </Select>
                                                        <h4 className="text-md font-semibold">{subCat}</h4>
                                                    </div>
                                                    {!(masterCat === 'Uncategorized' && subCat === 'Other') && (
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => setSubCategoryToDelete({ master: masterCat, sub: subCat })}>
                                                            <X className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs text-muted-foreground">Keywords</Label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {(subDetails.keywords || []).map(keyword => (
                                                            <Badge key={keyword} variant="secondary" className="text-base font-normal">
                                                                {keyword}
                                                                <button onClick={() => handleRemoveKeyword(masterCat, subCat, keyword)} className="ml-2 rounded-full p-0.5 hover:bg-destructive/50">
                                                                    <X className="h-3 w-3" />
                                                                </button>
                                                            </Badge>
                                                        ))}
                                                        {(subDetails.keywords || []).length === 0 && <p className="text-sm text-muted-foreground">No keywords yet.</p>}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Input
                                                        placeholder="Add a keyword..."
                                                        value={newKeyword[`${masterCat}-${subCat}`] || ""}
                                                        onChange={(e) => setNewKeyword({ ...newKeyword, [`${masterCat}-${subCat}`]: e.target.value })}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword(masterCat, subCat)}
                                                        className="bg-background"
                                                    />
                                                    <Button size="sm" onClick={() => handleAddKeyword(masterCat, subCat)}>Add Keyword</Button>
                                                </div>
                                            </div>
                                        )
                                    })}

                                     <div className="pt-4 border-t">
                                        <div className="flex gap-2 w-full">
                                            <Input
                                                placeholder="New sub-category name..."
                                                value={newSubCategory[masterCat] || ""}
                                                onChange={(e) => setNewSubCategory({ ...newSubCategory, [masterCat]: e.target.value })}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddSubCategory(masterCat)}
                                            />
                                            <Button onClick={() => handleAddSubCategory(masterCat)}>Add Sub-Category</Button>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </CardContent>
                <CardFooter className="flex-col items-start gap-4">
                     <div className="pt-4 border-t w-full">
                        <Label>Add New Master Category</Label>
                        <div className="flex gap-2 w-full mt-2">
                            <Input
                                placeholder="e.g., Personal Care, Education"
                                value={newMasterCategoryName}
                                onChange={(e) => setNewMasterCategoryName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddMasterCategory()}
                            />
                            <Button onClick={handleAddMasterCategory}>Add Master Category</Button>
                        </div>
                    </div>
                </CardFooter>
            </Card>

             <div className="flex justify-end">
                <Button onClick={handleSaveChanges} disabled={isSaving || loading || !settings} size="lg">
                    {isSaving ? <Icons.AppLogo className="animate-spin mr-2" /> : null}
                    Save All Changes
                </Button>
            </div>
            
            <AlertDialog open={!!masterCategoryToDelete} onOpenChange={(open) => !open && setMasterCategoryToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{masterCategoryToDelete}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                           This will delete the master category and all sub-categories and keywords within it. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteMasterCategory} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
             <AlertDialog open={!!subCategoryToDelete} onOpenChange={(open) => !open && setSubCategoryToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{subCategoryToDelete?.sub}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                           Are you sure you want to delete this sub-category? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteSubCategory} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
  }

  return renderContent();
}
