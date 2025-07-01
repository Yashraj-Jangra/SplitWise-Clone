
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { FirebaseError } from "firebase/app";
import type { SiteSettings } from "@/types";

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordFormProps {
    authPageSettings?: SiteSettings['authPage'];
    appName: string;
}

export function ForgotPasswordForm({ authPageSettings, appName }: ForgotPasswordFormProps) {
    const { sendPasswordResetEmail } = useAuth();
    const { toast } = useToast();
    const [submitted, setSubmitted] = useState(false);

    const form = useForm<ForgotPasswordFormValues>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            email: "",
        },
    });

    async function onSubmit(values: ForgotPasswordFormValues) {
        try {
            await sendPasswordResetEmail(values.email);
            setSubmitted(true);
        } catch (error) {
            let description = "An unknown error occurred. Please try again.";
            if (error instanceof FirebaseError) {
                description = `Failed to send email: ${error.message}`;
            }
            toast({
                variant: "destructive",
                title: "Request Failed",
                description: description,
            });
        }
    }

    if (submitted) {
        return (
             <div className="text-center">
                <Icons.Mail className="h-12 w-12 text-primary mx-auto mb-4" />
                <h1 className="text-3xl font-bold font-headline">Check Your Email</h1>
                <p className="text-muted-foreground mt-2">{`A password reset link has been sent to ${form.getValues("email")}. Please check your inbox and spam folder.`}</p>
                <Button asChild className="w-full mt-6 bg-secondary-foreground text-secondary hover:bg-secondary-foreground/90">
                    <Link href="/auth/login">Back to Login</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="w-full">
            <div className="text-center md:text-left mb-8">
                <Link href="/" className="inline-block mb-4">
                    <Icons.Logo className="h-10 w-10 text-primary" />
                </Link>
                <h1 className="text-3xl font-bold font-headline">{authPageSettings?.forgotPasswordTitle || "Forgot Password"}</h1>
                <p className="text-muted-foreground">{authPageSettings?.forgotPasswordSubtitle || "Enter your email to receive a reset link."}</p>
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
                                    <Input type="email" placeholder="you@example.com" {...field} className="border-x-0 border-t-0 border-b-2 rounded-none bg-transparent px-1 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="w-full bg-secondary-foreground text-secondary hover:bg-secondary-foreground/90" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? "Sending..." : "Send Reset Link"}
                    </Button>
                </form>
            </Form>
             <div className="mt-6 text-center text-sm">
                Remember your password?{" "}
                <Link href="/auth/login" className="font-medium text-primary hover:underline">
                    Log in
                </Link>
            </div>
        </div>
    );
}
