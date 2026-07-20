"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import type { SiteSettings } from "@/types";
import { Eye, EyeOff, Loader2, Mail, Lock, User, AtSign, UserCheck, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Schemas ──────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email({ message: "Enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

const signupSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }),
  lastName: z.string().optional(),
  username: z
    .string()
    .min(3, { message: "Min 3 characters." })
    .max(20, { message: "Max 20 characters." })
    .regex(/^[a-zA-Z0-9_]+$/, {
      message: "Letters, numbers, and underscores only.",
    }),
  email: z.string().email({ message: "Enter a valid email address." }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters." }),
});

type LoginValues = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signupSchema>;

interface AuthCardProps {
  initialMode?: "login" | "signup";
  authPageSettings?: SiteSettings["authPage"];
  appName: string;
}

const inputStyle =
  "h-11 rounded-xl bg-muted/20 border border-border/30 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all outline-none";

export function AuthCard({
  initialMode = "login",
  authPageSettings,
  appName,
}: AuthCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { userProfile, loading, login, signup, loginWithGoogle } = useAuth();

  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!loading && userProfile) {
      setIsRedirecting(true);
      router.replace("/dashboard");
    }
  }, [userProfile, loading, router]);

  const switchMode = useCallback(
    (newMode: "login" | "signup") => {
      if (newMode === mode) return;
      setMode(newMode);
      setShowPassword(false);
      window.history.replaceState(
        null,
        "",
        newMode === "login" ? "/auth/login" : "/auth/signup"
      );
    },
    [mode]
  );

  // ── Forms ──────────────────────────────────────────────────────────────────
  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signupForm = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      password: "",
    },
  });

  const signupPassword = signupForm.watch("password") || "";
  const signupUsername = signupForm.watch("username") || "";

  // ── Live Password Strength Calculation ──────────────────────────────────────
  const passwordStrength = useMemo(() => {
    if (!signupPassword) return { score: 0, label: "", color: "bg-transparent", percent: "0%" };
    let score = 0;
    if (signupPassword.length >= 6) score += 1;
    if (signupPassword.length >= 10) score += 1;
    if (/[0-9]/.test(signupPassword)) score += 1;
    if (/[^a-zA-Z0-9]/.test(signupPassword) || /[A-Z]/.test(signupPassword)) score += 1;

    if (score <= 1) return { score: 1, label: "Weak", color: "bg-rose-500", percent: "25%" };
    if (score === 2) return { score: 2, label: "Fair", color: "bg-amber-500", percent: "50%" };
    if (score === 3) return { score: 3, label: "Good", color: "bg-blue-400", percent: "75%" };
    return { score: 4, label: "Strong", color: "bg-emerald-400", percent: "100%" };
  }, [signupPassword]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  async function onLoginSubmit(values: LoginValues) {
    try {
      await login(values.email, values.password);
      setIsRedirecting(true);
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Invalid email or password. Please try again.",
      });
      loginForm.setError("email", { type: "manual", message: " " });
      loginForm.setError("password", { type: "manual", message: " " });
    }
  }

  async function onSignupSubmit(values: SignupValues) {
    try {
      const { password, ...signupData } = values;
      await signup(signupData, password);
      toast({
        title: "Account created",
        description: "Welcome! Signing you in...",
      });
      setIsRedirecting(true);
      router.push("/dashboard");
    } catch (error: any) {
      let description = error.message || "An error occurred during sign up.";
      if (description.includes("email") || description.includes("use")) {
        description = "This email is already registered.";
        signupForm.setError("email", { type: "manual", message: description });
      } else if (description.toLowerCase().includes("username")) {
        signupForm.setError("username", {
          type: "manual",
          message: description,
        });
      }
      toast({ variant: "destructive", title: "Sign up failed", description });
    }
  }

  async function handleGoogleAuth() {
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
      setIsRedirecting(true);
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Google sign-in failed",
        description: error.message || "Please try again.",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  }

  const isLoginSubmitting = loginForm.formState.isSubmitting;
  const isSignupSubmitting = signupForm.formState.isSubmitting;
  const anyLoading = isGoogleLoading || isLoginSubmitting || isSignupSubmitting || isRedirecting;

  if (loading || (userProfile && !isRedirecting)) {
    return (
      <div className="w-full rounded-2xl bg-black/35 backdrop-blur-xl border border-white/10 p-8 text-center text-white flex flex-col items-center justify-center py-20 gap-3">
        <Icons.AppLogo className="h-8 w-8 text-primary animate-spin" />
        <p className="text-xs text-white/80">Checking session...</p>
      </div>
    );
  }

  if (isRedirecting) {
    return (
      <div className="w-full rounded-2xl bg-black/35 backdrop-blur-xl border border-white/10 p-8 text-center text-white flex flex-col items-center justify-center py-20 gap-3">
        <Icons.AppLogo className="h-8 w-8 text-primary animate-spin" />
        <p className="text-xs text-white/80">Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-2xl bg-black/30 sm:bg-black/35 backdrop-blur-2xl border border-white/10 p-6 sm:p-9 shadow-2xl shadow-black/50 text-white transition-all">

      {/* ── Top Left Simple Arrow to Landing Page ─────────────────────── */}
      <Link
        href="/landing"
        className="absolute top-5 left-5 text-white/60 hover:text-white transition-colors duration-200 p-1"
        title="Back to home"
        aria-label="Back to home"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>

      {/* ── Brand Logo Header ───────────────────────────────────────────── */}
      <div className="flex flex-col items-center justify-center mb-3">
        <Link href="/landing" className="inline-flex items-center justify-center">
          <Icons.Logo className="h-16 w-16 text-primary" />
        </Link>
      </div>

      {/* ── Header Title ────────────────────────────────────────────────── */}
      <div className="text-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-medium tracking-wide text-white">
          {mode === "login" ? "Welcome" : "Create Account"}
        </h1>
        <p className="text-xs text-white/60 mt-1">
          {mode === "login"
            ? "Sign in to access your expenses & balances"
            : `Join ${appName} to split bills effortlessly`}
        </p>
      </div>

      {/* ── Animated Form Body ────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {mode === "login" ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <Form {...loginForm}>
              <form
                onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={loginForm.control}
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

                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Lock className="h-4 w-4 text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            autoComplete="current-password"
                            {...field}
                            className={cn(inputStyle, "pr-10")}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors p-1"
                            tabIndex={-1}
                            aria-label={
                              showPassword ? "Hide password" : "Show password"
                            }
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs text-rose-300 px-2" />
                    </FormItem>
                  )}
                />

                {/* ── Submit Button ─────────────────────────────────────── */}
                <Button
                  type="submit"
                  className="w-full h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-xs tracking-widest uppercase transition-all shadow-md active:scale-[0.99] mt-3"
                  disabled={anyLoading}
                >
                  {isLoginSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    "LOGIN"
                  )}
                </Button>
              </form>
            </Form>
          </motion.div>
        ) : (
          <motion.div
            key="signup"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <Form {...signupForm}>
              <form
                onSubmit={signupForm.handleSubmit(onSignupSubmit)}
                className="space-y-3.5"
              >
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={signupForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <User className="h-4 w-4 text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <Input
                              placeholder="First Name"
                              autoComplete="given-name"
                              {...field}
                              className={inputStyle}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs text-rose-300 px-2" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signupForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <User className="h-4 w-4 text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <Input
                              placeholder="Last Name"
                              autoComplete="family-name"
                              {...field}
                              className={inputStyle}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs text-rose-300 px-2" />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={signupForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <AtSign className="h-4 w-4 text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <Input
                            placeholder="Username"
                            autoComplete="username"
                            {...field}
                            className={cn(inputStyle, signupUsername.length >= 3 && "pr-9")}
                          />
                          {signupUsername.length >= 3 && /^[a-zA-Z0-9_]+$/.test(signupUsername) && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400">
                              <UserCheck className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs text-rose-300 px-2" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={signupForm.control}
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

                <FormField
                  control={signupForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormControl>
                        <div className="relative">
                          <Lock className="h-4 w-4 text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password (min 6 chars)"
                            autoComplete="new-password"
                            {...field}
                            className={cn(inputStyle, "pr-10")}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors p-1"
                            tabIndex={-1}
                            aria-label={
                              showPassword ? "Hide password" : "Show password"
                            }
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs text-rose-300 px-2" />

                      {/* ── Live Password Strength Indicator ─────────────────── */}
                      {signupPassword.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="pt-1 px-1 space-y-1"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-white/60 font-medium">Password strength</span>
                            <span className={cn("font-bold text-[10px] uppercase tracking-wider", 
                              passwordStrength.score >= 3 ? "text-emerald-400" : passwordStrength.score === 2 ? "text-amber-300" : "text-rose-400"
                            )}>
                              {passwordStrength.label}
                            </span>
                          </div>
                          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full transition-all duration-300 rounded-full", passwordStrength.color)}
                              style={{ width: passwordStrength.percent }}
                            />
                          </div>
                        </motion.div>
                      )}
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-xs tracking-widest uppercase transition-all shadow-md active:scale-[0.99] mt-3"
                  disabled={anyLoading}
                >
                  {isSignupSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "SIGN UP"
                  )}
                </Button>
              </form>
            </Form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Links Row ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-xs text-white/75 mt-5 pt-1 px-1">
        <Link
          href="/auth/forgot-password"
          className="hover:text-white hover:underline transition-colors"
        >
          Forgot Password ?
        </Link>
        {mode === "login" ? (
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className="hover:text-white font-medium hover:underline transition-colors flex items-center gap-1"
          >
            Sign Up
          </button>
        ) : (
          <button
            type="button"
            onClick={() => switchMode("login")}
            className="hover:text-white font-medium hover:underline transition-colors"
          >
            Sign In
          </button>
        )}
      </div>

      {/* ── Divider ───────────────────────────────────────────────────────── */}
      <div className="border-t border-white/10 mt-6 mb-5" />

      {/* ── Social Login Header ───────────────────────────────────────────── */}
      <p className="text-[11px] font-medium tracking-widest text-white/60 uppercase text-center mb-4">
        OR LOGIN WITH
      </p>

      {/* ── Social Login Icons Row ────────────────────────────────────────── */}
      <div className="flex items-center justify-center">
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={anyLoading}
          aria-label="Login with Google"
          title="Login with Google"
          className="h-11 w-11 rounded-full bg-black hover:bg-neutral-900 border border-white/10 flex items-center justify-center transition-colors duration-200 shadow-md disabled:opacity-50"
        >
          {isGoogleLoading ? (
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          ) : (
            <Icons.Google className="h-8 w-8" />
          )}
        </button>
      </div>

    </div>
  );
}
