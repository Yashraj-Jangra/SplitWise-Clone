"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { AuthCard } from "./auth-card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { FirebaseError } from "firebase/app";

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
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
             <AuthCard
                title="Check Your Email"
                description={`A password reset link has been sent to ${form.getValues("email")}. Please check your inbox and spam folder.`}
                icon={<Icons.Mail className="h-12 w-12 text-primary" />}
            >
                <Button asChild className="w-full">
                    <Link href="/auth/login">Back to Login</Link>
                </Button>
            </AuthCard>
        )
    }

    return (
        <AuthCard
            title="Forgot Password"
            description="Enter your email address and we'll send you a link to reset your password."
            icon={<Icons.Mail className="h-12 w-12 text-primary" />}
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
                    <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
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
        </AuthCard>
    );
}
