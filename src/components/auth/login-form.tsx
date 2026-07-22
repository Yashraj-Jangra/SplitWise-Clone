
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import type { SiteSettings } from "@/types";
import AppLoading from "@/app/(app)/loading";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
    authPageSettings?: SiteSettings['authPage'];
    appName: string;
}

export function LoginForm({ authPageSettings, appName }: LoginFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { userProfile, loading, login, loginWithGoogle } = useAuth();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    // If auth is not loading and a user is logged in, redirect to dashboard.
    if (!loading && userProfile) {
      router.replace('/dashboard');
    }
  }, [userProfile, loading, router]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    try {
      await login(values.email, values.password);
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      router.push("/dashboard");
    } catch (error: any) {
      let description = error.message || "Invalid email or password. Please try again.";
      if (description.includes("credential") || description.includes("password") || description.includes("user")) {
        description = "Invalid email or password. Please try again.";
      }
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: description,
      });
       form.setError("email", { type: "manual", message: " "});
       form.setError("password", { type: "manual", message: " "});
    }
  }

  async function handleGoogleLogin() {
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (error: any) {
       let description = error.message || "An unknown error occurred. Please try again.";
      toast({
        variant: "destructive",
        title: "Google Login Failed",
        description: description,
      });
    } finally {
      setIsGoogleLoading(false);
    }
  }

  // Show a loading state while we check for an active session.
  if (loading || userProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] w-full">
        <Icons.AppLogo className="h-10 w-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full">
        <div className="text-center md:text-left mb-8">
            <Link href="/landing" className="inline-block mb-4">
                <Icons.Logo className="h-10 w-10 text-primary" />
            </Link>
            <h1 className="text-3xl font-bold font-headline">{authPageSettings?.loginTitle || "Welcome Back"}</h1>
            <p className="text-muted-foreground mt-1">{authPageSettings?.loginSubtitle?.replace('{appName}', appName) || `Enter your credentials to access your account.`}</p>
        </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder={authPageSettings?.loginEmailPlaceholder || "you@example.com"} {...field} className="h-11 rounded-xl bg-muted/20 border-border/30 px-4 text-sm font-normal focus-visible:ring-primary focus-visible:border-primary transition-all" />
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
                 <div className="flex items-center justify-between">
                    <FormLabel className="text-sm font-medium">Password</FormLabel>
                    <Link
                        href="/auth/forgot-password"
                        className="text-sm font-medium text-primary hover:underline"
                    >
                        Forgot password?
                    </Link>
                </div>
                <FormControl>
                  <Input type="password" placeholder={authPageSettings?.loginPasswordPlaceholder || "••••••••"} {...field} className="h-11 rounded-xl bg-muted/20 border-border/30 px-4 text-sm font-normal focus-visible:ring-primary focus-visible:border-primary transition-all" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full h-11 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors" disabled={form.formState.isSubmitting || isGoogleLoading}>
            {form.formState.isSubmitting ? "Logging in..." : "Sign In"}
          </Button>
        </form>
      </Form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/30" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            Or
          </span>
        </div>
      </div>
      <Button variant="outline" className="w-full h-11 rounded-xl text-sm font-medium border-border/30 bg-muted/10 hover:bg-muted/30 transition-colors" onClick={handleGoogleLogin} disabled={form.formState.isSubmitting || isGoogleLoading}>
        {isGoogleLoading ? (
          <Icons.AppLogo className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Icons.Google className="mr-2 h-4 w-4" />
        )}
        Google
      </Button>

      <div className="mt-6 text-center text-sm">
        Don't have an account?{" "}
        <Link href="/auth/signup" className="font-medium text-primary hover:underline">
          Create Account
        </Link>
      </div>
    </div>
  );
}
