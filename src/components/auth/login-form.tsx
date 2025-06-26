
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
import { AuthCard } from "./auth-card";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { FirebaseError } from "firebase/app";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
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
      // The auth context will redirect via the layout components
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
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={form.formState.isSubmitting || isGoogleLoading}>
            {form.formState.isSubmitting ? "Logging in..." : "Log In"}
          </Button>
        </form>
      </Form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
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
          Sign up
        </Link>
      </div>
    </AuthCard>
  );
}

