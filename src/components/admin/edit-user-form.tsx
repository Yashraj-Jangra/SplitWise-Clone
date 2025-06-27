
'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile } from "@/types";
import { updateUser } from "@/lib/mock-data";
import { Icons } from "@/components/icons";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const editUserSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }),
  lastName: z.string().optional(),
  username: z.string().min(3, "Username must be at least 3 characters."),
  email: z.string().email({ message: "Please enter a valid email." }),
  role: z.enum(["admin", "user"], { required_error: "Role is required." }),
  mobileNumber: z.string().optional(),
  dob: z.string().optional(),
});

type EditUserFormValues = z.infer<typeof editUserSchema>;

interface EditUserFormProps {
  user: UserProfile;
}

export function EditUserForm({ user }: EditUserFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isMainAdmin = user.email === 'jangrayash1505@gmail.com';

  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName || '',
      username: user.username,
      email: user.email,
      role: user.role,
      mobileNumber: user.mobileNumber || '',
      dob: user.dob ? new Date(user.dob).toISOString() : '',
    },
  });

  async function onSubmit(values: EditUserFormValues) {
    if (isMainAdmin && values.role !== 'admin') {
      toast({
        variant: "destructive",
        title: "Action Not Allowed",
        description: "The main admin's role cannot be changed.",
      });
      form.setValue('role', 'admin');
      return;
    }

    try {
        const updatedUser = await updateUser(user.uid, {
            ...values,
            lastName: values.lastName || undefined,
            mobileNumber: values.mobileNumber || undefined,
            dob: values.dob || undefined,
        });

        if (updatedUser) {
        toast({
            title: "User Updated",
            description: `Successfully updated profile for ${updatedUser.firstName}.`,
        });
        router.push("/admin/users");
        router.refresh();
        } else {
            throw new Error("Failed to get updated user.")
        }
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: error instanceof Error ? error.message : "Could not update the user. Please try again.",
        });
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                 <FormField control={form.control} name="firstName" render={({ field }) => ( <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="lastName" render={({ field }) => ( <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
             <FormField control={form.control} name="username" render={({ field }) => ( <FormItem><FormLabel>Username</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                <FormField control={form.control} name="mobileNumber" render={({ field }) => ( <FormItem><FormLabel>Mobile Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="dob" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel className="mb-2">Date of Birth</FormLabel>
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
            
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isMainAdmin}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                    </Select>
                    {isMainAdmin && <FormDescription>The main admin role cannot be changed.</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? (
                      <>
                        <Icons.AppLogo className="mr-2 h-4 w-4 animate-spin" /> Saving...
                      </>
                  ) : "Save Changes"}
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
