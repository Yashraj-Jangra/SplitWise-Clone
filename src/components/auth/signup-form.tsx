

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { FirebaseError } from 'firebase/app';
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import type { SiteSettings } from "@/types";

const signupSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }),
  lastName: z.string().optional(),
  username: z.string()
    .min(3, { message: "Username must be at least 3 characters." })
    .max(20, { message: "Username must be less than 20 characters." })
    .regex(/^[a-zA-Z0-9_]+$/, { message: "Username can only contain letters, numbers, and underscores."}),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long." }),
});

type SignupFormValues = z.infer<typeof signupSchema>;

interface SignupFormProps {
    authPageSettings?: SiteSettings['authPage'];
    appName: string;
}

export function SignupForm({ authPageSettings, appName }: SignupFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { signup, loginWithGoogle } = useAuth();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: SignupFormValues) {
    try {
      const { password, ...signupData } = values;
      await signup(signupData, password);
      toast({
        title: "Account Created!",
        description: "You can now log in with your new account.",
      });
      router.push("/auth/login");
    } catch (error) {
      let description = "An unknown error occurred.";
      if (error instanceof FirebaseError) {
        if (error.code === 'auth/email-already-in-use') {
          description = "This email address is already in use.";
           form.setError("email", { type: "manual", message: description });
        } else {
          description = `Signup failed: ${error.message}`;
        }
      } else if (error instanceof Error) {
        if (error.message.toLowerCase().includes("username")) {
            description = error.message;
            form.setError("username", { type: "manual", message: description });
        } else {
            description = error.message;
        }
      }
      toast({
        variant: "destructive",
        title: "Signup Failed",
        description,
      });
    }
  }

  async function handleGoogleLogin() {
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
      toast({
        title: "Sign Up Successful",
        description: "Welcome!",
      });
      router.push("/dashboard");
    } catch (error) {
      let description = "An unknown error occurred. Please try again.";
      if (error instanceof FirebaseError) {
        description = `Sign up failed: ${error.message}`;
      }
      toast({
        variant: "destructive",
        title: "Google Sign-Up Failed",
        description: description,
      });
    } finally {
      setIsGoogleLoading(false);
    }
  }

  return (
    <div className="w-full">
      <div className="text-center md:text-left mb-8">
        <Link href="/" className="inline-block mb-4">
          <Icons.Logo className="h-10 w-10 text-primary" />
        </Link>
        <h1 className="text-3xl font-bold font-headline">{authPageSettings?.signupTitle || "Create an Account"}</h1>
        <p className="text-muted-foreground mt-1">{authPageSettings?.signupSubtitle?.replace('{appName}', appName) || `Join ${appName} to simplify your group expenses.`}</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                            <Input placeholder={authPageSettings?.signupFirstNamePlaceholder || "John"} {...field} className="border-x-0 border-t-0 border-b-2 rounded-none bg-transparent px-1 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Last Name (Optional)</FormLabel>
                        <FormControl>
                            <Input placeholder={authPageSettings?.signupLastNamePlaceholder || "Doe"} {...field} className="border-x-0 border-t-0 border-b-2 rounded-none bg-transparent px-1 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
            <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                    <Input placeholder={authPageSettings?.signupUsernamePlaceholder || "johndoe99"} {...field} className="border-x-0 border-t-0 border-b-2 rounded-none bg-transparent px-1 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition" />
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                    <Input type="email" placeholder={authPageSettings?.signupEmailPlaceholder || "you@example.com"} {...field} className="border-x-0 border-t-0 border-b-2 rounded-none bg-transparent px-1 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition" />
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
                    <Input type="password" placeholder={authPageSettings?.signupPasswordPlaceholder || "••••••••"} {...field} className="border-x-0 border-t-0 border-b-2 rounded-none bg-transparent px-1 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition" />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            
            <Button type="submit" className="w-full bg-secondary-foreground text-secondary hover:bg-secondary-foreground/90 mt-6" disabled={form.formState.isSubmitting || isGoogleLoading}>
                {form.formState.isSubmitting ? "Creating Account..." : "Create Account"}
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
        Already have an account?{" "}
        <Link href="/auth/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </div>
    </div>
  );
}
