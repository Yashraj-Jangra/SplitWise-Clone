'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import AppLoading from '@/app/(app)/loading';

export default function RootPage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (userProfile) {
        router.replace('/dashboard');
      } else {
        router.replace('/landing');
      }
    }
  }, [userProfile, loading, router]);

  // Show a full-screen loading spinner while determining auth state.
  return <AppLoading />;
}
