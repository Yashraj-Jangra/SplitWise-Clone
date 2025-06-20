
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AuthCard } from "./auth-card";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { mockUsers } from "@/lib/mock-data"; // Import mockUsers

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    console.log("Login attempt with:", values);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const enteredEmail = values.email.toLowerCase();
    const potentialUser = mockUsers.find(u => u.email.toLowerCase() === enteredEmail);

    let toastTitle = "Login Successful";
    let toastDescription = "Welcome back!";

    if (potentialUser) {
      if (potentialUser.role === 'admin' && enteredEmail === 'admin@example.com') {
        toastTitle = `Admin Login Successful`;
        toastDescription = `Welcome, ${potentialUser.name}! (Admin privileges simulated)`;
        // Note: The password "123456" is not actually checked here.
      } else if (potentialUser.role === 'user' && enteredEmail === 'user@example.com') {
        toastTitle = `User Login Successful`;
        toastDescription = `Welcome, ${potentialUser.name}!`;
        // Note: The password "123456" is not actually checked here.
      } else if (enteredEmail === 'alice@example.com') {
         toastDescription = `Welcome back, ${potentialUser.name}!`;
      }
    }
    // For any other email, it will also "succeed" due to the mock nature.
    // The app will continue to use mockCurrentUser (Alice) for most data displays.

    toast({
      title: toastTitle,
      description: toastDescription,
    });
    router.push("/dashboard"); 
  }

  return (
    <AuthCard
      title="Welcome Back!"
      description="Log in to manage your shared expenses."
      icon={<Icons.Login className="h-12 w-12 text-primary" />}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="you@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="•••••••• (e.g., 123456 for test accounts)" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Logging in..." : "Log In"}
          </Button>
        </form>
      </Form>
      <div className="mt-6 text-center text-sm">
        Don't have an account?{" "}
        <Link href="/auth/signup" className="font-medium text-primary hover:underline">
          Sign up
        </Link>
      </div>
      <p className="mt-4 text-xs text-center text-muted-foreground">
        Test accounts: admin@example.com, user@example.com (password: 123456 - not validated).
      </p>
    </AuthCard>
  );
}
