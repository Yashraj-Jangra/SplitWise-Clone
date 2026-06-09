"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { AppShell } from "@/components/layout/app-shell";
import AppLoading from './loading';

// This layout will apply to all routes within the (app) group
export default function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If auth state is resolved and there's no user, redirect to login
    if (!loading && !userProfile) {
      router.replace('/auth/login');
    }
  }, [userProfile, loading, router]);

  // While checking auth state or if user is not yet available, show a loading screen.
  // This prevents a flash of content before the redirect can happen.
  if (loading || !userProfile) {
    return <AppLoading />;
  }
  
  // If user is authenticated, render the app shell and its children
  return (
    <AppShell>{children}</AppShell>
  );
}
