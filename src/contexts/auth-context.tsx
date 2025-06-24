
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

import type { UserProfile } from '@/types';
import { app, db, auth, firebaseError } from '@/lib/firebase'; // Use your firebase instance

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  firebaseError: string | null;
  login: (email: string, pass: string) => Promise<void>;
  signup: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const fetchUserProfile = async (uid: string): Promise<UserProfile | null> => {
  if (!db) return null;
  const userDocRef = doc(db, "users", uid);
  const userDocSnap = await getDoc(userDocRef);
  if (userDocSnap.exists()) {
    const data = userDocSnap.data();
    return {
      uid: data.uid,
      name: data.name,
      email: data.email,
      role: data.role,
      avatarUrl: data.avatarUrl,
      createdAt: data.createdAt,
    } as UserProfile;
  }
  return null;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (firebaseError || !auth) {
        setLoading(false);
        return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setFirebaseUser(user);
        let profile = await fetchUserProfile(user.uid);
        
        // Self-healing: If a user is authenticated but has no profile in Firestore, create one.
        if (!profile) {
            console.warn(`User profile not found for uid: ${user.uid}. Creating a new one.`);
            const newUserProfile: Omit<UserProfile, 'uid'> & {uid: string} = {
                uid: user.uid,
                name: user.displayName || user.email?.split('@')[0] || "New User",
                email: user.email!,
                role: 'user',
                createdAt: Timestamp.now(),
                avatarUrl: user.photoURL || `https://placehold.co/100x100.png?text=${(user.displayName || user.email)?.substring(0, 2).toUpperCase()}`,
            };
            // Ensure admin role is set for the specified email
            if (user.email === 'jangrayash1505@gmail.com') {
                newUserProfile.role = 'admin';
            }
            await setDoc(doc(db, "users", user.uid), newUserProfile);
            profile = newUserProfile as UserProfile;
        }
        
        setUserProfile(profile);
      } else {
        setFirebaseUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, pass: string) => {
    if (!auth) throw new Error("Firebase not configured");
    await signInWithEmailAndPassword(auth, email, pass);
  }, []);

  const signup = useCallback(async (name: string, email: string, pass: string) => {
    if (!auth || !db) throw new Error("Firebase not configured");

    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;
    
    // Create user profile in Firestore.
    // The onAuthStateChanged listener will handle setting the userProfile state.
    const newUserProfile: Omit<UserProfile, 'uid'> & {uid: string} = {
        uid: user.uid,
        name,
        email,
        role: 'user', // Default role
        createdAt: Timestamp.now(),
        avatarUrl: `https://placehold.co/100x100.png?text=${name.substring(0, 2).toUpperCase()}`,
    };
    
    if (email === 'jangrayash1505@gmail.com') {
      newUserProfile.role = 'admin';
    }

    await setDoc(doc(db, "users", user.uid), newUserProfile);
  }, []);

  const logout = useCallback(async () => {
    if (!auth) throw new Error("Firebase not configured");
    await signOut(auth);
  }, []);

  const value = useMemo(() => ({
    firebaseUser,
    userProfile,
    loading,
    firebaseError,
    login,
    signup,
    logout,
  }), [firebaseUser, userProfile, loading, login, signup, logout]);
  
  if (firebaseError) {
      const isConfigNotFoundError = firebaseError.includes('auth/configuration-not-found');
      
      return (
          <div className="flex items-center justify-center min-h-screen bg-background text-foreground p-4">
              <div className="text-center max-w-2xl p-8 border rounded-lg shadow-xl bg-card">
                  <h1 className="text-2xl font-bold text-destructive mb-4">Firebase Configuration Error</h1>
                  <p className="mb-4 text-muted-foreground">The application could not connect to Firebase. Please check your configuration.</p>
                  <div className="text-sm bg-muted text-destructive p-3 rounded-md text-left">
                    <code className="font-mono whitespace-pre-wrap">{firebaseError}</code>
                  </div>

                  {isConfigNotFoundError ? (
                     <div className="mt-6 text-yellow-300 bg-yellow-900/50 border border-yellow-400/50 rounded-lg p-4">
                        <p className="font-semibold text-base">Action Required</p>
                        <p className="text-sm mt-2">
                            This error usually means you haven't enabled the correct sign-in method in your Firebase project.
                            <br /><br />
                            Please go to the <strong>Firebase Console</strong>, navigate to <strong>Authentication</strong> &gt; <strong>Sign-in method</strong>, and enable the <strong>Email/Password</strong> provider.
                        </p>
                     </div>
                  ) : (
                    <p className="text-muted-foreground text-sm mt-6">
                        Ensure your <code className="bg-muted text-foreground p-1 rounded">.env</code> file contains the correct Firebase project credentials and that the application has been restarted.
                    </p>
                  )}
              </div>
          </div>
      );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
