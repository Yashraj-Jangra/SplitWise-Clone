"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { cn, getFullName, getInitials } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { EmailManagementSection } from "@/components/settings/email-management-section";

import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { updateUser } from "@/lib/api.client";
import { getUserNotificationPrefs, updateUserNotificationPrefs } from "@/lib/api.client";

import { useSiteSettings } from "@/contexts/site-settings-context";
import { useTheme } from "@/contexts/theme-context";
import { requestPushPermission } from "@/lib/push-service";
import type { NotificationEventType, UserNotificationPrefsDocument } from "@/types";
import {
  AlertCircle,
  Bell,
  Check,
  ChevronRight,
  Globe,
  Key,
  Lock,
  Mail,
  Palette,


  Save,
  ShieldCheck,
  Smartphone,
  User,
} from "lucide-react";

// --- Validation Schemas ---
const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().optional(),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers and underscores only."),
  email: z.string().email(),
  countryCode: z.string().optional(),
  mobileNumber: z.string().optional(),
  upiId: z.string().optional(),
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

const SECTIONS = [
  { id: "profile", label: "Profile & Payment", icon: User, description: "Personal details and UPI QR setup" },
  { id: "security", label: "Security & Login", icon: Lock, description: "Password & account authentication" },
  { id: "notifications", label: "Notifications", icon: Bell, description: "In-app, push & email alerts" },
  { id: "appearance", label: "Appearance", icon: Palette, description: "Themes & visual preferences" },
] as const;

type SectionId = typeof SECTIONS[number]["id"];

export default function SettingsPage() {
  const { userProfile, currentUser, hasPassword, isGoogleLinked, linkWithGoogle, unlinkFromGoogle, updateUserPassword } = useAuth();
  const { settings: siteSettings } = useSiteSettings();
  const { theme: currentTheme, setTheme, allThemes } = useTheme();
  const { toast } = useToast();
  const searchParams = useSearchParams();


  const initialTab = (searchParams.get("tab") as SectionId) || "profile";
  const [activeTab, setActiveTab] = useState<SectionId>(initialTab);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [browserNotifPermission, setBrowserNotifPermission] = useState("default");
  // Full profile loaded from API (includes upiId which Better Auth session omits)
  const [apiProfile, setApiProfile] = useState<import("@/types").UserProfile | null>(null);


  // Country Code List Memoization to prevent infinite effect triggers
  const countryCodesList = useMemo(() => {
    const raw = siteSettings?.countryCodes?.length
      ? siteSettings.countryCodes
      : [
          { name: 'India', code: '+91', flag: '🇮🇳' },
          { name: 'United States', code: '+1', flag: '🇺🇸' },
          { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
          { name: 'Australia', code: '+61', flag: '🇦🇺' },
          { name: 'UAE', code: '+971', flag: '🇦🇪' },
          { name: 'Canada', code: '+1-CA', flag: '🇨🇦' },
        ];
    // Deduplicate by code so SelectItem values are always unique
    const seen = new Set<string>();
    return raw.filter((cc) => {
      if (seen.has(cc.code)) return false;
      seen.add(cc.code);
      return true;
    });
  }, [siteSettings?.countryCodes]);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      countryCode: "+91",
      mobileNumber: "",
      upiId: "",
      dob: "",
      avatarUrl: "",
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const notifForm = useForm<NotifFormValues>({
    resolver: zodResolver(notifSchema),
    defaultValues: { inAppEnabled: true, pushEnabled: true, emailEnabled: true, events: {} },
  });

  // Load User Notifications Preferences
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setBrowserNotifPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    async function loadPrefs() {
      if (!userProfile) return;
      try {
        const prefs = await getUserNotificationPrefs(userProfile.uid);
        notifForm.reset({
          inAppEnabled: prefs.inAppEnabled,
          pushEnabled: prefs.pushEnabled,
          emailEnabled: prefs.emailEnabled,
          events: prefs.events as any,
        });
      } catch (err) {
        console.error("Failed to load user notification prefs:", err);
      }
    }
    loadPrefs();
  }, [userProfile]);

  // Sync profileForm with userProfile — runs ONLY on initial load (uid change).
  // We load the full profile from the API because the Better Auth session
  // deliberately omits custom fields like upiId.
  useEffect(() => {
    if (!userProfile?.uid) return;
    let cancelled = false;
    fetch(`/api/user/profile?userId=${userProfile.uid}`)
      .then(r => r.ok ? r.json() : null)
      .then((profile) => {
        if (cancelled || !profile) return;
        setApiProfile(profile);
        profileForm.reset({
          firstName: profile.firstName || "",
          lastName: profile.lastName || "",
          username: profile.username || "",
          email: profile.email || "",
          countryCode: profile.countryCode || "+91",
          mobileNumber: profile.mobileNumber || "",
          upiId: profile.upiId || "",
          dob: profile.dob ? new Date(profile.dob).toISOString() : "",
          avatarUrl: profile.avatarUrl || "",
        });
      })
      .catch(console.error);
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.uid]);


  // Track Unsaved Dirty States
  const isProfileDirty = profileForm.formState.isDirty;
  const isPasswordDirty = passwordForm.formState.isDirty;
  const isNotifDirty = notifForm.formState.isDirty;

  // Form Submissions
  const onProfileSubmit = async (values: ProfileFormValues) => {
    if (!userProfile) return;
    try {
      const updated = await updateUser(userProfile.uid, {
        firstName: values.firstName,
        lastName: values.lastName || undefined,
        username: values.username,
        email: values.email,
        countryCode: values.countryCode || undefined,
        mobileNumber: values.mobileNumber || undefined,
        upiId: values.upiId ?? "",   // send "" to allow clearing; service maps "" → null
        dob: values.dob || undefined,
        avatarUrl: values.avatarUrl || undefined,
      });

      // Keep apiProfile in sync so the uid-only useEffect doesn't re-fetch stale data
      setApiProfile(updated);

      profileForm.reset({
        firstName: updated.firstName || "",
        lastName: updated.lastName || "",
        username: updated.username || "",
        email: updated.email || "",
        countryCode: updated.countryCode || "+91",
        mobileNumber: updated.mobileNumber || "",
        upiId: updated.upiId || "",
        dob: updated.dob ? new Date(updated.dob).toISOString() : "",
        avatarUrl: updated.avatarUrl || "",
      });

      toast({
        title: "Profile & Payment Details Saved",
        description: "Your changes have been updated successfully.",
      });

    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: e.message || "An unknown error occurred.",
      });
    }
  };


  const onPasswordSubmit = async (values: PasswordFormValues) => {
    try {
      await updateUserPassword(values.newPassword, hasPassword ? values.currentPassword : undefined);
      toast({ title: "Password Updated Successfully" });
      passwordForm.reset();
    } catch (e: any) {
      if (e.message?.includes("wrong") || e.message?.includes("password") || e.message?.includes("MISMATCH")) {
        passwordForm.setError("currentPassword", { type: "manual", message: "Incorrect current password." });
      }
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: e.message || "An unknown error occurred.",
      });
    }
  };

  const onNotifSubmit = async (values: NotifFormValues) => {
    if (!userProfile) return;
    try {
      await updateUserNotificationPrefs(userProfile.uid, values as unknown as UserNotificationPrefsDocument);
      notifForm.reset(values);
      toast({ title: "Notification Preferences Saved" });
    } catch {
      toast({ variant: "destructive", title: "Update Failed", description: "Could not save notification preferences." });
    }
  };

  const handleRequestPermission = async () => {
    if (!userProfile) return;
    const ok = await requestPushPermission(userProfile.uid);
    setBrowserNotifPermission(ok ? "granted" : "denied");
    toast(
      ok
        ? { title: "Push Notifications Enabled" }
        : { variant: "destructive", title: "Permission Denied", description: "Enable notifications in browser settings." }
    );
  };

  const handleConnectGoogle = async () => {
    setIsGoogleLoading(true);
    try {
      await linkWithGoogle();
      toast({ title: "Google Account Connected" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Connection Failed", description: e.message || "An error occurred." });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    setIsGoogleLoading(true);
    try {
      await unlinkFromGoogle();
      toast({ title: "Google Account Disconnected" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed", description: e.message || "An error occurred." });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const selectableThemes = allThemes.filter(t => siteSettings.userSelectableThemeIds?.includes(t.id));

  return (
    <div className="container max-w-6xl py-6 md:py-10 space-y-6">
      {/* ── Page Title & Subtitle ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Settings & Preferences</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your account details, payment UPI addresses, security, and app customization.
          </p>
        </div>
      </div>

      {/* ── Responsive Layout: Left Sidebar (Desktop) / Top Scrollbar (Mobile) ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Navigation Tabs */}
        <div className="md:col-span-4 lg:col-span-3">
          {/* Mobile Top Horizontal Scroll Bar */}
          <div className="flex md:hidden overflow-x-auto gap-2 pb-2 scrollbar-none snap-x">
            {SECTIONS.map(section => {
              const Icon = section.icon;
              const isSectionDirty =
                (section.id === "profile" && isProfileDirty) ||
                (section.id === "security" && isPasswordDirty) ||
                (section.id === "notifications" && isNotifDirty);

              return (
                <button
                  key={section.id}
                  onClick={() => setActiveTab(section.id)}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all snap-start border",
                    activeTab === section.id
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card/60 hover:bg-card text-muted-foreground border-border/40"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{section.label}</span>
                  {isSectionDirty && (
                    <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" title="Unsaved changes" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Desktop Left Vertical Nav */}
          <div className="hidden md:flex flex-col space-y-1.5 p-2 rounded-2xl bg-card/40 border border-border/40 backdrop-blur-md sticky top-20">
            {SECTIONS.map(section => {
              const Icon = section.icon;
              const isSectionDirty =
                (section.id === "profile" && isProfileDirty) ||
                (section.id === "security" && isPasswordDirty) ||
                (section.id === "notifications" && isNotifDirty);

              return (
                <button
                  key={section.id}
                  onClick={() => setActiveTab(section.id)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl text-left transition-all duration-200 group text-sm font-medium",
                    activeTab === section.id
                      ? "bg-primary text-primary-foreground shadow-md font-semibold"
                      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        activeTab === section.id ? "bg-primary-foreground/10 text-primary-foreground" : "bg-muted text-muted-foreground group-hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="truncate">
                      <p className="leading-none">{section.label}</p>
                      <p className={cn("text-[11px] mt-1 truncate", activeTab === section.id ? "text-primary-foreground/80" : "text-muted-foreground/70")}>
                        {section.description}
                      </p>
                    </div>
                  </div>

                  {isSectionDirty ? (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[10px] px-1.5 py-0.5 font-bold gap-1 shrink-0">
                      <AlertCircle className="h-3 w-3" />
                      !
                    </Badge>
                  ) : (
                    <ChevronRight className={cn("h-4 w-4 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity", activeTab === section.id && "opacity-100")} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Section Content Pane */}
        <div className="md:col-span-8 lg:col-span-9 space-y-6">
          {/* ───────────────────────────────────────────────────────────────── */}
          {/* TAB 1: PROFILE & PAYMENT DETAILS                                  */}
          {/* ───────────────────────────────────────────────────────────────── */}
          {activeTab === "profile" && (
            <Card className="border-border/40 bg-card/60 backdrop-blur-md shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-border/30 bg-muted/20 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      Profile & Payment Information
                      {isProfileDirty && (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-xs gap-1">
                          <AlertCircle className="h-3 w-3" /> Unsaved
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>Update your personal info and UPI address for Quick-Settle QR codes.</CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <Form {...profileForm}>
                  <form id="profile-form" onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                    {/* Avatar Display */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/30">
                      <Avatar className="h-16 w-16 border-2 border-primary/20 shadow-inner">
                        <AvatarImage src={profileForm.watch("avatarUrl") || userProfile?.avatarUrl} />
                        <AvatarFallback className="text-lg font-bold">
                          {getInitials(profileForm.watch("firstName"), profileForm.watch("lastName"))}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 w-full space-y-1.5 text-center sm:text-left">
                        <p className="text-sm font-semibold">{getFullName(profileForm.watch("firstName"), profileForm.watch("lastName")) || "User Profile"}</p>
                        <FormField
                          control={profileForm.control}
                          name="avatarUrl"
                          render={({ field }) => (
                            <FormItem className="w-full">
                              <FormControl>
                                <Input placeholder="Paste Image URL (https://...)" {...field} className="h-9 text-xs" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Name Fields Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={profileForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold">First Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="First Name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold">Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Last Name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Username & Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={profileForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold">Username *</FormLabel>
                            <FormControl>
                              <Input placeholder="username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold">Email Address</FormLabel>
                            <FormControl>
                              <Input placeholder="email@domain.com" {...field} disabled className="bg-muted/40 cursor-not-allowed" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Mobile Number & Clean Country Code */}
                    <div className="space-y-1.5">
                      <FormLabel className="text-xs font-semibold">Mobile Phone Number</FormLabel>
                      <div className="flex gap-2">
                        <FormField
                          control={profileForm.control}
                          name="countryCode"
                          render={({ field }) => (
                            <FormItem className="w-[110px] shrink-0">
                              <Select onValueChange={field.onChange} value={field.value || "+91"}>
                                <FormControl>
                                  <SelectTrigger className="h-10 text-xs">
                                    <SelectValue placeholder="Code" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {countryCodesList.map((cc) => (
                                    <SelectItem key={`${cc.name}-${cc.code}`} value={cc.code}>
                                      {cc.flag} {cc.code} ({cc.name})
                                    </SelectItem>
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
                                <Input placeholder="10-digit mobile number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>


                    {/* UPI ID */}
                    <FormField
                      control={profileForm.control}
                      name="upiId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold">UPI ID (VPA)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. username@okicici or 9876543210@paytm" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />


                    {/* Date of Birth */}
                    <FormField
                      control={profileForm.control}
                      name="dob"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="text-xs font-semibold">Date of Birth</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn("w-full sm:w-64 justify-start text-left font-normal h-10", !field.value && "text-muted-foreground")}
                                >
                                  {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                                  <Icons.Calendar className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                captionLayout="dropdown-buttons"
                                fromYear={1900}
                                toYear={new Date().getFullYear()}
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(d) => field.onChange(d?.toISOString())}
                                disabled={(d) => d > new Date() || d < new Date("1900-01-01")}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </CardContent>

              {/* Card Footer with Section Save Action */}
              <CardFooter className="border-t border-border/30 bg-muted/20 px-6 py-4 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {isProfileDirty ? (
                    <span className="text-amber-500 font-semibold flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" /> You have unsaved changes in Profile
                    </span>
                  ) : (
                    "Profile is up to date."
                  )}
                </div>
                <Button
                  type="submit"
                  form="profile-form"
                  disabled={!isProfileDirty || profileForm.formState.isSubmitting}
                  className={cn(
                    "rounded-xl gap-2 font-semibold text-xs transition-all",
                    isProfileDirty ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md" : ""
                  )}
                >
                  {profileForm.formState.isSubmitting ? (
                    <Icons.AppLogo className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Profile & Payment
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* ───────────────────────────────────────────────────────────────── */}
          {/* TAB 2: SECURITY & LOGIN                                           */}
          {/* ───────────────────────────────────────────────────────────────── */}
          {activeTab === "security" && (
            <div className="space-y-6">
              {/* Change Password Card */}
              <Card className="border-border/40 bg-card/60 backdrop-blur-md shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-border/30 bg-muted/20 px-6 py-5">
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    Security & Password
                    {isPasswordDirty && (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-xs gap-1">
                        <AlertCircle className="h-3 w-3" /> Unsaved
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Manage your authentication password and account credentials.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <Form {...passwordForm}>
                    <form id="password-form" onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                      {hasPassword && (
                        <FormField
                          control={passwordForm.control}
                          name="currentPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-semibold">Current Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={passwordForm.control}
                          name="newPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-semibold">New Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="At least 6 characters" {...field} />
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
                              <FormLabel className="text-xs font-semibold">Confirm New Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Confirm password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="border-t border-border/30 bg-muted/20 px-6 py-4 flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {isPasswordDirty ? (
                      <span className="text-amber-500 font-semibold flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" /> Unsaved password changes
                      </span>
                    ) : (
                      "Password meets security requirements."
                    )}
                  </div>
                  <Button
                    type="submit"
                    form="password-form"
                    disabled={!isPasswordDirty || passwordForm.formState.isSubmitting}
                    className="rounded-xl gap-2 font-semibold text-xs"
                  >
                    <Key className="h-4 w-4" />
                    Update Password
                  </Button>
                </CardFooter>
              </Card>

              {/* Email Management Section */}
              {userProfile && <EmailManagementSection userProfile={userProfile} />}
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────────── */}
          {/* TAB 3: NOTIFICATION PREFERENCES                                   */}
          {/* ───────────────────────────────────────────────────────────────── */}
          {activeTab === "notifications" && (
            <Card className="border-border/40 bg-card/60 backdrop-blur-md shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-border/30 bg-muted/20 px-6 py-5">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  Notification Preferences
                  {isNotifDirty && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-xs gap-1">
                      <AlertCircle className="h-3 w-3" /> Unsaved
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>Choose how you receive expense, payment, and balance alerts.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Browser Push Status */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-muted/30 border border-border/30">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-primary" /> Browser Push Notifications
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Status: <strong className="capitalize text-foreground">{browserNotifPermission}</strong>
                    </p>
                  </div>
                  {browserNotifPermission !== "granted" && (
                    <Button onClick={handleRequestPermission} variant="outline" size="sm" className="rounded-xl text-xs">
                      Enable Push Notifications
                    </Button>
                  )}
                </div>

                {/* Master Channels */}
                <Form {...notifForm}>
                  <form id="notif-form" onSubmit={notifForm.handleSubmit(onNotifSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <FormField
                        control={notifForm.control}
                        name="inAppEnabled"
                        render={({ field }) => (
                          <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/40 bg-background/50">
                            <div>
                              <p className="text-xs font-semibold">In-App Center</p>
                              <p className="text-[11px] text-muted-foreground">Notification bell</p>
                            </div>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </div>
                        )}
                      />

                      <FormField
                        control={notifForm.control}
                        name="pushEnabled"
                        render={({ field }) => (
                          <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/40 bg-background/50">
                            <div>
                              <p className="text-xs font-semibold">Push Alerts</p>
                              <p className="text-[11px] text-muted-foreground">Device alerts</p>
                            </div>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </div>
                        )}
                      />

                      <FormField
                        control={notifForm.control}
                        name="emailEnabled"
                        render={({ field }) => (
                          <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/40 bg-background/50">
                            <div>
                              <p className="text-xs font-semibold">Email Alerts</p>
                              <p className="text-[11px] text-muted-foreground">Inbox messages</p>
                            </div>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </div>
                        )}
                      />
                    </div>

                    {/* Detailed Management Link Button */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-muted/20 border border-border/30 hover:border-border/60 transition-colors">
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold flex items-center gap-2">
                          <Bell className="h-4 w-4 text-primary" /> Detailed Event Management
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Configure granular in-app, push, and email delivery rules per individual event type (expenses, settlements, reminders, budgets, etc.)
                        </p>
                      </div>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-xs gap-1.5 shrink-0 hover:bg-muted"
                      >
                        <Link href="/notifications/settings">
                          <span>Manage All Events</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
              <CardFooter className="border-t border-border/30 bg-muted/20 px-6 py-4 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {isNotifDirty ? (
                    <span className="text-amber-500 font-semibold flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" /> Unsaved notification settings
                    </span>
                  ) : (
                    "Preferences updated."
                  )}
                </div>
                <Button
                  type="submit"
                  form="notif-form"
                  disabled={!isNotifDirty || notifForm.formState.isSubmitting}
                  className="rounded-xl gap-2 font-semibold text-xs"
                >
                  <Save className="h-4 w-4" />
                  Save Preferences
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* ───────────────────────────────────────────────────────────────── */}
          {/* TAB 4: APPEARANCE & THEME CUSTOMIZATION                          */}
          {/* ───────────────────────────────────────────────────────────────── */}
          {activeTab === "appearance" && (
            <Card className="border-border/40 bg-card/60 backdrop-blur-md shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-border/30 bg-muted/20 px-6 py-5">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  Theme & Visual Customization
                </CardTitle>
                <CardDescription>Select your active application theme and color palette.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectableThemes.map((t) => {
                    const isActive = currentTheme === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        className={cn(
                          "flex flex-col text-left p-4 rounded-xl border transition-all duration-200 group relative",
                          isActive
                            ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                            : "border-border/40 hover:border-border hover:bg-muted/40"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-bold text-sm">{t.name}</p>
                          {isActive && (
                            <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.2">
                              Active
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-auto pt-4">
                          <div className="h-4 w-4 rounded-full border shadow-sm" style={{ backgroundColor: `hsl(${t.primary})` }} />
                          <div className="h-4 w-4 rounded-full border shadow-sm" style={{ backgroundColor: `hsl(${t.accent})` }} />
                          <div className="h-4 w-4 rounded-full border shadow-sm" style={{ backgroundColor: `hsl(${t.secondary})` }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
