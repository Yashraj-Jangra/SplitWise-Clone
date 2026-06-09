

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Icons, IconName } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { updateSiteSettings } from '@/lib/mock-data';
import { useSiteSettings } from '@/contexts/site-settings-context';
import { useTheme } from '@/contexts/theme-context';
import { BASE_THEMES } from '@/themes';
import { cn } from '@/lib/utils';
import { Check, CheckCircle2, Edit, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { ColorPicker } from '@/components/ui/color-picker';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Theme, ThemeColors, ThemeRadii } from '@/types';
import { Switch } from '@/components/ui/switch';
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
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';


// --- Helper Functions and Components ---

function getCssVariable(varName: string): string {
    if (typeof window === 'undefined') return 'hsl(0, 0%, 0%)';
    const hslString = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (!hslString) return 'hsl(0, 0%, 0%)';
    const parts = hslString.match(/([\d.]+)/g);
    if (!parts || parts.length < 3) return 'hsl(0, 0%, 0%)';
    return `hsl(${parts[0]}, ${parts[1]}%, ${parts[2]}%)`;
}

function getCssVariableAsNumber(varName: string): number {
    if (typeof window === 'undefined') return 0.5;
    const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return val ? parseFloat(val) : 0.5;
}

const themeSchema = z.object({
  name: z.string().min(1, 'Theme name is required'),
  templateThemeId: z.string()
});
type ThemeFormValues = z.infer<typeof themeSchema>;

const createInitialThemeData = (name: string, templateTheme: Theme): Theme => {
  const newId = name.toLowerCase().replace(/\s+/g, '-');
  const copiedTheme: Theme = JSON.parse(JSON.stringify(templateTheme));

  copiedTheme.id = newId;
  copiedTheme.name = name;
  copiedTheme.isCustom = true;
  
  return copiedTheme;
};

// --- Main Component ---

export default function AdminThemeSettingsPage() {
  const { settings: siteSettings, loading: siteSettingsLoading, updateLocalSettings } = useSiteSettings();
  const { allThemes } = useTheme();
  
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [themeToEdit, setThemeToEdit] = useState<Theme | null>(null);
  const [themeToDelete, setThemeToDelete] = useState<Theme | null>(null);
  
  const form = useForm<ThemeFormValues>({
    resolver: zodResolver(themeSchema),
    defaultValues: { name: '', templateThemeId: 'default-dark' },
  });

  const handleCreateTheme = (values: ThemeFormValues) => {
    const templateTheme = allThemes.find(t => t.id === values.templateThemeId);
    if (!templateTheme) {
        toast({ title: 'Template theme not found', variant: 'destructive' });
        return;
    }
    const newTheme = createInitialThemeData(values.name, templateTheme);
    const updatedCustomThemes = [...(siteSettings.customThemes || []), newTheme];
    updateLocalSettings({ customThemes: updatedCustomThemes });
    setIsCreateDialogOpen(false);
    form.reset();
  };

  const handleUpdateTheme = (updatedTheme: Theme) => {
    const updatedCustomThemes = (siteSettings.customThemes || []).map(t => t.id === themeToEdit?.id ? updatedTheme : t);
    updateLocalSettings({ customThemes: updatedCustomThemes });
  };
  
  const handleDeleteTheme = () => {
    if (!themeToDelete) return;
    const updatedCustomThemes = (siteSettings.customThemes || []).filter(t => t.id !== themeToDelete.id);
    updateLocalSettings({ customThemes: updatedCustomThemes });
    setThemeToDelete(null);
    toast({ title: 'Theme Deleted', description: `Theme "${themeToDelete.name}" has been deleted.` });
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      await updateSiteSettings({
        customThemes: siteSettings.customThemes,
        defaultThemeId: siteSettings.defaultThemeId,
        userSelectableThemeIds: siteSettings.userSelectableThemeIds
      });
      toast({
        title: 'Theme Settings Saved',
        description: 'Your theme configurations have been updated.',
      });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Save Failed' });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSetDefault = (themeId: string) => {
      updateLocalSettings({ defaultThemeId: themeId });
  }
  
  const handleToggleUserSelectable = (themeId: string, checked: boolean) => {
      const currentSelectable = siteSettings.userSelectableThemeIds || [];
      const newSelectable = checked
          ? [...currentSelectable, themeId]
          : currentSelectable.filter(id => id !== themeId);
      updateLocalSettings({ userSelectableThemeIds: newSelectable });
  };

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Theme Management</CardTitle>
                <CardDescription>Create, customize, and manage themes for your application.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allThemes.map((theme) => (
                        <Card key={theme.id} className={cn("flex flex-col", siteSettings.defaultThemeId === theme.id && "border-primary ring-2 ring-primary")}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg">{theme.name}</CardTitle>
                                    <div className="flex items-center gap-2">
                                        {theme.isCustom && (
                                            <>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setThemeToEdit(theme); setIsEditDialogOpen(true); }}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setThemeToDelete(theme)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {!theme.isCustom && <CardDescription>Base Theme</CardDescription>}
                            </CardHeader>
                             <CardContent className="flex-1 space-y-4">
                                <div className="flex gap-2 pt-2">
                                    <div className="h-8 w-1/3 rounded-sm" style={{backgroundColor: `hsl(${theme.primary})`}}/>
                                    <div className="h-8 w-1/3 rounded-sm" style={{backgroundColor: `hsl(${theme.secondary})`}}/>
                                    <div className="h-8 w-1/3 rounded-sm" style={{backgroundColor: `hsl(${theme.accent})`}}/>
                                </div>
                             </CardContent>
                             <CardFooter className="flex-col items-start gap-4">
                                <Button onClick={() => handleSetDefault(theme.id)} variant={siteSettings.defaultThemeId === theme.id ? "default" : "secondary"} size="sm" className="w-full">
                                    {siteSettings.defaultThemeId === theme.id && <Check className="mr-2 h-4 w-4" />}
                                    {siteSettings.defaultThemeId === theme.id ? 'Default Theme' : 'Set as Default'}
                                </Button>
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id={`selectable-${theme.id}`}
                                        checked={siteSettings.userSelectableThemeIds?.includes(theme.id)}
                                        onCheckedChange={(checked) => handleToggleUserSelectable(theme.id, checked)}
                                    />
                                    <Label htmlFor={`selectable-${theme.id}`} className="text-sm">Allow users to select</Label>
                                </div>
                             </CardFooter>
                        </Card>
                    ))}
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger asChild>
                           <Button variant="outline" className="h-full min-h-[200px] border-dashed text-lg">
                                <Icons.Add className="mr-2" /> Create New Theme
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Theme</DialogTitle>
                                <DialogDescription>Give your new theme a name and choose a template to start from.</DialogDescription>
                            </DialogHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(handleCreateTheme)} className="space-y-4">
                                    <FormField control={form.control} name="name" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Theme Name</FormLabel>
                                            <FormControl><Input placeholder="e.g., Midnight Blue" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="templateThemeId" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Copy Styles From</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {allThemes.map(theme => <SelectItem key={theme.id} value={theme.id}>{theme.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <DialogFooter>
                                        <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                                        <Button type="submit">Create Theme</Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                 </div>
            </CardContent>
             <CardFooter className="border-t pt-6">
                <Button onClick={handleSaveChanges} disabled={isSaving || siteSettingsLoading} size="lg">
                    {isSaving ? (
                        <>
                            <Icons.AppLogo className="animate-spin mr-2" />
                            Saving...
                        </>
                    ) : (
                        'Save All Theme Settings'
                    )}
                </Button>
            </CardFooter>
        </Card>
        
        {/* Edit Theme Dialog */}
        {themeToEdit && (
            <EditThemeDialog 
                key={themeToEdit.id}
                open={isEditDialogOpen} 
                onOpenChange={setIsEditDialogOpen} 
                theme={themeToEdit} 
                onThemeUpdate={handleUpdateTheme}
            />
        )}
        
        {/* Delete Confirmation */}
        <AlertDialog open={!!themeToDelete} onOpenChange={(open) => !open && setThemeToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete "{themeToDelete?.name}"?</AlertDialogTitle>
                    <AlertDialogDescription>Are you sure you want to delete this theme? This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteTheme} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}


// --- Edit Theme Dialog Component ---

interface EditThemeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme: Theme;
  onThemeUpdate: (updatedTheme: Theme) => void;
}

function ThemePreview({ theme }: { theme: Theme }) {
    const dynamicStyles = {
        '--background': `hsl(${theme.background})`, '--foreground': `hsl(${theme.foreground})`, '--card': `hsl(${theme.card})`, '--card-foreground': `hsl(${theme.cardForeground})`, '--popover': `hsl(${theme.popover})`, '--popover-foreground': `hsl(${theme.popoverForeground})`, '--primary': `hsl(${theme.primary})`, '--primary-foreground': `hsl(${theme.primaryForeground})`, '--secondary': `hsl(${theme.secondary})`, '--secondary-foreground': `hsl(${theme.secondaryForeground})`, '--muted': `hsl(${theme.muted})`, '--muted-foreground': `hsl(${theme.mutedForeground})`, '--accent': `hsl(${theme.accent})`, '--accent-foreground': `hsl(${theme.accentForeground})`, '--destructive': `hsl(${theme.destructive})`, '--destructive-foreground': `hsl(${theme.destructiveForeground})`, '--border': `hsl(${theme.border})`, '--input': `hsl(${theme.input})`, '--ring': `hsl(${theme.ring})`, '--radius': `${theme.radius}rem`, '--radius-card': `${theme.radiusCard}rem`, '--radius-button': `${theme.radiusButton}rem`, '--radius-input': `${theme.radiusInput}rem`, '--radius-dialog': `${theme.radiusDialog}rem`
    } as React.CSSProperties;

    return (
        <div style={dynamicStyles} className="p-4 rounded-md border bg-background text-foreground" >
            <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Card Preview</CardTitle>
                        <CardDescription>This is a sample card.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center gap-4">
                        <Avatar><AvatarImage src="https://github.com/Yashraj-Jangra.png" /><AvatarFallback>YJ</AvatarFallback></Avatar>
                        <p className="text-sm">Content goes here.</p>
                    </CardContent>
                </Card>
                <div className="flex gap-2">
                    <Button>Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="destructive">Destructive</Button>
                </div>
                <div>
                    <Input placeholder="Sample input..." />
                </div>
            </div>
        </div>
    )
}

const editThemeSchema = z.object({
  name: z.string().min(1, 'Theme name is required'),
});

function EditThemeDialog({ open, onOpenChange, theme, onThemeUpdate }: EditThemeDialogProps) {
    const [editedTheme, setEditedTheme] = useState<Theme>(theme);
    
    const form = useForm({
        resolver: zodResolver(editThemeSchema),
        defaultValues: { name: theme.name }
    })
    
    const handleColorChange = (varName: keyof ThemeColors, value: string) => {
        setEditedTheme(prev => ({...prev, [varName]: value}));
    };

    const handleRadiusChange = (varName: keyof ThemeRadii, value: number) => {
        setEditedTheme(prev => ({...prev, [varName]: value}));
    };
    
    const handleSave = () => {
        const newName = form.getValues('name');
        const newId = newName.toLowerCase().replace(/\s+/g, '-');
        onThemeUpdate({...editedTheme, name: newName, id: newId });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-7xl">
                 <DialogHeader>
                    <DialogTitle>Editing "{theme.name}"</DialogTitle>
                    <DialogDescription>Customize the colors and radii for this theme. Changes are shown live in the preview.</DialogDescription>
                </DialogHeader>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-h-[70vh] overflow-y-auto p-1">
                    {/* Controls Column */}
                    <div className="md:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <Form {...form}>
                                <form className="space-y-4">
                                     <FormField control={form.control} name="name" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Theme Name</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </form>
                            </Form>

                            <Accordion type="multiple" className="w-full space-y-4" defaultValue={['general']}>
                                <AccordionItem value="general" className="border-b-0"><AccordionTrigger>General</AccordionTrigger>
                                    <AccordionContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <ColorEditor label="Background" color={editedTheme.background} onChange={(c) => handleColorChange('background', c)} />
                                        <ColorEditor label="Foreground" color={editedTheme.foreground} onChange={(c) => handleColorChange('foreground', c)} />
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="card" className="border-b-0"><AccordionTrigger>Card</AccordionTrigger>
                                    <AccordionContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <ColorEditor label="Card" color={editedTheme.card} onChange={(c) => handleColorChange('card', c)} />
                                        <ColorEditor label="Card FG" color={editedTheme.cardForeground} onChange={(c) => handleColorChange('cardForeground', c)} />
                                        <ColorEditor label="Popover" color={editedTheme.popover} onChange={(c) => handleColorChange('popover', c)} />
                                        <ColorEditor label="Popover FG" color={editedTheme.popoverForeground} onChange={(c) => handleColorChange('popoverForeground', c)} />
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="primary" className="border-b-0"><AccordionTrigger>Primary</AccordionTrigger>
                                    <AccordionContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <ColorEditor label="Primary" color={editedTheme.primary} onChange={(c) => handleColorChange('primary', c)} />
                                        <ColorEditor label="Primary FG" color={editedTheme.primaryForeground} onChange={(c) => handleColorChange('primaryForeground', c)} />
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="secondary" className="border-b-0"><AccordionTrigger>Secondary</AccordionTrigger>
                                    <AccordionContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <ColorEditor label="Secondary" color={editedTheme.secondary} onChange={(c) => handleColorChange('secondary', c)} />
                                        <ColorEditor label="Secondary FG" color={editedTheme.secondaryForeground} onChange={(c) => handleColorChange('secondaryForeground', c)} />
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="accent" className="border-b-0"><AccordionTrigger>Accent</AccordionTrigger>
                                    <AccordionContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <ColorEditor label="Accent" color={editedTheme.accent} onChange={(c) => handleColorChange('accent', c)} />
                                        <ColorEditor label="Accent FG" color={editedTheme.accentForeground} onChange={(c) => handleColorChange('accentForeground', c)} />
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="destructive" className="border-b-0"><AccordionTrigger>Destructive</AccordionTrigger>
                                    <AccordionContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <ColorEditor label="Destructive" color={editedTheme.destructive} onChange={(c) => handleColorChange('destructive', c)} />
                                        <ColorEditor label="Destructive FG" color={editedTheme.destructiveForeground} onChange={(c) => handleColorChange('destructiveForeground', c)} />
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="other" className="border-b-0"><AccordionTrigger>Other Colors</AccordionTrigger>
                                    <AccordionContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <ColorEditor label="Muted" color={editedTheme.muted} onChange={(c) => handleColorChange('muted', c)} />
                                        <ColorEditor label="Muted FG" color={editedTheme.mutedForeground} onChange={(c) => handleColorChange('mutedForeground', c)} />
                                        <ColorEditor label="Border" color={editedTheme.border} onChange={(c) => handleColorChange('border', c)} />
                                        <ColorEditor label="Input" color={editedTheme.input} onChange={(c) => handleColorChange('input', c)} />
                                        <ColorEditor label="Ring" color={editedTheme.ring} onChange={(c) => handleColorChange('ring', c)} />
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </div>
                        {/* Radii Column */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold">Border Radius</h3>
                            <RadiusEditor label="Global Radius" value={editedTheme.radius} onChange={(v) => handleRadiusChange('radius', v)} />
                            <RadiusEditor label="Card Radius" value={editedTheme.radiusCard} onChange={(v) => handleRadiusChange('radiusCard', v)} preview={<Card className="w-full h-10" />} />
                            <RadiusEditor label="Button Radius" value={editedTheme.radiusButton} onChange={(v) => handleRadiusChange('radiusButton', v)} preview={<Button className="w-full" />} />
                            <RadiusEditor label="Input Radius" value={editedTheme.radiusInput} onChange={(v) => handleRadiusChange('radiusInput', v)} preview={<Input className="w-full" />} />
                            <RadiusEditor label="Dialog Radius" value={editedTheme.radiusDialog} onChange={(v) => handleRadiusChange('radiusDialog', v)} />
                        </div>
                    </div>
                     {/* Preview Column */}
                    <div className="md:col-span-1">
                        <div className="sticky top-0">
                           <h3 className="text-lg font-semibold mb-4">Live Preview</h3>
                           <ThemePreview theme={editedTheme} />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const ColorEditor = ({ label, color, onChange }: { label: string, color: string, onChange: (newColor: string) => void }) => (
    <div className="space-y-2">
        <Label>{label}</Label>
        <ColorPicker color={`hsl(${color})`} setColor={(newColor) => {
            const match = newColor.match(/hsl\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%\)/);
            if(match) {
                onChange(`${match[1]} ${match[2]}% ${match[3]}%`);
            }
        }} />
    </div>
);

const RadiusEditor = ({ label, value, onChange, preview }: { label: string, value: number, onChange: (newValue: number) => void, preview?: React.ReactNode }) => (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            <Label>{label}</Label>
            <span className="text-sm text-muted-foreground font-mono">{value.toFixed(2)}rem</span>
        </div>
        {preview && <div className="p-2" style={{'--radius-card': `${value}rem`, '--radius-button': `${value}rem`, '--radius-input': `${value}rem`} as React.CSSProperties}>{preview}</div>}
        <Slider value={[value]} onValueChange={([v]) => onChange(v)} max={2} step={0.05} />
    </div>
);


    

    
