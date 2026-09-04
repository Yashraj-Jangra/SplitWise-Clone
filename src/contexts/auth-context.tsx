"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { UserProfile } from '@/types';
import { authClient } from '@/lib/auth.client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  currentUser: { uid: string; email: string; displayName: string; photoURL?: string; emailVerified: boolean } | null;
  userProfile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  isAdmin: boolean;
  hasPassword?: boolean;
  isGoogleLinked?: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (data: Omit<UserProfile, 'uid' | 'role' | 'createdAt' | 'avatarUrl'>, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  linkWithGoogle: () => Promise<void>;
  unlinkFromGoogle: () => Promise<void>;
  updateUserPassword: (newPassword: string, currentPassword?: string) => Promise<void>;
  deleteAccount: (currentPassword?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: sessionData, isPending: sessionLoading } = authClient.useSession();
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(sessionLoading);
  }, [sessionLoading]);

  const currentUser = useMemo(() => {
    if (!sessionData?.user) return null;
    const user = sessionData.user as any;
    return {
      uid: user.id,
      email: user.email,
      displayName: user.name,
      photoURL: user.image || user.avatarUrl,
      emailVerified: user.emailVerified,
    };
  }, [sessionData]);

  const userProfile = useMemo((): UserProfile | null => {
    if (!sessionData?.user) return null;
    const user = sessionData.user as any;
    const createdAtStr = typeof user.createdAt === 'string'
      ? user.createdAt
      : user.createdAt instanceof Date
        ? user.createdAt.toISOString()
        : new Date().toISOString();

    return {
      uid: user.id,
      firstName: user.firstName || user.name?.split(' ')[0] || 'User',
      lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
      username: user.username || (user.email ? user.email.split('@')[0] : 'user'),
      email: user.email || '',
      role: (user.role as 'admin' | 'user') || 'user',
      avatarUrl: user.image || user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name}`,
      countryCode: user.countryCode || '',
      mobileNumber: user.mobileNumber || '',
      upiId: user.upiId || '',
      dob: user.dob ? (typeof user.dob === 'string' ? user.dob : new Date(user.dob).toISOString()) : undefined,
      createdAt: createdAtStr,
    } as UserProfile;
  }, [sessionData]);

  const isAdmin = useMemo(() => {
    return userProfile?.role === 'admin';
  }, [userProfile]);

  const hasPassword = useMemo(() => {
    // Better Auth: check if password is used as credential
    return true; // Simplified for client side
  }, []);

  const isGoogleLinked = useMemo(() => {
    return false; // Simplified
  }, []);

  const login = useCallback(async (email: string, pass: string) => {
    setLoading(true);
    setAuthError(null);
    try {
      const { error } = await authClient.signIn.email({
        email,
        password: pass,
      });
      if (error) {
        throw new Error(error.message || 'Login failed.');
      }
    } catch (err: any) {
      setAuthError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(async (data: any, pass: string) => {
    setLoading(true);
    setAuthError(null);
    try {
      const name = `${data.firstName} ${data.lastName || ''}`.trim();
      const { error } = await authClient.signUp.email({
        email: data.email,
        password: pass,
        name,
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
        countryCode: data.countryCode,
        mobileNumber: data.mobileNumber,
        dob: data.dob,
      } as any);
      if (error) {
        throw new Error(error.message || 'Sign up failed.');
      }
    } catch (err: any) {
      setAuthError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authClient.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setLoading(true);
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/dashboard',
      });
    } catch (err: any) {
      setAuthError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const sendPasswordResetEmail = useCallback(async (email: string) => {
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) throw new Error(error.message || 'Failed to send password reset email.');
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    toast({
      title: "Info",
      description: "Email verification is managed by authentication service.",
    });
  }, [toast]);

  const linkWithGoogle = useCallback(async () => {
    toast({
      title: "Feature Unavailable",
      description: "OAuth account linking must be configured in settings.",
    });
  }, [toast]);

  const unlinkFromGoogle = useCallback(async () => {
    toast({
      title: "Feature Unavailable",
      description: "OAuth account unlinking must be configured in settings.",
    });
  }, [toast]);

  const updateUserPassword = useCallback(async (newPassword: string, currentPassword?: string) => {
    if (!currentPassword) {
      throw new Error("Current password is required to change password.");
    }
    const { error } = await authClient.changePassword({
      newPassword,
      currentPassword,
    });
    if (error) throw new Error(error.message || 'Failed to update password.');
  }, []);

  const deleteAccount = useCallback(async (currentPassword?: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete account.');
      }

      await authClient.signOut();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to delete account.',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const value = useMemo(() => ({
    currentUser,
    userProfile,
    loading,
    authError,
    isAdmin,
    hasPassword,
    isGoogleLinked,
    login,
    signup,
    logout,
    loginWithGoogle,
    sendPasswordResetEmail,
    resendVerificationEmail,
    linkWithGoogle,
    unlinkFromGoogle,
    updateUserPassword,
    deleteAccount,
  }), [currentUser, userProfile, loading, authError, isAdmin, hasPassword, isGoogleLinked, login, signup, logout, loginWithGoogle, sendPasswordResetEmail, resendVerificationEmail, linkWithGoogle, unlinkFromGoogle, updateUserPassword, deleteAccount]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
