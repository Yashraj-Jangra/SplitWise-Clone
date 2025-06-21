
'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@/types";
import { updateUser } from "@/lib/mock-data";
import { Icons } from "@/components/icons";

const editUserSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  role: z.enum(["admin", "user"], { required_error: "Role is required." }),
});

type EditUserFormValues = z.infer<typeof editUserSchema>;

interface EditUserFormProps {
  user: User;
}

export function EditUserForm({ user }: EditUserFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });

  async function onSubmit(values: EditUserFormValues) {
    const updatedUser = await updateUser(user.id, values);

    if (updatedUser) {
      toast({
        title: "User Updated",
        description: `Successfully updated profile for ${updatedUser.name}.`,
      });
      router.push("/admin/users");
      router.refresh(); // To ensure the user list is updated
    } else {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not update the user. Please try again.",
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit User Details</CardTitle>
        <CardDescription>Update the user's information and role.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
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
