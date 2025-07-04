

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { FirebaseError } from "firebase/app";
import type { SiteSettings } from "@/types";

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
  const { login, loginWithGoogle } = useAuth();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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
    } catch (error) {
      let description = "An unknown error occurred. Please try again.";
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            description = "Invalid email or password. Please try again.";
            break;
          default:
            description = `Login failed: ${error.message}`;
        }
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
      toast({
        title: "Login Successful",
        description: "Welcome!",
      });
      router.push("/dashboard");
    } catch (error) {
       let description = "An unknown error occurred. Please try again.";
      if (error instanceof FirebaseError) {
        description = `Login failed: ${error.message}`;
      }
      toast({
        variant: "destructive",
        title: "Google Login Failed",
        description: description,
      });
    } finally {
      setIsGoogleLoading(false);
    }
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
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder={authPageSettings?.loginEmailPlaceholder || "you@example.com"} {...field} className="border-x-0 border-t-0 border-b-2 rounded-none bg-transparent px-1 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition" />
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
                    <FormLabel>Password</FormLabel>
                    <Link
                        href="/auth/forgot-password"
                        className="text-sm font-medium text-primary hover:underline"
                    >
                        Forgot password?
                    </Link>
                </div>
                <FormControl>
                  <Input type="password" placeholder={authPageSettings?.loginPasswordPlaceholder || "••••••••"} {...field} className="border-x-0 border-t-0 border-b-2 rounded-none bg-transparent px-1 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full bg-secondary-foreground text-secondary hover:bg-secondary-foreground/90" disabled={form.formState.isSubmitting || isGoogleLoading}>
            {form.formState.isSubmitting ? "Logging in..." : "Sign In"}
          </Button>
        </form>
      </Form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            Or
          </span>
        </div>
      </div>
      <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={form.formState.isSubmitting || isGoogleLoading}>
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
