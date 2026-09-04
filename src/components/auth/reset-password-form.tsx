"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { authClient } from "@/lib/auth.client";
import type { SiteSettings } from "@/types";
import {
  Loader2,
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  KeyRound,
} from "lucide-react";

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, { message: "Password must be at least 6 characters." }),
    confirmPassword: z.string().min(6, { message: "Please confirm your new password." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordFormProps {
  authPageSettings?: SiteSettings["authPage"];
  appName: string;
}

const inputStyle =
  "pl-10 pr-10 h-11 w-full bg-muted/20 border border-border/50 text-foreground placeholder:text-muted-foreground/60 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-muted/40 rounded-[var(--radius-input)]";

export function ResetPasswordForm({
  authPageSettings,
  appName,
}: ResetPasswordFormProps) {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const token = searchParams.get("token");
  const errorParam = searchParams.get("error");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const passwordValue = form.watch("password") || "";

  // Password strength scoring
  const passwordStrength = useMemo(() => {
    if (!passwordValue) return { score: 0, label: "Empty", color: "bg-muted", percent: "0%" };
    let score = 0;
    if (passwordValue.length >= 6) score += 1;
    if (passwordValue.length >= 10) score += 1;
    if (/[0-9]/.test(passwordValue)) score += 1;
    if (/[^a-zA-Z0-9]/.test(passwordValue) || /[A-Z]/.test(passwordValue)) score += 1;

    if (score <= 1) return { score: 1, label: "Weak", color: "bg-rose-500", percent: "25%" };
    if (score === 2) return { score: 2, label: "Fair", color: "bg-amber-500", percent: "50%" };
    if (score === 3) return { score: 3, label: "Good", color: "bg-blue-400", percent: "75%" };
    return { score: 4, label: "Strong", color: "bg-emerald-400", percent: "100%" };
  }, [passwordValue]);

  // Handle password reset submission
  async function onSubmit(values: ResetPasswordFormValues) {
    if (!token) {
      toast({
        variant: "destructive",
        title: "Missing Token",
        description: "Password reset token is missing. Please request a new link.",
      });
      return;
    }

    try {
      // 1. Try Better Auth client resetPassword method
      let success = false;
      let errorMessage = "";

      try {
        const { error } = await authClient.resetPassword({
          newPassword: values.password,
          token,
        });

        if (error) {
          errorMessage = error.message || "Failed to reset password.";
        } else {
          success = true;
        }
      } catch (clientErr: any) {
        // Fallback to direct POST /api/auth/reset-password
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newPassword: values.password,
            token,
          }),
        });

        const data = await res.json().catch(() => null);
        if (res.ok) {
          success = true;
        } else {
          errorMessage = data?.message || data?.error || "Failed to reset password.";
        }
      }

      if (!success) {
        throw new Error(errorMessage || "Failed to reset password.");
      }

      setIsSuccess(true);
      toast({
        title: "Password Updated",
        description: "Your password has been reset successfully. You can now log in.",
      });
    } catch (error: any) {
      const description =
        error instanceof Error
          ? error.message
          : "An unknown error occurred. Please request a new reset link.";
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description,
      });
    }
  }

  // ── 1. Invalid or Expired Token View ────────────────────────────────────────
  if (!token || errorParam === "INVALID_TOKEN") {
    return (
      <div
        className="relative w-full bg-card text-foreground border border-border p-7 sm:p-9 shadow-sm text-center"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <Link
          href="/auth/login"
          className="absolute top-5 left-5 text-muted-foreground hover:text-foreground transition-colors duration-200 p-1"
          title="Back to login"
          aria-label="Back to login"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <div className="inline-flex items-center justify-center w-12 h-12 rounded-[var(--radius-card)] bg-destructive/10 border border-destructive/20 mb-4 mt-2">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>

        <h1 className="text-2xl font-black tracking-tight text-foreground mb-2">
          Invalid or Expired Link
        </h1>
        <p className="text-xs text-muted-foreground leading-relaxed mb-6 max-w-sm mx-auto">
          This password reset link is invalid or has expired. Password reset links are valid for 1 hour and can only be used once.
        </p>

        <div className="space-y-3">
          <Button
            asChild
            className="w-full h-11 rounded-[var(--radius-button)] bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs tracking-wider uppercase transition-all shadow-md"
          >
            <Link href="/auth/forgot-password">Request New Reset Link</Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="w-full h-11 rounded-[var(--radius-button)] border border-border bg-transparent text-foreground hover:bg-muted/40 font-medium text-xs tracking-wider uppercase transition-all"
          >
            <Link href="/auth/login">Back to Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  // ── 2. Success View ────────────────────────────────────────────────────────
  if (isSuccess) {
    return (
      <div
        className="relative w-full bg-card text-foreground border border-border p-7 sm:p-9 shadow-sm text-center"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-[var(--radius-card)] bg-emerald-500/10 border border-emerald-500/20 mb-4 mt-2">
          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
        </div>

        <h1 className="text-2xl font-black tracking-tight text-foreground mb-2">
          Password Updated!
        </h1>
        <p className="text-xs text-muted-foreground leading-relaxed mb-6 max-w-sm mx-auto">
          Your password has been successfully reset. You can now use your new password to sign in to your account.
        </p>

        <Button
          asChild
          className="w-full h-11 rounded-[var(--radius-button)] bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs tracking-wider uppercase transition-all shadow-md"
        >
          <Link href="/auth/login">Proceed to Login</Link>
        </Button>
      </div>
    );
  }

  // ── 3. Active Reset Password Form View ──────────────────────────────────────
  return (
    <div
      className="relative w-full bg-card text-foreground border border-border p-7 sm:p-9 shadow-sm transition-all"
      style={{ borderRadius: "var(--radius-card)" }}
    >
      <Link
        href="/auth/login"
        className="absolute top-5 left-5 text-muted-foreground hover:text-foreground transition-colors duration-200 p-1"
        title="Back to login"
        aria-label="Back to login"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>

      <div className="flex flex-col items-center justify-center mb-4 pt-1">
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-[var(--radius-card)] bg-primary/10 border border-primary/20 mb-2">
          <KeyRound className="h-5 w-5 text-primary" />
        </div>
      </div>

      <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground text-center mb-1">
        Set New Password
      </h1>
      <p className="text-xs text-muted-foreground text-center mb-6 leading-relaxed">
        Choose a strong, unique password for your account.
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* New Password Field */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="New Password (min. 6 characters)"
                      autoComplete="new-password"
                      {...field}
                      className={inputStyle}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage className="text-xs text-destructive px-2" />
              </FormItem>
            )}
          />

          {/* Password Strength Meter */}
          {passwordValue && (
            <div className="space-y-1.5 px-1 -mt-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-medium">Strength:</span>
                <span className="font-semibold text-foreground">{passwordStrength.label}</span>
              </div>
              <div className="flex gap-1 h-1 w-full bg-muted rounded-full overflow-hidden">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`flex-1 h-full transition-colors duration-300 ${
                      step <= passwordStrength.score ? passwordStrength.color : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Confirm Password Field */}
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm New Password"
                      autoComplete="new-password"
                      {...field}
                      className={inputStyle}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
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
                Updating Password...
              </>
            ) : (
              "RESET PASSWORD"
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
