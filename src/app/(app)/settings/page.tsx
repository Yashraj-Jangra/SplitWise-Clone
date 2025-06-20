
import type { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Icons } from '@/components/icons';
import { mockCurrentUser } from '@/lib/mock-data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export const metadata: Metadata = {
  title: 'Settings - SettleEase',
  description: 'Manage your account settings and preferences.',
};

const getInitials = (name: string) => {
    const names = name.split(' ');
    let initials = names[0].substring(0, 1).toUpperCase();
    if (names.length > 1) {
      initials += names[names.length - 1].substring(0, 1).toUpperCase();
    }
    return initials;
};


export default function SettingsPage() {
  const user = mockCurrentUser;

  // In a real app, these would be form fields handled by react-hook-form
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-headline text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences and information.</p>
      </div>

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
              <AvatarImage src={user.avatarUrl} alt={user.name} />
              <AvatarFallback className="text-2xl">{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div>
              <Button variant="outline">Change Avatar</Button>
              <p className="text-xs text-muted-foreground mt-1">JPG, GIF or PNG. Max size of 800K.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" defaultValue={user.name} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" defaultValue={user.email} disabled /> {/* Email usually not editable directly */}
            </div>
          </div>
          <Button className="mt-4">Save Profile</Button>
        </CardContent>
      </Card>

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
          <Button>Change Password</Button>
        </CardContent>
      </Card>
      
      <Separator />

       <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Icons.Delete className="h-5 w-5 mr-2 text-destructive" />
            Account Deletion
          </CardTitle>
          <CardDescription>Permanently delete your SettleEase account.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
                Once you delete your account, there is no going back. All your data, including groups, expenses, and settlements, will be permanently removed. Please be certain.
            </p>
          <Button variant="destructive">Delete My Account</Button>
        </CardContent>
      </Card>
    </div>
  );
}
