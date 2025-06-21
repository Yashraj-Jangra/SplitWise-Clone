
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
import { useAuth } from "@/contexts/auth-context";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { login } = useAuth();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    // NOTE: The password is not actually validated in this mock setup.
    // In a real app, you'd send both email and password to your auth API.
    const loggedInUser = await login(values.email);

    if (loggedInUser) {
        let toastTitle = "Login Successful";
        let toastDescription = `Welcome back, ${loggedInUser.name}!`;

        if (loggedInUser.role === 'admin') {
            toastTitle = `Admin Login Successful`;
            toastDescription = `Welcome, ${loggedInUser.name}! Redirecting to Admin Panel.`;
            toast({ title: toastTitle, description: toastDescription });
            router.push("/admin/dashboard");
        } else {
            toast({ title: toastTitle, description: toastDescription });
            router.push("/dashboard");
        }
    } else {
        toast({
            variant: "destructive",
            title: "Login Failed",
            description: "No user found with that email. Please try again.",
        });
        form.setError("email", { type: "manual", message: "User not found."});
    }
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
                  <Input type="password" placeholder="•••••••• (e.g., 123456)" {...field} />
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
        Test accounts: alice@example.com, bob@example.com, admin@example.com.
      </p>
    </AuthCard>
  );
}
