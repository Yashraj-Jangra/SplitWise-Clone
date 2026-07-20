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
  "h-11 rounded-xl bg-white/10 dark:bg-black/30 border border-white/5 pl-10 pr-4 text-sm text-white placeholder:text-white/50 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-white/5 focus-visible:bg-black/20 transition-all outline-none";

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
      <div className="relative w-full rounded-2xl bg-black/30 sm:bg-black/35 backdrop-blur-2xl border border-white/10 p-7 sm:p-9 shadow-2xl shadow-black/50 text-white text-center">
        <Link
          href="/landing"
          className="absolute top-5 left-5 text-white/60 hover:text-white transition-colors duration-200 p-1"
          title="Back to home"
          aria-label="Back to home"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 border border-white/10 mb-4 mt-2">
          <Mail className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-2xl font-medium tracking-wide text-white mb-2">
          Check Your Email
        </h1>
        <p className="text-xs text-white/80 leading-relaxed mb-6">
          A password reset link has been sent to{" "}
          <span className="font-semibold text-white">
            {form.getValues("email")}
          </span>
          . Please check your inbox and spam folder.
        </p>
        <Button
          asChild
          className="w-full h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-xs tracking-widest uppercase transition-all shadow-md"
        >
          <Link href="/auth/login">Back to Login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-2xl bg-black/30 sm:bg-black/35 backdrop-blur-2xl border border-white/10 p-7 sm:p-9 shadow-2xl shadow-black/50 text-white">
      {/* ── Top Left Simple Arrow to Landing Page ─────────────────────── */}
      <Link
        href="/landing"
        className="absolute top-5 left-5 text-white/60 hover:text-white transition-colors duration-200 p-1"
        title="Back to home"
        aria-label="Back to home"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>

      <h1 className="text-2xl sm:text-3xl font-medium tracking-wide text-white text-center mb-2 pt-2">
        {authPageSettings?.forgotPasswordTitle || "Forgot Password"}
      </h1>
      <p className="text-xs text-white/70 text-center mb-7 leading-relaxed">
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
                    <Mail className="h-4 w-4 text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      type="email"
                      placeholder="Email Address"
                      autoComplete="email"
                      {...field}
                      className={inputStyle}
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-xs text-rose-300 px-2" />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-xs tracking-widest uppercase transition-all shadow-md active:scale-[0.99] mt-2"
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
          className="inline-flex items-center gap-1.5 text-xs text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Login
        </Link>
      </div>
    </div>
  );
}
