

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Icons, IconName } from '@/components/icons';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getSiteSettings, updateSiteSettings } from '@/lib/mock-data';
import type { SiteSettings, ExpenseCategory } from '@/types';
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

  const [newCategory, setNewCategory] = useState("");
  const [newKeyword, setNewKeyword] = useState<Record<string, string>>({});
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  const iconNames = Object.keys(Icons).filter(
    (key) => key !== 'AppLogo' && key !== 'Logo' && key !== 'Google' && key !== 'Github' && key !== 'Linkedin' && key !== 'NextJs' && key !== 'ReactLogo' && key !== 'FirebaseLogo' && key !== 'TailwindLogo' && key !== 'ShadcnLogo' && key !== 'FirebaseStudio' && key !== 'GenkitLogo'
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
  
  const handleCategoryDetailChange = (category: string, field: keyof ExpenseCategory, value: any) => {
      if (!settings) return;
      const updatedCategories = { ...settings.expenseCategories };
      updatedCategories[category] = { ...updatedCategories[category], [field]: value };
      setSettings({ ...settings, expenseCategories: updatedCategories });
  };

  const handleAddCategory = () => {
    if (!settings || !newCategory.trim()) return;
    const trimmedName = newCategory.trim();
    if (settings.expenseCategories[trimmedName]) {
      toast({ variant: 'destructive', title: 'Category exists', description: 'This category name already exists.' });
      return;
    }
    const newCategoryData: ExpenseCategory = { icon: 'Wallet', keywords: [] };
    const updatedCategories = { ...settings.expenseCategories, [trimmedName]: newCategoryData };
    setSettings({ ...settings, expenseCategories: updatedCategories });
    setNewCategory("");
  };
  
  const handleDeleteCategory = () => {
    if (!settings || !categoryToDelete) return;
    if (categoryToDelete === 'Other') {
        toast({ variant: 'destructive', title: 'Cannot Delete', description: 'The "Other" category cannot be deleted.' });
        setCategoryToDelete(null);
        return;
    }
    const updatedCategories = { ...settings.expenseCategories };
    delete updatedCategories[categoryToDelete];
    setSettings({ ...settings, expenseCategories: updatedCategories });
    setCategoryToDelete(null);
    toast({ title: 'Category Deleted' });
  };

  const handleAddKeyword = (category: string) => {
    if (!settings || !newKeyword[category]?.trim()) return;
    const keyword = newKeyword[category].trim().toLowerCase();
    const currentKeywords = settings.expenseCategories[category].keywords || [];
    if (currentKeywords.includes(keyword)) {
      toast({ variant: 'destructive', title: 'Keyword exists' });
      return;
    }
    const updatedCategories = { ...settings.expenseCategories };
    updatedCategories[category].keywords = [...currentKeywords, keyword];
    setSettings({ ...settings, expenseCategories: updatedCategories });
    setNewKeyword({ ...newKeyword, [category]: "" });
  };

  const handleRemoveKeyword = (category: string, keyword: string) => {
    if (!settings) return;
    const updatedCategories = { ...settings.expenseCategories };
    updatedCategories[category].keywords = (updatedCategories[category].keywords || []).filter(k => k !== keyword);
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
                    <CardDescription>Add, remove, and manage categories and their auto-detection keywords.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {Object.entries(settings.expenseCategories).map(([category, details]) => {
                        const IconComponent = Icons[details.icon] || Icons.Wallet;
                        return (
                            <div key={category} className="p-4 border rounded-lg space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <Select
                                            value={details.icon}
                                            onValueChange={(value) => handleCategoryDetailChange(category, 'icon', value as IconName)}
                                        >
                                            <SelectTrigger className="w-24 h-10">
                                                <SelectValue asChild>
                                                    <div className="flex items-center gap-2">
                                                        <IconComponent className="h-4 w-4" />
                                                        <span>{details.icon}</span>
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
                                        <h3 className="text-lg font-semibold">{category}</h3>
                                    </div>
                                    {category !== 'Other' && (
                                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => setCategoryToDelete(category)}>
                                            <X className="h-4 w-4 text-destructive" />
                                        </Button>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Keywords</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {(details.keywords || []).map(keyword => (
                                            <Badge key={keyword} variant="secondary" className="text-base font-normal">
                                                {keyword}
                                                <button onClick={() => handleRemoveKeyword(category, keyword)} className="ml-2 rounded-full p-0.5 hover:bg-destructive/50">
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                        {(details.keywords || []).length === 0 && <p className="text-sm text-muted-foreground">No keywords yet.</p>}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Add a keyword..."
                                        value={newKeyword[category] || ""}
                                        onChange={(e) => setNewKeyword({ ...newKeyword, [category]: e.target.value })}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword(category)}
                                    />
                                    <Button size="sm" onClick={() => handleAddKeyword(category)}>Add Keyword</Button>
                                </div>
                            </div>
                        )
                    })}
                </CardContent>
                <CardFooter>
                    <div className="flex gap-2 w-full">
                        <Input
                            placeholder="New category name..."
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                        />
                        <Button onClick={handleAddCategory}>Add Category</Button>
                    </div>
                </CardFooter>
            </Card>

             <div className="flex justify-end">
                <Button onClick={handleSaveChanges} disabled={isSaving || loading || !settings} size="lg">
                    {isSaving ? <Icons.AppLogo className="animate-spin mr-2" /> : null}
                    Save All Changes
                </Button>
            </div>
            
            <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{categoryToDelete}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this category and all its keywords? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
  }

  return renderContent();
}
