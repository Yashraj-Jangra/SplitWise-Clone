
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
import { X, GripVertical } from 'lucide-react';
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
  const [categories, setCategories] = useState<Record<string, MasterCategory> | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const [newMasterCategoryName, setNewMasterCategoryName] = useState("");
  const [newSubCategory, setNewSubCategory] = useState<Record<string, string>>({});
  const [newKeyword, setNewKeyword] = useState<Record<string, string>>({});
  
  const [masterCategoryToDelete, setMasterCategoryToDelete] = useState<string | null>(null);
  const [subCategoryToDelete, setSubCategoryToDelete] = useState<{ master: string; sub: string } | null>(null);

  const [editingMaster, setEditingMaster] = useState<string | null>(null);
  const [editingMasterName, setEditingMasterName] = useState('');
  const [editingSub, setEditingSub] = useState<{ master: string, sub: string } | null>(null);
  const [editingSubName, setEditingSubName] = useState('');

  const iconNames = Object.keys(Icons).filter(
    (key) => !['AppLogo', 'Logo', 'Google', 'Github', 'Linkedin', 'NextJs', 'ReactLogo', 'FirebaseLogo', 'TailwindLogo', 'ShadcnLogo', 'FirebaseStudio', 'GenkitLogo'].includes(key)
  ) as IconName[];

  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      try {
        // getSiteSettings now fetches categories correctly, so we can just extract them.
        const siteSettings = await getSiteSettings();
        setCategories(siteSettings.expenseCategories);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load expense categories.' });
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, [toast]);
  
  const handleSaveChanges = async () => {
    if (!categories) return;
    setIsSaving(true);
    try {
      // Use updateSiteSettings, which now correctly handles separate category updates.
      await updateSiteSettings({ expenseCategories: categories });
      toast({
        title: 'Categories Saved',
        description: 'Your expense category settings have been updated.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save the category settings.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubCategoryDetailChange = (master: string, sub: string, field: keyof SubCategory, value: any) => {
    if (!categories) return;
    const updatedCategories = { ...categories };
    if (updatedCategories[master]) {
      updatedCategories[master].subCategories[sub] = { ...updatedCategories[master].subCategories[sub], [field]: value };
      setCategories(updatedCategories);
    }
  };
  
  const handleAddMasterCategory = () => {
    if (!categories || !newMasterCategoryName.trim()) return;
    const trimmedName = newMasterCategoryName.trim();
    if (categories[trimmedName]) {
      toast({ variant: 'destructive', title: 'Category exists', description: 'This master category name already exists.' });
      return;
    }
    const newMasterCategory: MasterCategory = { subCategories: {} };
    const updatedCategories = { ...categories, [trimmedName]: newMasterCategory };
    setCategories(updatedCategories);
    setNewMasterCategoryName("");
  };

  const handleDeleteMasterCategory = () => {
    if (!categories || !masterCategoryToDelete) return;
    if (['Uncategorized'].includes(masterCategoryToDelete)) {
        toast({ variant: 'destructive', title: 'Cannot Delete', description: 'This is a default master category and cannot be deleted.' });
        setMasterCategoryToDelete(null);
        return;
    }
    const updatedCategories = { ...categories };
    delete updatedCategories[masterCategoryToDelete];
    setCategories(updatedCategories);
    setMasterCategoryToDelete(null);
    toast({ title: 'Master Category Deleted' });
  };
  
  const handleAddSubCategory = (master: string) => {
    if (!categories || !newSubCategory[master]?.trim()) return;
    const subName = newSubCategory[master].trim();
    
    const updatedCategories = { ...categories };
    
    if (!updatedCategories[master].subCategories) {
        updatedCategories[master].subCategories = {};
    }

    if (updatedCategories[master].subCategories[subName]) {
        toast({ variant: 'destructive', title: 'Sub-category exists' });
        return;
    }
    
    updatedCategories[master].subCategories[subName] = { icon: 'Wallet', keywords: [] };
    setCategories(updatedCategories);
    setNewSubCategory({ ...newSubCategory, [master]: "" });
  };
  
  const handleDeleteSubCategory = () => {
      if (!categories || !subCategoryToDelete) return;
      const { master, sub } = subCategoryToDelete;
      if (master === 'Uncategorized' && sub === 'Other') {
        toast({ variant: 'destructive', title: 'Cannot Delete', description: 'The "Other" sub-category cannot be deleted.' });
      } else {
        const updatedCategories = { ...categories };
        delete updatedCategories[master].subCategories[sub];
        setCategories(updatedCategories);
        toast({ title: 'Sub-Category Deleted' });
      }
      setSubCategoryToDelete(null);
  };

  const handleAddKeyword = (master: string, sub: string) => {
    if (!categories || !newKeyword[`${master}-${sub}`]?.trim()) return;

    const currentKeywords = new Set(categories[master].subCategories[sub].keywords || []);
    const inputKeywords = newKeyword[`${master}-${sub}`]
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length > 0);
    
    let addedCount = 0;
    inputKeywords.forEach(keyword => {
        if (!currentKeywords.has(keyword)) {
            currentKeywords.add(keyword);
            addedCount++;
        }
    });

    if (addedCount > 0) {
        const updatedCategories = { ...categories };
        updatedCategories[master].subCategories[sub].keywords = Array.from(currentKeywords);
        setCategories(updatedCategories);
        toast({
            title: `${addedCount} keyword${addedCount > 1 ? 's' : ''} added.`,
        });
    } else {
        toast({
            variant: 'destructive',
            title: 'No new keywords',
            description: 'The keywords entered already exist or were empty.'
        });
    }

    setNewKeyword({ ...newKeyword, [`${master}-${sub}`]: "" });
  };

  const handleRemoveKeyword = (master: string, sub: string, keyword: string) => {
    if (!categories) return;
    const updatedCategories = { ...categories };
    updatedCategories[master].subCategories[sub].keywords = (updatedCategories[master].subCategories[sub].keywords || []).filter(k => k !== keyword);
    setCategories(updatedCategories);
  };

  const handleStartRenameMaster = (name: string) => {
    setEditingMaster(name);
    setEditingMasterName(name);
  };

  const handleCancelRenameMaster = () => {
    setEditingMaster(null);
    setEditingMasterName('');
  };

  const handleConfirmRenameMaster = () => {
    if (!categories || !editingMaster || !editingMasterName.trim() || editingMasterName === editingMaster) {
      handleCancelRenameMaster();
      return;
    }

    if (Object.keys(categories).includes(editingMasterName)) {
      toast({ variant: 'destructive', title: 'Name already exists' });
      return;
    }

    const entries = Object.entries(categories);
    const index = entries.findIndex(([key]) => key === editingMaster);
    if (index === -1) return;

    const newEntries = [...entries];
    newEntries[index] = [editingMasterName, newEntries[index][1]];

    const newCategories = Object.fromEntries(newEntries);
    setCategories(newCategories);
    handleCancelRenameMaster();
  };

  const handleStartRenameSub = (master: string, sub: string) => {
    setEditingSub({ master, sub });
    setEditingSubName(sub);
  };

  const handleCancelRenameSub = () => {
    setEditingSub(null);
    setEditingSubName('');
  };

  const handleConfirmRenameSub = () => {
    if (!categories || !editingSub || !editingSubName.trim() || editingSubName === editingSub.sub) {
      handleCancelRenameSub();
      return;
    }
    const { master, sub } = editingSub;
    if (Object.keys(categories[master].subCategories).includes(editingSubName)) {
      toast({ variant: 'destructive', title: 'Name already exists' });
      return;
    }

    const subCategoryData = categories[master].subCategories[sub];
    delete categories[master].subCategories[sub];
    categories[master].subCategories[editingSubName] = subCategoryData;

    setCategories({ ...categories });
    handleCancelRenameSub();
  };

  const renderContent = () => {
    if (loading || !categories) {
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
                        {Object.entries(categories).map(([masterCat, masterDetails]) => {
                            if (!masterDetails) return null;
                            const isEditingThisMaster = editingMaster === masterCat;
                            return (
                            <AccordionItem value={masterCat} key={masterCat} className="border rounded-lg px-4">
                                <div className="flex items-center group">
                                     <GripVertical className="h-5 w-5 text-muted-foreground/50 mr-2 cursor-grab group-hover:text-muted-foreground transition-colors" />
                                    <AccordionTrigger className="flex-1">
                                        {isEditingThisMaster ? (
                                            <div className="flex items-center gap-2">
                                                <Input value={editingMasterName} onChange={(e) => setEditingMasterName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleConfirmRenameMaster()} autoFocus onBlur={handleConfirmRenameMaster} />
                                            </div>
                                        ) : (
                                            <h3 className="text-xl font-semibold">{masterCat}</h3>
                                        )}
                                    </AccordionTrigger>
                                    {!['Uncategorized'].includes(masterCat) && (
                                        <div className="flex items-center">
                                            {isEditingThisMaster ? (
                                                <>
                                                    <Button variant="ghost" size="icon" onClick={handleConfirmRenameMaster} className="h-8 w-8 ml-2 text-green-500 hover:text-green-600"><Icons.Check className="h-5 w-5"/></Button>
                                                    <Button variant="ghost" size="icon" onClick={handleCancelRenameMaster} className="h-8 w-8 text-destructive hover:text-destructive-foreground/90"><Icons.Close className="h-5 w-5"/></Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button variant="ghost" size="icon" onClick={() => handleStartRenameMaster(masterCat)} className="h-8 w-8 ml-2 opacity-0 group-hover:opacity-100"><Icons.Edit className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setMasterCategoryToDelete(masterCat) }} className="h-8 w-8 ml-2 hover:bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100">
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <AccordionContent className="space-y-4 pt-4">
                                     {masterDetails.subCategories && Object.entries(masterDetails.subCategories).map(([subCat, subDetails]) => {
                                        const IconComponent = Icons[subDetails.icon] || Icons.Wallet;
                                        const isEditingThisSub = editingSub?.master === masterCat && editingSub?.sub === subCat;
                                        return (
                                            <div key={subCat} className="p-3 border rounded-lg space-y-3 bg-muted/30 group">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-4">
                                                         <GripVertical className="h-5 w-5 text-muted-foreground/30 cursor-grab group-hover:text-muted-foreground transition-colors" />
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
                                                        {isEditingThisSub ? (
                                                          <Input value={editingSubName} onChange={(e) => setEditingSubName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleConfirmRenameSub()} autoFocus onBlur={handleConfirmRenameSub} />
                                                        ) : (
                                                          <h4 className="text-md font-semibold">{subCat}</h4>
                                                        )}
                                                    </div>
                                                    {!(masterCat === 'Uncategorized' && subCat === 'Other') && (
                                                        <div className="flex items-center">
                                                          {isEditingThisSub ? (
                                                              <>
                                                                  <Button variant="ghost" size="icon" onClick={handleConfirmRenameSub} className="h-7 w-7 text-green-500 hover:text-green-600"><Icons.Check className="h-4 w-4"/></Button>
                                                                  <Button variant="ghost" size="icon" onClick={handleCancelRenameSub} className="h-7 w-7 text-destructive hover:text-destructive-foreground/90"><Icons.Close className="h-4 w-4"/></Button>
                                                              </>
                                                          ) : (
                                                              <>
                                                                  <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 opacity-0 group-hover:opacity-100" onClick={() => handleStartRenameSub(masterCat, subCat)}>
                                                                    <Icons.Edit className="h-4 w-4"/>
                                                                  </Button>
                                                                  <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 opacity-0 group-hover:opacity-100" onClick={() => setSubCategoryToDelete({ master: masterCat, sub: subCat })}>
                                                                      <X className="h-4 w-4 text-destructive" />
                                                                  </Button>
                                                              </>
                                                          )}
                                                        </div>
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
                                                        placeholder="Add keywords, comma-separated..."
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
                        )})}
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
                <Button onClick={handleSaveChanges} disabled={isSaving || loading || !categories} size="lg">
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
                        <AlertDialogAction onClick={handleDeleteMasterCategory} variant="destructive">Delete</AlertDialogAction>
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
                        <AlertDialogAction onClick={handleDeleteSubCategory} variant="destructive">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
  }

  return renderContent();
}
