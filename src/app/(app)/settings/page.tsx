"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Icons } from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { EmailManagementSection } from "@/components/settings/email-management-section";
import { UserGroupsList } from "@/components/shared/user-groups-list";

import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { updateUser, isUsernameTaken, getUserNotificationPrefs, updateUserNotificationPrefs } from "@/lib/mock-data";
import { getFullName, getInitials } from "@/lib/utils";
import { useSiteSettings } from "@/contexts/site-settings-context";
import { useTheme } from "@/contexts/theme-context";
import { requestPushPermission } from "@/lib/push-service";
import type { NotificationEventType, UserNotificationPrefsDocument } from "@/types";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().optional(),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers and underscores only."),
  email: z.string().email(),
  countryCode: z.string().optional(),
  mobileNumber: z.string().optional(),
  dob: z.string().optional(),
  avatarUrl: z.string().url("Please enter a valid URL.").or(z.literal("")).optional(),
});
type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "At least 6 characters."),
  confirmPassword: z.string().min(6),
}).refine(d => d.newPassword === d.confirmPassword, { message: "Passwords do not match.", path: ["confirmPassword"] });
type PasswordFormValues = z.infer<typeof passwordSchema>;

const notifSchema = z.object({
  inAppEnabled: z.boolean().default(true),
  pushEnabled: z.boolean().default(true),
  emailEnabled: z.boolean().default(true),
  events: z.record(z.string(), z.object({ inApp: z.boolean(), push: z.boolean(), email: z.boolean() })),
});
type NotifFormValues = z.infer<typeof notifSchema>;

const EVENT_GROUPS: { label: string; events: { id: NotificationEventType; label: string; description: string }[] }[] = [
  { label: "Expenses", events: [
    { id: "expense_added", label: "New Expense", description: "When an expense is added to your groups." },
    { id: "expense_updated", label: "Expense Updated", description: "When an expense you are part of is edited." },
    { id: "expense_deleted", label: "Expense Deleted", description: "When an expense is deleted." },
  ]},
  { label: "Payments", events: [
    { id: "settlement_added", label: "Settlement Recorded", description: "When a settlement involving you is logged." },
    { id: "balance_reminder", label: "Balance Reminder", description: "Periodic reminders for outstanding debts." },
  ]},
  { label: "Groups", events: [
    { id: "member_added", label: "Group Invitation", description: "When you are added to a new group." },
  ]},
  { label: "System", events: [
    { id: "support_reply", label: "Support Reply", description: "When an admin replies to your support ticket." },
    { id: "broadcast_announcement", label: "Announcement", description: "General announcements from the team." },
    { id: "broadcast_critical", label: "Critical Alert", description: "Important system alerts." },
  ]},
];

const SECTIONS = [
  { id: "profile", label: "Profile", icon: "Users" },
  { id: "appearance", label: "Appearance", icon: "PieChart" },
  { id: "notifications", label: "Notifications", icon: "Bell" },
  { id: "security", label: "Security", icon: "ShieldCheck" },
  { id: "groups", label: "My Groups", icon: "Users" },
  { id: "danger", label: "Danger Zone", icon: "Delete" },
] as const;

type SectionId = typeof SECTIONS[number]["id"];

export default function SettingsPage() {
  const { userProfile, loading, firebaseUser, hasPassword, isGoogleLinked, linkWithGoogle, unlinkFromGoogle, updateUserPassword } = useAuth();
  const { settings: siteSettings, loading: siteSettingsLoading } = useSiteSettings();
  const { theme: currentTheme, setTheme, allThemes } = useTheme();
  const { toast } = useToast();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<SectionId>("profile");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [browserNotifPermission, setBrowserNotifPermission] = useState("default");

  const profileForm = useForm<ProfileFormValues>({ resolver: zodResolver(profileSchema), defaultValues: { firstName: "", lastName: "", username: "", email: "", countryCode: "+91", mobileNumber: "", dob: "", avatarUrl: "" } });
  const passwordForm = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema), defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" } });
  const notifForm = useForm<NotifFormValues>({ resolver: zodResolver(notifSchema), defaultValues: { inAppEnabled: true, pushEnabled: true, emailEnabled: true, events: {} } });

  useEffect(() => { if (typeof window !== "undefined" && "Notification" in window) setBrowserNotifPermission(Notification.permission); }, []);

  useEffect(() => {
    async function loadPrefs() {
      if (!userProfile) return;
      const prefs = await getUserNotificationPrefs(userProfile.uid);
      notifForm.reset({ inAppEnabled: prefs.inAppEnabled, pushEnabled: prefs.pushEnabled, emailEnabled: prefs.emailEnabled, events: prefs.events as any });
    }
    loadPrefs();
  }, [userProfile]);

  useEffect(() => {
    if (userProfile && siteSettings.countryCodes.length > 0) {
      const match = siteSettings.countryCodes.find(c => c.code === userProfile.countryCode) || siteSettings.countryCodes[0];
      profileForm.reset({
        firstName: userProfile.firstName, lastName: userProfile.lastName || "", username: userProfile.username,
        email: userProfile.email, countryCode: `${match.name}-${match.code}`,
        mobileNumber: userProfile.mobileNumber || "", dob: userProfile.dob ? new Date(userProfile.dob).toISOString() : "", avatarUrl: userProfile.avatarUrl || "",
      });
    }
  }, [userProfile, siteSettings.countryCodes]);

  async function onProfileSubmit(values: ProfileFormValues) {
    if (!userProfile) return;
    try {
      if (values.username.toLowerCase() !== userProfile.username.toLowerCase()) {
        const taken = await isUsernameTaken(values.username, userProfile.uid);
        if (taken) { profileForm.setError("username", { type: "manual", message: "This username is already taken." }); return; }
      }
      // Fix: always take the last segment after '-' to handle country names with hyphens
      const parts = values.countryCode?.split("-") ?? [];
      const countryCodeValue = parts.length > 1 ? parts[parts.length - 1] : values.countryCode;
      await updateUser(userProfile.uid, { ...values, countryCode: countryCodeValue || undefined, lastName: values.lastName || undefined, mobileNumber: values.mobileNumber || undefined, dob: values.dob || undefined, avatarUrl: values.avatarUrl || undefined });
      toast({ title: "Profile Updated", description: "Your changes have been saved." });
      router.refresh();
    } catch (e) {
      toast({ variant: "destructive", title: "Update Failed", description: e instanceof Error ? e.message : "An unknown error occurred." });
    }
  }

  async function onPasswordSubmit(values: PasswordFormValues) {
    try {
      await updateUserPassword(values.newPassword, hasPassword ? values.currentPassword : undefined);
      toast({ title: "Password Updated" });
      passwordForm.reset();
    } catch (e) {
      if (e instanceof FirebaseError && e.code === "auth/wrong-password") passwordForm.setError("currentPassword", { type: "manual", message: "Incorrect current password." });
      toast({ variant: "destructive", title: "Update Failed", description: e instanceof Error ? e.message : "An unknown error occurred." });
    }
  }

  async function onNotifSubmit(values: NotifFormValues) {
    if (!userProfile) return;
    try {
      await updateUserNotificationPrefs(userProfile.uid, values as unknown as UserNotificationPrefsDocument);
      toast({ title: "Notification settings saved." });
    } catch { toast({ variant: "destructive", title: "Update Failed" }); }
  }

  const handleRequestPermission = async () => {
    if (!userProfile) return;
    const ok = await requestPushPermission(userProfile.uid);
    setBrowserNotifPermission(ok ? "granted" : "denied");
    toast(ok ? { title: "Push Notifications Enabled" } : { variant: "destructive", title: "Permission Denied", description: "Enable notifications in your browser settings." });
  };

  const handleConnectGoogle = async () => {
    setIsGoogleLoading(true);
    try { await linkWithGoogle(); toast({ title: "Google Account Connected" }); }
    catch (e) { toast({ variant: "destructive", title: "Connection Failed", description: e instanceof Error ? e.message : "An error occurred." }); }
    finally { setIsGoogleLoading(false); }
  };

  const handleDisconnectGoogle = async () => {
    setIsGoogleLoading(true);
    try { await unlinkFromGoogle(); toast({ title: "Google Account Disconnected" }); }
    catch (e) { toast({ variant: "destructive", title: "Failed", description: e instanceof Error ? e.message : "An error occurred." }); }
    finally { setIsGoogleLoading(false); }
  };

  const selectableThemes = allThemes.filter(t => siteSettings.userSelectableThemeIds?.includes(t.id));

  if (loading || !userProfile || siteSettingsLoading) {
    return <div className="space-y-4 max-w-4xl mx-auto p-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /><Skeleton className="h-48 w-full" /></div>;
  }

  const renderSection = () => {
    switch (activeSection) {
      case "profile": return (
        <Form {...profileForm}>
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
            <Card>
              <CardHeader><CardTitle>Profile Information</CardTitle><CardDescription>Update your personal details and avatar.</CardDescription></CardHeader>
              <CardContent className="space-y-5">
                <div className="flex flex-col sm:flex-row items-start gap-5">
                  <Avatar className="h-20 w-20 shrink-0">
                    <AvatarImage src={profileForm.watch("avatarUrl") || userProfile.avatarUrl} />
                    <AvatarFallback className="text-2xl">{getInitials(userProfile.firstName, userProfile.lastName)}</AvatarFallback>
                  </Avatar>
                  <div className="w-full space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField control={profileForm.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={profileForm.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                    <FormField control={profileForm.control} name="username" render={({ field }) => (<FormItem><FormLabel>Username</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                </div>
                <FormField control={profileForm.control} name="avatarUrl" render={({ field }) => (<FormItem><FormLabel>Avatar URL</FormLabel><FormControl><Input placeholder="https://example.com/avatar.png" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField control={profileForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} disabled /></FormControl><FormMessage /></FormItem>)} />
                  <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <div className="flex gap-2">
                      <FormField control={profileForm.control} name="countryCode" render={({ field }) => (
                        <FormItem className="w-[120px] shrink-0">
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Code" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {siteSettings.countryCodes.map(cc => (<SelectItem key={`${cc.name}-${cc.code}`} value={`${cc.name}-${cc.code}`}>{cc.flag} {cc.code}</SelectItem>))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={profileForm.control} name="mobileNumber" render={({ field }) => (<FormItem className="flex-1"><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                  </FormItem>
                </div>
                <FormField control={profileForm.control} name="dob" render={({ field }) => (
                  <FormItem className="flex flex-col"><FormLabel className="mb-1">Date of Birth</FormLabel>
                    <Popover><PopoverTrigger asChild><FormControl>
                      <Button variant="outline" className={cn("w-full sm:w-64 justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                        <Icons.Calendar className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl></PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" captionLayout="dropdown-buttons" fromYear={1900} toYear={new Date().getFullYear()} selected={field.value ? new Date(field.value) : undefined} onSelect={d => field.onChange(d?.toISOString())} disabled={d => d > new Date() || d < new Date("1900-01-01")} initialFocus />
                    </PopoverContent></Popover>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
              <CardFooter className="border-t px-6 py-4 flex justify-end">
                <Button type="submit" disabled={profileForm.formState.isSubmitting}>{profileForm.formState.isSubmitting ? "Saving..." : "Save Profile"}</Button>
              </CardFooter>
            </Card>
          </form>
        </Form>
      );

      case "appearance": return (
        <Card>
          <CardHeader><CardTitle>Appearance</CardTitle><CardDescription>Choose your preferred theme.</CardDescription></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {selectableThemes.map(theme => (
                <div key={theme.id} className="space-y-2 cursor-pointer" onClick={() => setTheme(theme.id)}>
                  <div className={cn("aspect-video rounded-md border-2 p-2 flex items-center justify-center transition-all", currentTheme === theme.id ? "border-primary ring-2 ring-primary" : "border-muted hover:border-primary/50")}>
                    <div className="flex gap-1">
                      <div className="h-8 w-4 rounded-sm" style={{ backgroundColor: `hsl(${theme.primary})` }} />
                      <div className="h-8 w-4 rounded-sm" style={{ backgroundColor: `hsl(${theme.secondary})` }} />
                      <div className="h-8 w-4 rounded-sm" style={{ backgroundColor: `hsl(${theme.accent})` }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-1 text-sm font-medium">
                    {currentTheme === theme.id && <Check className="h-3.5 w-3.5 text-primary" />}
                    <span>{theme.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      );

      case "notifications": return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Settings</CardTitle>
              <CardDescription>Your account email and where system emails come from.</CardDescription>
            </CardHeader>
            <CardContent>
              <EmailManagementSection userProfile={userProfile} />
            </CardContent>
          </Card>

          <Form {...notifForm}>
            <form onSubmit={notifForm.handleSubmit(onNotifSubmit)}>
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>Control which channels and events alert you.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Browser push banner */}
                  <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted"><Icons.Bell className="h-4 w-4" /></div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Browser Push</p>
                        <p className="text-xs text-muted-foreground truncate">Real-time alerts on this device</p>
                      </div>
                    </div>
                    {browserNotifPermission === "default" && <Button size="sm" type="button" onClick={handleRequestPermission} className="shrink-0 text-xs">Enable</Button>}
                    {browserNotifPermission === "granted" && <Badge className="shrink-0 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs">Active</Badge>}
                    {browserNotifPermission === "denied" && <Badge variant="destructive" className="shrink-0 text-xs">Blocked</Badge>}
                  </div>

                  {/* Master toggles */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Master Switches</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {([["inAppEnabled", "In-App"], ["pushEnabled", "Push"], ["emailEnabled", "Email"]] as const).map(([name, label]) => (
                        <FormField key={name} control={notifForm.control} name={name} render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-xl border p-3 bg-muted/20">
                            <FormLabel className="text-sm font-medium cursor-pointer">{label}</FormLabel>
                            <FormControl><Switch checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                          </FormItem>
                        )} />
                      ))}
                    </div>
                  </div>

                  {/* Per-event sections */}
                  <div className="space-y-6">
                    {EVENT_GROUPS.map(group => (
                      <div key={group.label}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{group.label}</span>
                          <div className="h-px flex-1 bg-border" />
                        </div>
                        <div className="rounded-xl border overflow-hidden divide-y">
                          {/* Desktop Header */}
                          <div className="hidden md:grid grid-cols-[1fr_auto] items-center px-4 py-2 bg-muted/30 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            <span>Event</span>
                            <div className="grid grid-cols-3 gap-8 text-center w-[240px]">
                              <span>In-App</span>
                              <span>Push</span>
                              <span>Email</span>
                            </div>
                          </div>

                          {group.events.map(ev => (
                            <div key={ev.id} className="p-4 hover:bg-muted/5 transition-colors md:grid md:grid-cols-[1fr_auto] md:items-center md:gap-4">
                              <div className="mb-3 md:mb-0">
                                <p className="text-sm font-medium">{ev.label}</p>
                                <p className="text-xs text-muted-foreground">{ev.description}</p>
                              </div>
                              <div className="flex flex-wrap gap-4 md:grid md:grid-cols-3 md:gap-8 md:w-[240px] md:justify-items-center">
                                {(["inApp", "push", "email"] as const).map(channel => {
                                  const masterKey = channel === "inApp" ? "inAppEnabled" : channel === "push" ? "pushEnabled" : "emailEnabled";
                                  const masterOn = notifForm.watch(masterKey);
                                  return (
                                    <FormField key={channel} control={notifForm.control} name={`events.${ev.id}.${channel}`} render={({ field }) => (
                                      <FormItem className="flex items-center gap-2 md:gap-0 m-0">
                                        <FormLabel className={cn("text-xs font-medium cursor-pointer md:hidden", !masterOn && "opacity-40")}>
                                          {channel === "inApp" ? "In-App" : channel === "push" ? "Push" : "Email"}
                                        </FormLabel>
                                        <FormControl>
                                          <Switch checked={!!field.value} onCheckedChange={field.onChange} disabled={!masterOn} className="scale-90" />
                                        </FormControl>
                                      </FormItem>
                                    )} />
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4 flex justify-end">
                  <Button type="submit" disabled={notifForm.formState.isSubmitting}>{notifForm.formState.isSubmitting ? "Saving..." : "Save Preferences"}</Button>
                </CardFooter>
              </Card>
            </form>
          </Form>
        </div>
      );

      case "security": return (
        <div className="space-y-4">
          <Card>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
                <CardHeader><CardTitle>Password</CardTitle><CardDescription>{hasPassword ? "Change your current password." : "Set a password for email/password sign-in."}</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  {hasPassword && <FormField control={passwordForm.control} name="currentPassword" render={({ field }) => (<FormItem><FormLabel>Current Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>)} />}
                  <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (<FormItem><FormLabel>New Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (<FormItem><FormLabel>Confirm Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </CardContent>
                <CardFooter className="border-t px-6 py-4 flex justify-end">
                  <Button type="submit" disabled={passwordForm.formState.isSubmitting}>{hasPassword ? "Change Password" : "Set Password"}</Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
          <Card>
            <CardHeader><CardTitle>Linked Accounts</CardTitle><CardDescription>Connect third-party accounts for easier sign-in.</CardDescription></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-3 border rounded-xl">
                <div className="flex items-center gap-3"><Icons.Google className="h-5 w-5" /><p className="font-medium text-sm">Google</p></div>
                {isGoogleLinked
                  ? <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Connected</span><Button variant="outline" size="sm" onClick={handleDisconnectGoogle} disabled={isGoogleLoading}>Disconnect</Button></div>
                  : <Button variant="secondary" size="sm" onClick={handleConnectGoogle} disabled={isGoogleLoading}>Connect</Button>}
              </div>
            </CardContent>
          </Card>
        </div>
      );

      case "groups": return (
        <Card>
          <CardHeader><CardTitle>My Groups</CardTitle><CardDescription>Groups you are a member of.</CardDescription></CardHeader>
          <CardContent><UserGroupsList userId={userProfile.uid} /></CardContent>
        </Card>
      );

      case "danger": return (
        <Card className="border-destructive/50">
          <CardHeader><CardTitle className="text-destructive flex items-center gap-2"><Icons.Delete className="h-5 w-5" />Danger Zone</CardTitle><CardDescription>Permanent and irreversible actions.</CardDescription></CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <div>
                <p className="font-medium text-sm">Delete Account</p>
                <p className="text-xs text-muted-foreground mt-0.5">Permanently removes all your data, groups, and expenses.</p>
              </div>
              <Button variant="destructive" className="shrink-0">Delete My Account</Button>
            </div>
          </CardContent>
        </Card>
      );
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-headline">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account preferences.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar — desktop */}
        <nav className="hidden md:flex flex-col w-48 shrink-0 gap-1">
          {SECTIONS.map(s => {
            const Icon = Icons[s.icon as keyof typeof Icons] as any;
            return (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left",
                  activeSection === s.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  s.id === "danger" && activeSection !== s.id && "text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                )}>
                <Icon className="h-4 w-4 shrink-0" />
                {s.label}
              </button>
            );
          })}
        </nav>

        {/* Pill tabs — mobile */}
        <div className="md:hidden flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                activeSection === s.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80",
                s.id === "danger" && activeSection !== s.id && "text-destructive bg-destructive/10"
              )}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">{renderSection()}</div>
      </div>
    </div>
  );
}
