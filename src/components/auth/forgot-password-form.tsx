"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import type { SiteSettings } from "@/types";
import { Loader2, ArrowLeft, Mail } from "lucide-react";

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Enter a valid email address." }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordFormProps {
  authPageSettings?: SiteSettings["authPage"];
  appName: string;
}

const inputStyle =
  "pl-10 h-11 w-full bg-muted/20 border border-border/50 text-foreground placeholder:text-muted-foreground/60 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-muted/40 rounded-[var(--radius-input)]";

export function ForgotPasswordForm({
  authPageSettings,
  appName,
}: ForgotPasswordFormProps) {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    try {
      const response = await fetch("/api/send-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "An unknown error occurred.");
      }

      setSubmitted(true);
    } catch (error) {
      const description =
        error instanceof Error
          ? error.message
          : "An unknown error occurred. Please try again.";
      toast({
        variant: "destructive",
        title: "Request Failed",
        description,
      });
    }
  }

  if (submitted) {
    return (
      <div 
        className="relative w-full bg-card text-foreground border border-border p-7 sm:p-9 shadow-sm text-center"
        style={{ borderRadius: 'var(--radius-card)' }}
      >
        <Link
          href="/landing"
          className="absolute top-5 left-5 text-muted-foreground hover:text-foreground transition-colors duration-200 p-1"
          title="Back to home"
          aria-label="Back to home"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-[var(--radius-card)] bg-muted border border-border mb-4 mt-2">
          <Mail className="h-6 w-6 text-foreground" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-foreground mb-2">
          Check Your Email
        </h1>
        <p className="text-xs text-muted-foreground leading-relaxed mb-6">
          A password reset link has been sent to{" "}
          <span className="font-semibold text-foreground">
            {form.getValues("email")}
          </span>
          . Please check your inbox and spam folder.
        </p>
        <Button
          asChild
          className="w-full h-11 rounded-[var(--radius-button)] bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs tracking-wider uppercase transition-all shadow-md"
        >
          <Link href="/auth/login">Back to Login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div 
      className="relative w-full bg-card text-foreground border border-border p-7 sm:p-9 shadow-sm transition-all"
      style={{ borderRadius: 'var(--radius-card)' }}
    >
      {/* ── Top Left Simple Arrow to Landing Page ─────────────────────── */}
      <Link
        href="/landing"
        className="absolute top-5 left-5 text-muted-foreground hover:text-foreground transition-colors duration-200 p-1"
        title="Back to home"
        aria-label="Back to home"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>

      <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground text-center mb-2 pt-2">
        {authPageSettings?.forgotPasswordTitle || "Forgot Password"}
      </h1>
      <p className="text-xs text-muted-foreground text-center mb-7 leading-relaxed">
        {authPageSettings?.forgotPasswordSubtitle ||
          "Enter your email address to receive a password reset link."}
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <Mail className="h-4 w-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      type="email"
                      placeholder="Email Address"
                      autoComplete="email"
                      {...field}
                      className={inputStyle}
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-xs text-destructive px-2" />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full h-11 rounded-[var(--radius-button)] bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs tracking-wider uppercase transition-all shadow-md active:scale-[0.99] mt-2"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "SEND RESET LINK"
            )}
          </Button>
        </form>
      </Form>

      <div className="mt-6 text-center">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Login
        </Link>
      </div>
    </div>
  );
}
