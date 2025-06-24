
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { FirebaseError } from 'firebase/app';
import { format } from "date-fns";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AuthCard } from "./auth-card";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { isUsernameTaken } from "@/lib/mock-data";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

const signupSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }),
  lastName: z.string().optional(),
  username: z.string()
    .min(3, { message: "Username must be at least 3 characters." })
    .max(20, { message: "Username must be less than 20 characters." })
    .regex(/^[a-zA-Z0-9_]+$/, { message: "Username can only contain letters, numbers, and underscores."})
    .refine(async (username) => {
        return !(await isUsernameTaken(username));
    }, {message: "This username is already taken."}),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long." }),
  mobileNumber: z.string().optional(),
  dob: z.string().optional(),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export function SignupForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { signup } = useAuth();

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      password: "",
      mobileNumber: "",
      dob: "",
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
        description = error.message;
      }
      toast({
        variant: "destructive",
        title: "Signup Failed",
        description,
      });
    }
  }

  return (
    <AuthCard
      title="Create an Account"
      description="Join SettleEase to simplify your group expenses."
      icon={<Icons.Signup className="h-12 w-12 text-primary" />}
    >
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
                        <Input placeholder="John" {...field} />
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
                        <Input placeholder="Doe" {...field} />
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
                    <Input placeholder="johndoe99" {...field} />
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="mobileNumber"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Mobile (Optional)</FormLabel>
                        <FormControl>
                        <Input placeholder="9876543210" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="dob"
                    render={({ field }) => (
                    <FormItem className="flex flex-col pt-2">
                        <FormLabel className="mb-[0.6rem]">Date of Birth (Optional)</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                <Button
                                    variant={"outline"}
                                    className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                >
                                    {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                                    <Icons.Calendar className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(date) => field.onChange(date?.toISOString())}
                                disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Signing up..." : "Sign Up"}
            </Button>
        </form>
      </Form>
      <div className="mt-6 text-center text-sm">
        Already have an account?{" "}
        <Link href="/auth/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </div>
    </AuthCard>
  );
}
