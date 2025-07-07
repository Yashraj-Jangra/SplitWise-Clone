
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Icons } from '@/components/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from "@/components/ui/label";

import { useAuth } from '@/contexts/auth-context';
import { useToast } from "@/hooks/use-toast";
import { updateUser, isUsernameTaken } from "@/lib/mock-data";
import { getFullName, getInitials } from "@/lib/utils";
import { useSiteSettings } from "@/contexts/site-settings-context";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().optional(),
  username: z.string()
    .min(3, "Username must be at least 3 characters.")
    .max(20, "Username must be less than 20 characters.")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores."),
  email: z.string().email(),
  mobileNumber: z.string().optional(),
  dob: z.string().optional(),
  avatarUrl: z.string().url("Please enter a valid URL.").or(z.literal('')).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const { userProfile, loading } = useAuth();
  const { settings: siteSettings, loading: siteSettingsLoading } = useSiteSettings();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      mobileNumber: '',
      dob: '',
      avatarUrl: '',
    },
  });

  useEffect(() => {
    if (userProfile) {
      form.reset({
        firstName: userProfile.firstName,
        lastName: userProfile.lastName || '',
        username: userProfile.username,
        email: userProfile.email,
        mobileNumber: userProfile.mobileNumber || '',
        dob: userProfile.dob ? new Date(userProfile.dob).toISOString() : '',
        avatarUrl: userProfile.avatarUrl || '',
      });
    }
  }, [userProfile, form]);

  async function onSubmit(values: ProfileFormValues) {
    if (!userProfile) return;

    try {
        if (values.username.toLowerCase() !== userProfile.username.toLowerCase()) {
            const taken = await isUsernameTaken(values.username, userProfile.uid);
            if (taken) {
                form.setError("username", { type: "manual", message: "This username is already taken." });
                return;
            }
        }
        
        await updateUser(userProfile.uid, {
            ...values,
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

  if (loading || !userProfile || siteSettingsLoading) {
    return (
        <div className="space-y-8 max-w-3xl mx-auto">
            <Skeleton className="h-12 w-1/3" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
        </div>
    )
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-headline text-foreground animate-in fade-in slide-in-from-bottom-2 duration-500">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences and information.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Icons.Users className="h-5 w-5 mr-2 text-primary" />
                Profile Information
              </CardTitle>
              <CardDescription>Update your personal details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4 mb-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={form.watch('avatarUrl') || userProfile.avatarUrl} alt={getFullName(userProfile.firstName, userProfile.lastName)} />
                  <AvatarFallback className="text-2xl">{getInitials(userProfile.firstName, userProfile.lastName)}</AvatarFallback>
                </Avatar>
                <div className="w-full">
                    <FormField
                      control={form.control}
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
                </div>
              </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={form.control} name="username" render={({ field }) => (<FormItem><FormLabel>Username</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} disabled /></FormControl><FormMessage /></FormItem>)} />
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="mobileNumber" render={({ field }) => (<FormItem><FormLabel>Mobile Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="dob" render={({ field }) => (
                    <FormItem className="flex flex-col pt-2"><FormLabel className="mb-[0.6rem]">Date of Birth</FormLabel>
                        <Popover><PopoverTrigger asChild><FormControl>
                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                                <Icons.Calendar className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => field.onChange(date?.toISOString())} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
                        </PopoverContent></Popover><FormMessage />
                    </FormItem>)} 
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Icons.ShieldCheck className="h-5 w-5 mr-2 text-primary" />
            Security
          </CardTitle>
          <CardDescription>Manage your account security settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input id="currentPassword" type="password" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="newPassword">New Password</Label>
            <Input id="newPassword" type="password" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input id="confirmPassword" type="password" />
          </div>
           <div className="flex justify-end">
            <Button>Change Password</Button>
          </div>
        </CardContent>
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
