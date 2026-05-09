

"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { FirebaseError } from 'firebase/app';

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Icons } from '@/components/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { UserGroupsList } from "@/components/shared/user-groups-list";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { EmailManagementSection } from "@/components/settings/email-management-section";

import { useAuth } from '@/contexts/auth-context';
import { useToast } from "@/hooks/use-toast";
import { updateUser, isUsernameTaken, getUserNotificationPrefs, updateUserNotificationPrefs } from "@/lib/mock-data";
import { getFullName, getInitials } from "@/lib/utils";
import { useSiteSettings } from "@/contexts/site-settings-context";
import { useTheme } from "@/contexts/theme-context";
import { Check } from "lucide-react";
import { requestPushPermission, subscribeToPush, unsubscribeFromPush } from '@/lib/push-service';
import type { NotificationEventType, UserNotificationPrefsDocument } from '@/types';


const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().optional(),
  username: z.string()
    .min(3, "Username must be at least 3 characters.")
    .max(20, "Username must be less than 20 characters.")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores."),
  email: z.string().email(),
  countryCode: z.string().optional(),
  mobileNumber: z.string().optional(),
  dob: z.string().optional(),
  avatarUrl: z.string().url("Please enter a valid URL.").or(z.literal('')).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "Password must be at least 6 characters."),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters."),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

const notificationEventSettingsSchema = z.object({
  inApp: z.boolean(),
  push: z.boolean(),
  email: z.boolean()
});

const notificationSettingsSchema = z.object({
    inAppEnabled: z.boolean().default(true),
    pushEnabled: z.boolean().default(true),
    emailEnabled: z.boolean().default(true),
    events: z.record(z.string(), notificationEventSettingsSchema)
});
type NotificationSettingsFormValues = z.infer<typeof notificationSettingsSchema>;

const notificationEventGroups: { label: string; events: { id: NotificationEventType; label: string; description: string }[] }[] = [
  {
    label: 'Expenses',
    events: [
      { id: 'expense_added', label: 'New Expenses', description: 'When an expense is added to your groups.' },
      { id: 'expense_updated', label: 'Expense Updates', description: 'When an expense you are part of is edited.' },
      { id: 'expense_deleted', label: 'Expense Deleted', description: 'When an expense is deleted.' },
    ],
  },
  {
    label: 'Payments',
    events: [
      { id: 'settlement_added', label: 'Settlements', description: 'When a settlement involving you is recorded.' },
      { id: 'balance_reminder', label: 'Balance Reminders', description: 'Periodic reminders for your outstanding debts.' },
    ],
  },
  {
    label: 'Groups',
    events: [
      { id: 'member_added', label: 'Group Invitations', description: 'When you are added to a new group.' },
    ],
  },
  {
    label: 'System',
    events: [
      { id: 'support_reply', label: 'Support Replies', description: 'When an admin replies to your support ticket.' },
      { id: 'broadcast_announcement', label: 'Announcements', description: 'General announcements from the team.' },
      { id: 'broadcast_critical', label: 'Critical Alerts', description: 'Important system alerts.' },
    ],
  },
];



export default function SettingsPage() {
  const { userProfile, loading, firebaseUser, hasPassword, isGoogleLinked, linkWithGoogle, unlinkFromGoogle, updateUserPassword } = useAuth();
  const { settings: siteSettings, loading: siteSettingsLoading } = useSiteSettings();
  const { theme: currentTheme, setTheme, allThemes } = useTheme();
  const { toast } = useToast();
  const router = useRouter();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [browserNotifPermission, setBrowserNotifPermission] = useState('default');

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      countryCode: '+91',
      mobileNumber: '',
      dob: '',
      avatarUrl: '',
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }
  });

  const notificationsForm = useForm<NotificationSettingsFormValues>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
        inAppEnabled: true,
        pushEnabled: true,
        emailEnabled: true,
        events: {}
    }
  });

  useEffect(() => {
    async function loadPrefs() {
      if (!userProfile) return;
      const prefs = await getUserNotificationPrefs(userProfile.uid);
      notificationsForm.reset({
        inAppEnabled: prefs.inAppEnabled,
        pushEnabled: prefs.pushEnabled,
        emailEnabled: prefs.emailEnabled,
        events: prefs.events as any
      });
    }
    loadPrefs();
  }, [userProfile, notificationsForm]);


  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserNotifPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (userProfile && siteSettings.countryCodes.length > 0) {
      const defaultCountry = siteSettings.countryCodes.find(c => c.code === userProfile.countryCode) || siteSettings.countryCodes[0];
      profileForm.reset({
        firstName: userProfile.firstName,
        lastName: userProfile.lastName || '',
        username: userProfile.username,
        email: userProfile.email,
        countryCode: `${defaultCountry.name}-${defaultCountry.code}`,
        mobileNumber: userProfile.mobileNumber || '',
        dob: userProfile.dob ? new Date(userProfile.dob).toISOString() : '',
        avatarUrl: userProfile.avatarUrl || '',
      });
    }
  }, [userProfile, profileForm, siteSettings.countryCodes, notificationsForm]);

  async function onProfileSubmit(values: ProfileFormValues) {
    if (!userProfile) return;

    try {
        if (values.username.toLowerCase() !== userProfile.username.toLowerCase()) {
            const taken = await isUsernameTaken(values.username, userProfile.uid);
            if (taken) {
                profileForm.setError("username", { type: "manual", message: "This username is already taken." });
                return;
            }
        }
        
        const countryCodeValue = values.countryCode?.split('-')[1];

        await updateUser(userProfile.uid, {
            ...values,
            countryCode: countryCodeValue || undefined,
            lastName: values.lastName || undefined,
            mobileNumber: values.mobileNumber || undefined,
            dob: values.dob || undefined,
            avatarUrl: values.avatarUrl || undefined,
        });

        toast({
            title: "Profile Updated",
            description: "Your settings have been saved successfully.",
        });
        router.refresh();
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: error instanceof Error ? error.message : "An unknown error occurred.",
        });
    }
  }

  async function onPasswordSubmit(values: PasswordFormValues) {
    try {
        await updateUserPassword(values.newPassword, hasPassword ? values.currentPassword : undefined);
        toast({ title: "Password Updated", description: "Your password has been successfully changed." });
        passwordForm.reset();
    } catch (error) {
        let description = "An unknown error occurred.";
        if (error instanceof FirebaseError) {
            if (error.code === 'auth/wrong-password') {
                description = "The current password you entered is incorrect.";
                passwordForm.setError("currentPassword", { type: "manual", message: description });
            } else {
                description = error.message;
            }
        }
        toast({ variant: "destructive", title: "Update Failed", description });
    }
  }
  
  async function onNotificationsSubmit(values: NotificationSettingsFormValues) {
    if (!userProfile) return;
    try {
        await updateUserNotificationPrefs(userProfile.uid, values as unknown as UserNotificationPrefsDocument);
        toast({ title: "Notification settings updated." });
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: "Could not save notification settings.",
        });
    }
  }

  const handleRequestPermission = async () => {
    if (!userProfile) return;
    const success = await requestPushPermission(userProfile.uid);
    if (success) {
      setBrowserNotifPermission('granted');
      toast({ title: "Push Notifications Enabled", description: "You will now receive background alerts." });
    } else {
      setBrowserNotifPermission('denied');
      toast({ variant: "destructive", title: "Permission Denied", description: "Please enable notifications in your browser settings." });
    }
  };



  const handleConnectGoogle = async () => {
    setIsGoogleLoading(true);
    try {
      await linkWithGoogle();
      toast({ title: 'Google Account Connected', description: 'You can now sign in using Google.' });
    } catch (error) {
      let description = 'An unknown error occurred.';
      if (error instanceof FirebaseError) {
        if (error.code === 'auth/credential-already-in-use') {
          description = 'This Google account is already linked to another user.';
        } else {
          description = error.message;
        }
      }
      toast({ variant: 'destructive', title: 'Connection Failed', description });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    setIsGoogleLoading(true);
    try {
      await unlinkFromGoogle();
      toast({ title: 'Google Account Disconnected' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Disconnection Failed', description: error instanceof Error ? error.message : 'An unknown error occurred.' });
    } finally {
      setIsGoogleLoading(false);
    }
  };
  

  
  const selectableThemes = allThemes.filter(t => siteSettings.userSelectableThemeIds?.includes(t.id));


  if (loading || !userProfile || siteSettingsLoading) {
    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <Skeleton className="h-12 w-1/3" />
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>
    )
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-headline text-foreground animate-in fade-in slide-in-from-bottom-2 duration-500">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences and information.</p>
      </div>

      <Form {...profileForm}>
        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Icons.Users className="h-5 w-5 mr-2 text-primary" />
                Profile Information
              </CardTitle>
              <CardDescription>Update your personal details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start gap-6">
                    <div className="flex-shrink-0">
                         <Avatar className="h-24 w-24">
                            <AvatarImage src={profileForm.watch('avatarUrl') || userProfile.avatarUrl} alt={getFullName(userProfile.firstName, userProfile.lastName)} />
                            <AvatarFallback className="text-3xl">{getInitials(userProfile.firstName, userProfile.lastName)}</AvatarFallback>
                        </Avatar>
                    </div>
                    <div className="w-full space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField control={profileForm.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={profileForm.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                         <FormField control={profileForm.control} name="username" render={({ field }) => (<FormItem><FormLabel>Username</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                </div>
                
                <FormField
                    control={profileForm.control}
                    name="avatarUrl"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Avatar URL</FormLabel>
                        <FormControl>
                        <Input placeholder="https://example.com/avatar.png" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={profileForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} disabled /></FormControl><FormMessage /></FormItem>)} />
                    <FormItem>
                        <FormLabel>Mobile Number</FormLabel>
                        <div className="flex gap-2">
                           <FormField
                                control={profileForm.control}
                                name="countryCode"
                                render={({ field }) => (
                                <FormItem className="w-1/3">
                                    <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                        <SelectValue placeholder="Code" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {siteSettings.countryCodes.map(cc => (
                                            <SelectItem key={`${cc.name}-${cc.code}`} value={`${cc.name}-${cc.code}`}>{cc.flag} {cc.code}</SelectItem>
                                        ))}
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={profileForm.control}
                                name="mobileNumber"
                                render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormControl>
                                    <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                    </FormItem>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={profileForm.control} name="dob" render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel className="mb-2">Date of Birth</FormLabel>
                            <Popover><PopoverTrigger asChild><FormControl>
                                <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                                    <Icons.Calendar className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl></PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar 
                                    mode="single" 
                                    captionLayout="dropdown-buttons"
                                    fromYear={1900}
                                    toYear={new Date().getFullYear()}
                                    selected={field.value ? new Date(field.value) : undefined} 
                                    onSelect={(date) => field.onChange(date?.toISOString())} 
                                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")} 
                                    initialFocus 
                                />
                            </PopoverContent></Popover><FormMessage />
                        </FormItem>)} 
                    />
                </div>
            </CardContent>
             <CardFooter className="border-t px-6 py-4 flex justify-end">
                <Button type="submit" disabled={profileForm.formState.isSubmitting}>
                  {profileForm.formState.isSubmitting ? "Saving..." : "Save Profile"}
                </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
      
      <Separator />

      <Card>
          <CardHeader>
              <CardTitle className="flex items-center">
                  <Icons.PieChart className="h-5 w-5 mr-2 text-primary" />
                  Appearance
              </CardTitle>
              <CardDescription>Choose your preferred theme for the application.</CardDescription>
          </CardHeader>
          <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {selectableThemes.map(theme => (
                      <div key={theme.id} className="space-y-2 cursor-pointer" onClick={() => setTheme(theme.id)}>
                          <div className={cn(
                              "aspect-video rounded-md border-2 p-2 flex items-center justify-center transition-all",
                              currentTheme === theme.id ? 'border-primary ring-2 ring-primary' : 'border-muted hover:border-primary/50'
                          )}>
                              <div className="flex gap-1">
                                  <div className="h-8 w-4 rounded-sm" style={{ backgroundColor: `hsl(${theme.primary})` }} />
                                  <div className="h-8 w-4 rounded-sm" style={{ backgroundColor: `hsl(${theme.secondary})` }} />
                                  <div className="h-8 w-4 rounded-sm" style={{ backgroundColor: `hsl(${theme.accent})` }} />
                              </div>
                          </div>
                          <div className="flex items-center justify-center gap-2 text-sm font-medium">
                               {currentTheme === theme.id && <Check className="h-4 w-4 text-primary" />}
                              <span>{theme.name}</span>
                          </div>
                      </div>
                  ))}
              </div>
          </CardContent>
      </Card>

      <Separator />

      <EmailManagementSection userProfile={userProfile} />

      <Separator />

      <Form {...notificationsForm}>
          <form onSubmit={notificationsForm.handleSubmit(onNotificationsSubmit)}>
              <Card className="overflow-hidden">
                  <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                              <Icons.Bell className="h-4 w-4 text-primary" />
                          </div>
                          Notification Preferences
                      </CardTitle>
                      <CardDescription>Control which channels and events send you notifications.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">

                      {/* Browser Push Banner */}
                      <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
                          <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                                  <Icons.Bell className="h-4 w-4" />
                              </div>
                              <div>
                                  <p className="text-sm font-medium">Browser Push Notifications</p>
                                  <p className="text-xs text-muted-foreground">Real-time alerts on this device</p>
                              </div>
                          </div>
                          {browserNotifPermission === 'default' && (
                              <Button size="sm" type="button" onClick={handleRequestPermission} className="text-xs">Enable</Button>
                          )}
                          {browserNotifPermission === 'granted' && (
                              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 border text-xs">Active</Badge>
                          )}
                          {browserNotifPermission === 'denied' && (
                              <Badge variant="destructive" className="text-xs">Blocked</Badge>
                          )}
                      </div>

                      {/* Master channel toggles */}
                      <div className="space-y-2">
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Master Switches</p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {[
                                  { name: 'inAppEnabled' as const, label: 'In-App', icon: <Icons.Bell className="h-3.5 w-3.5" /> },
                                  { name: 'pushEnabled' as const, label: 'Push', icon: <Icons.Bell className="h-3.5 w-3.5" /> },
                                  { name: 'emailEnabled' as const, label: 'Email', icon: <Icons.Mail className="h-3.5 w-3.5" /> },
                              ].map(({ name, label, icon }) => (
                                  <FormField key={name} control={notificationsForm.control} name={name} render={({ field }) => (
                                      <FormItem className="flex flex-row items-center justify-between rounded-xl border p-3 bg-muted/20 hover:bg-muted/40 transition-colors">
                                          <div className="flex items-center gap-2">
                                              <span className="text-muted-foreground">{icon}</span>
                                              <FormLabel className="text-sm font-medium cursor-pointer">{label}</FormLabel>
                                          </div>
                                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                      </FormItem>
                                  )} />
                              ))}
                          </div>
                      </div>

                      {/* Per-event table grouped by category */}
                      <div className="space-y-4 overflow-x-auto">
                          <div className="min-w-[480px] space-y-5">
                              {/* Column headers */}
                              <div className="grid grid-cols-12 gap-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  <div className="col-span-6">Event</div>
                                  <div className="col-span-2 text-center">In-App</div>
                                  <div className="col-span-2 text-center">Push</div>
                                  <div className="col-span-2 text-center">Email</div>
                              </div>

                              {notificationEventGroups.map((group) => (
                                  <div key={group.label}>
                                      <div className="flex items-center gap-2 mb-2 px-3">
                                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{group.label}</span>
                                          <div className="h-px flex-1 bg-border" />
                                      </div>
                                      <div className="rounded-xl border overflow-hidden">
                                          {group.events.map((cat, idx) => (
                                              <div key={cat.id} className={`grid grid-cols-12 gap-2 items-center py-3 px-3 hover:bg-muted/10 transition-colors ${idx < group.events.length - 1 ? 'border-b border-border/50' : ''}` }>
                                                  <div className="col-span-6">
                                                      <div className="text-sm font-medium leading-tight">{cat.label}</div>
                                                      <div className="text-xs text-muted-foreground leading-tight mt-0.5">{cat.description}</div>
                                                  </div>
                                                  <div className="col-span-2 flex justify-center">
                                                      <FormField control={notificationsForm.control} name={`events.${cat.id}.inApp`} render={({ field }) => (
                                                          <FormControl><Switch checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                                                      )} />
                                                  </div>
                                                  <div className="col-span-2 flex justify-center">
                                                      <FormField control={notificationsForm.control} name={`events.${cat.id}.push`} render={({ field }) => (
                                                          <FormControl><Switch checked={!!field.value} onCheckedChange={field.onChange} disabled={!notificationsForm.watch('pushEnabled')} /></FormControl>
                                                      )} />
                                                  </div>
                                                  <div className="col-span-2 flex justify-center">
                                                      <FormField control={notificationsForm.control} name={`events.${cat.id}.email`} render={({ field }) => (
                                                          <FormControl><Switch checked={!!field.value} onCheckedChange={field.onChange} disabled={!notificationsForm.watch('emailEnabled')} /></FormControl>
                                                      )} />
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>

                  </CardContent>
                  <CardFooter className="border-t px-6 py-4 flex justify-end">
                      <Button type="submit" disabled={notificationsForm.formState.isSubmitting}>
                          {notificationsForm.formState.isSubmitting ? "Saving..." : "Save Notification Settings"}
                      </Button>
                  </CardFooter>
              </Card>
          </form>
      </Form>


      <Separator />

      <UserGroupsList userId={userProfile.uid} />

      <Separator />

      <Card>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Icons.ShieldCheck className="h-5 w-5 mr-2 text-primary" />
                  Security & Login
                </CardTitle>
                <CardDescription>Manage your account security and login methods.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-md font-medium">Password Settings</h3>
                    {hasPassword && (
                      <FormField
                          control={passwordForm.control}
                          name="currentPassword"
                          render={({ field }) => (
                              <FormItem>
                                <FormLabel>Current Password</FormLabel>
                                <FormControl>
                                    <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                          )}
                      />
                    )}
                    <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                            <FormItem>
                              <FormLabel>New Password</FormLabel>
                                <FormControl>
                                  <Input type="password" {...field} />
                                </FormControl>
                              <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm New Password</FormLabel>
                                <FormControl>
                                  <Input type="password" {...field} />
                                </FormControl>
                              <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="flex justify-end">
                      <Button type="submit" disabled={passwordForm.formState.isSubmitting}>{hasPassword ? 'Change Password' : 'Set Password'}</Button>
                    </div>
                </div>
                <Separator />
                <div className="space-y-4">
                      <h3 className="text-md font-medium">Linked Accounts</h3>
                      <div className="flex items-center justify-between p-4 border rounded-md">
                        <div className="flex items-center gap-3">
                          <Icons.Google className="h-6 w-6" />
                          <p className="font-medium">Google</p>
                        </div>
                        {isGoogleLinked ? (
                          <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Connected</span>
                              <Button variant="outline" size="sm" onClick={handleDisconnectGoogle} disabled={isGoogleLoading}>
                                {isGoogleLoading && <Icons.AppLogo className="animate-spin mr-2"/>} Disconnect
                              </Button>
                          </div>
                        ) : (
                          <Button variant="secondary" size="sm" onClick={handleConnectGoogle} disabled={isGoogleLoading}>
                            {isGoogleLoading && <Icons.AppLogo className="animate-spin mr-2"/>} Connect
                          </Button>
                        )}
                      </div>
                </div>
              </CardContent>
            </form>
          </Form>
      </Card>
      
      <Separator />

       <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <Icons.Delete className="h-5 w-5 mr-2" />
            Account Deletion
          </CardTitle>
          <CardDescription>Permanently delete your {siteSettings.appName} account.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
                Once you delete your account, there is no going back. All your data, including groups, expenses, and settlements, will be permanently removed. Please be certain.
            </p>
           <div className="flex justify-end">
             <Button variant="destructive">Delete My Account</Button>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
