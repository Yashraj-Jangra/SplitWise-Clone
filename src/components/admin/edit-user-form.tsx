'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/types';
import { updateUser } from '@/lib/api.client';
import { Icons } from '@/components/icons';
import { cn, getInitials } from '@/lib/utils';
import { KeyRound, Lock, Shield, User, CreditCard, Eye, EyeOff, Save, CheckCircle2 } from 'lucide-react';

const editUserSchema = z.object({
  firstName: z.string().min(1, { message: 'First name is required.' }),
  lastName: z.string().optional(),
  username: z.string().min(3, 'Username must be at least 3 characters.').max(25),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  role: z.enum(['admin', 'user'], { required_error: 'Role is required.' }),
  countryCode: z.string().optional(),
  mobileNumber: z.string().optional(),
  upiId: z.string().optional(),
  dob: z.string().optional(),
  avatarUrl: z.string().url('Please enter a valid URL.').or(z.literal('')).optional(),
});

type EditUserFormValues = z.infer<typeof editUserSchema>;

const passwordResetSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters.'),
  confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters.'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

type PasswordResetValues = z.infer<typeof passwordResetSchema>;

interface EditUserFormProps {
  user: UserProfile;
}

export function EditUserForm({ user }: EditUserFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isMainAdmin = user.email === 'jangrayash1505@gmail.com';

  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Profile Form
  const profileForm = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      username: user.username || '',
      email: user.email || '',
      role: user.role || 'user',
      countryCode: user.countryCode || '+91',
      mobileNumber: user.mobileNumber || '',
      upiId: user.upiId || '',
      dob: user.dob ? new Date(user.dob).toISOString() : '',
      avatarUrl: user.avatarUrl || '',
    },
  });

  // Password Reset Form (No Old Password Required for Admins)
  const passwordForm = useForm<PasswordResetValues>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Save Profile Updates
  async function onProfileSubmit(values: EditUserFormValues) {
    if (isMainAdmin && values.role !== 'admin') {
      toast({
        variant: 'destructive',
        title: 'Action Not Allowed',
        description: "The main admin's role cannot be changed.",
      });
      profileForm.setValue('role', 'admin');
      return;
    }

    try {
      const updatedUser = await updateUser(user.uid, {
        ...values,
        lastName: values.lastName || undefined,
        mobileNumber: values.mobileNumber || undefined,
        upiId: values.upiId || undefined,
        dob: values.dob || undefined,
        avatarUrl: values.avatarUrl || undefined,
      });

      if (updatedUser) {
        toast({
          title: 'User Profile Updated',
          description: `Successfully updated user profile for ${updatedUser.firstName}.`,
        });
        router.refresh();
      } else {
        throw new Error('Failed to update user profile.');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Could not update user details.',
      });
    }
  }

  // Admin Direct Password Reset (No Old Password Needed)
  async function onPasswordResetSubmit(values: PasswordResetValues) {
    setIsResettingPassword(true);
    try {
      const res = await fetch(`/api/admin/users/${user.uid}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: values.newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset user password.');
      }

      toast({
        title: 'Password Reset Successful',
        description: `Successfully set new password for ${user.firstName}.`,
      });

      passwordForm.reset();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Password Reset Failed',
        description: error.message || 'Could not reset password. Please try again.',
      });
    } finally {
      setIsResettingPassword(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Profile Summary */}
      <Card className="border border-border bg-card shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Avatar className="h-16 w-16 rounded-xl border border-border">
              <AvatarImage src={profileForm.watch('avatarUrl') || user.avatarUrl} alt={user.firstName} />
              <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary rounded-xl">
                {getInitials(`${user.firstName} ${user.lastName || ''}`)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-0.5 text-center sm:text-left flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-xl font-extrabold text-foreground">
                  {profileForm.watch('firstName')} {profileForm.watch('lastName')}
                </h2>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider',
                    user.role === 'admin'
                      ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      : 'bg-muted text-muted-foreground border border-border'
                  )}
                >
                  {user.role}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{user.email}</p>
              <p className="text-[11px] font-mono text-muted-foreground/70">ID: {user.uid}</p>
            </div>
            <Button variant="outline" size="sm" className="rounded-lg text-xs font-bold border-border h-8" onClick={() => router.push('/admin/users')}>
              Back to Users
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Profile & Security Settings */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full space-y-4">
        <TabsList className="grid grid-cols-2 max-w-sm h-9 rounded-xl bg-muted/50 p-1 border border-border">
          <TabsTrigger value="profile" className="rounded-lg text-xs font-bold transition-all gap-1.5 py-1">
            <User className="h-3.5 w-3.5" /> Profile & Details
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg text-xs font-bold transition-all gap-1.5 py-1">
            <Lock className="h-3.5 w-3.5" /> Password & Security
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Profile Details */}
        <TabsContent value="profile" className="space-y-4">
          <Card className="border border-border bg-card shadow-sm rounded-2xl">
            <CardHeader className="p-4 border-b border-border/40 pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <User className="h-4 w-4 text-primary" /> Profile & Contact Details
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Update user personal details, contact number, and payment info.</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">First Name</FormLabel>
                          <FormControl>
                            <Input className="h-11 rounded-xl bg-muted/20 border-border/30" {...field} />
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
                          <FormLabel className="text-sm font-medium">Last Name</FormLabel>
                          <FormControl>
                            <Input className="h-11 rounded-xl bg-muted/20 border-border/30" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Username</FormLabel>
                          <FormControl>
                            <Input className="h-11 rounded-xl bg-muted/20 border-border/30" {...field} />
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
                          <FormLabel className="text-sm font-medium">Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" className="h-11 rounded-xl bg-muted/20 border-border/30" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="mobileNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Mobile Number</FormLabel>
                          <FormControl>
                            <Input placeholder="+91 9876543210" className="h-11 rounded-xl bg-muted/20 border-border/30" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="dob"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="mb-1 text-sm font-medium">Date of Birth</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    'h-11 rounded-xl bg-muted/20 border-border/30 pl-3 text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                >
                                  {field.value ? format(new Date(field.value), 'PPP') : <span>Pick a date</span>}
                                  <Icons.Calendar className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
                              <Calendar
                                mode="single"
                                captionLayout="dropdown-buttons"
                                fromYear={1900}
                                toYear={new Date().getFullYear()}
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(date) => field.onChange(date?.toISOString())}
                                disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="upiId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium flex items-center gap-1.5">
                            <CreditCard className="h-4 w-4 text-emerald-500" /> UPI ID (Payment Settlement)
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="username@upi" className="h-11 rounded-xl bg-muted/20 border-border/30" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium flex items-center gap-1.5">
                            <Shield className="h-4 w-4 text-amber-500" /> Account Role
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isMainAdmin}>
                            <FormControl>
                              <SelectTrigger className="h-11 rounded-xl bg-muted/20 border-border/30">
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          {isMainAdmin && <FormDescription className="text-xs">The main admin role cannot be changed.</FormDescription>}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={profileForm.control}
                    name="avatarUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Avatar Image URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/avatar.jpg" className="h-11 rounded-xl bg-muted/20 border-border/30" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-3 pt-4 border-t border-border/20">
                    <Button type="button" variant="ghost" className="h-10 rounded-xl" onClick={() => router.back()}>
                      Cancel
                    </Button>
                    <Button type="submit" className="h-10 rounded-xl px-5 gap-2" disabled={profileForm.formState.isSubmitting}>
                      {profileForm.formState.isSubmitting ? (
                        <>
                          <Icons.AppLogo className="h-4 w-4 animate-spin" /> Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" /> Save Profile Changes
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Security & Password Reset (No Old Password Required) */}
        <TabsContent value="security" className="space-y-6">
          <Card className="border-border/30 bg-card/60 backdrop-blur-md shadow-lg rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-amber-500" /> Admin Direct Password Reset
              </CardTitle>
              <CardDescription>
                Set a new password for this user directly. As an administrator, you do not need to provide the user's old password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordResetSubmit)} className="space-y-6 max-w-md">
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Minimum 6 characters"
                              className="h-11 rounded-xl bg-muted/20 border-border/30 pr-10"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
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
                        <FormLabel className="text-sm font-medium">Confirm New Password</FormLabel>
                        <FormControl>
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Re-enter new password"
                            className="h-11 rounded-xl bg-muted/20 border-border/30"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-2">
                    <Button type="submit" className="h-11 rounded-xl px-6 gap-2 bg-amber-500 hover:bg-amber-600 text-white font-medium shadow-lg shadow-amber-500/20" disabled={isResettingPassword}>
                      {isResettingPassword ? (
                        <>
                          <Icons.AppLogo className="h-4 w-4 animate-spin" /> Resetting Password...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" /> Set New Password
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
