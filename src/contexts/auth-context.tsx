
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup, deleteUser, sendPasswordResetEmail as firebaseSendPasswordResetEmail, sendEmailVerification, linkWithPopup, unlink, updatePassword as firebaseUpdatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

import type { UserProfile } from '@/types';
import { app, db, auth, firebaseError } from '@/lib/firebase';
import { isUsernameTaken } from '@/lib/mock-data';

const ADMIN_EMAIL = 'jangrayash1505@gmail.com';

type SignupData = Omit<UserProfile, 'uid' | 'role' | 'createdAt' | 'avatarUrl'>;

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  firebaseError: string | null;
  hasPassword?: boolean;
  isGoogleLinked?: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (data: SignupData, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  linkWithGoogle: () => Promise<void>;
  unlinkFromGoogle: () => Promise<void>;
  updateUserPassword: (newPassword: string, currentPassword?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const fetchUserProfile = async (uid: string): Promise<UserProfile | null> => {
  if (!db) return null;
  const userDocRef = doc(db, "users", uid);
  const userDocSnap = await getDoc(userDocRef);
  if (userDocSnap.exists()) {
    const data = userDocSnap.data();
    return {
      uid: userDocSnap.id,
      firstName: data.firstName,
      lastName: data.lastName,
      username: data.username,
      email: data.email,
      role: data.role,
      avatarUrl: data.avatarUrl,
      countryCode: data.countryCode,
      mobileNumber: data.mobileNumber,
      dob: data.dob ? (data.dob as Timestamp)?.toDate().toISOString() : undefined,
      createdAt: (data.createdAt as Timestamp)?.toDate().toISOString(),
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
        
        if (!profile) {
            console.warn(`User profile not found for uid: ${user.uid}. Creating a new one.`);
            let username = user.email?.split('@')[0] || `user${Date.now()}`;
            let usernameIsTaken = await isUsernameTaken(username);
            while (usernameIsTaken) {
                username = `${user.email?.split('@')[0]}${Math.floor(Math.random() * 1000)}`;
                usernameIsTaken = await isUsernameTaken(username);
            }
            
            const nameParts = user.displayName?.split(' ') || [];
            const firstName = nameParts[0] || user.email?.split('@')[0] || 'New';
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

            const userRole = user.email === ADMIN_EMAIL ? 'admin' : 'user';

            const newUserProfile: Omit<UserProfile, 'uid' | 'createdAt' | 'dob'> & {uid: string; createdAt: Timestamp; dob?: Timestamp} = {
                uid: user.uid,
                firstName: firstName,
                lastName: lastName,
                username: username,
                email: user.email!,
                role: userRole,
                avatarUrl: user.photoURL || `https://placehold.co/100x100.png?text=${(firstName)?.substring(0, 1).toUpperCase()}${lastName?.substring(0,1).toUpperCase() || ''}`,
            };
            
            await setDoc(doc(db, "users", user.uid), {
                ...newUserProfile,
                createdAt: Timestamp.now(),
            });

            if (userRole === 'admin') {
                try {
                    await fetch('/api/set-admin-claim', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ uid: user.uid }),
                    });
                } catch (e) {
                    console.error("Failed to set admin claim:", e);
                }
            }

            await sendEmailVerification(user); // Send verification email for new Google users
            profile = await fetchUserProfile(user.uid);
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

  const signup = useCallback(async (data: SignupData, pass: string) => {
    if (!auth || !db) throw new Error("Firebase not configured");
    
    // 1. Create the auth user first. This also signs them in.
    const userCredential = await createUserWithEmailAndPassword(auth, data.email, pass);
    const user = userCredential.user;

    try {
        // 2. Now that user is authenticated, check if username is taken.
        const usernameTaken = await isUsernameTaken(data.username, user.uid);
        if (usernameTaken) {
            throw new Error("Username is already taken.");
        }
        
        const userRole = data.email === ADMIN_EMAIL ? 'admin' : 'user';

        // 3. If username is available, create the user profile document.
        const newUserProfile: Omit<UserProfile, 'uid' | 'createdAt' | 'dob'> & {uid: string; createdAt: Timestamp; dob?: Timestamp} = {
            uid: user.uid,
            ...data,
            role: userRole,
            avatarUrl: `https://placehold.co/100x100.png?text=${data.firstName.substring(0, 1).toUpperCase()}${data.lastName?.substring(0, 1).toUpperCase() || ''}`,
        };
        
        const finalProfileData: any = { ...newUserProfile, createdAt: Timestamp.now() };
        if (data.dob) {
            finalProfileData.dob = Timestamp.fromDate(new Date(data.dob));
        }

        await setDoc(doc(db, "users", user.uid), finalProfileData);
        
        if (userRole === 'admin') {
            await fetch('/api/set-admin-claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: user.uid }),
            });
        }

        await sendEmailVerification(user); // Send verification email on signup

    } catch (error) {
        // 4. If profile creation fails (e.g. username taken), delete the auth user to prevent orphans.
        await deleteUser(user);
        // Re-throw the original error to be caught by the form's onSubmit handler.
        throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    if (!auth) throw new Error("Firebase not configured");
    await signOut(auth);
  }, []);

  const loginWithGoogle = useCallback(async () => {
    if (!auth) throw new Error("Firebase not configured");
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        if (error instanceof FirebaseError) {
            if (error.code === 'auth/operation-not-allowed') {
                console.error("Firebase Auth Error: Google Sign-In is likely not enabled in the Firebase console.");
                throw new Error("Google Sign-In is not enabled. Please check your Firebase console configuration.");
            }
        }
        // Re-throw other errors to be handled by the UI component
        throw error;
    }
  }, []);

  const sendPasswordResetEmail = useCallback(async (email: string) => {
    if (!auth) throw new Error("Firebase not configured");
    await firebaseSendPasswordResetEmail(auth, email);
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    if (!auth?.currentUser) throw new Error("You must be logged in to resend a verification email.");
    await sendEmailVerification(auth.currentUser);
  }, []);
  
  const linkWithGoogle = useCallback(async () => {
    if (!auth?.currentUser) throw new Error("You must be logged in to link an account.");
    const provider = new GoogleAuthProvider();
    await linkWithPopup(auth.currentUser, provider);
    // After linking, the onAuthStateChanged listener will automatically update the user state.
  }, []);

  const unlinkFromGoogle = useCallback(async () => {
    if (!auth?.currentUser) throw new Error("You must be logged in to unlink an account.");
    if (auth.currentUser.providerData.length <= 1) {
      throw new Error("You cannot remove your only sign-in method.");
    }
    await unlink(auth.currentUser, GoogleAuthProvider.PROVIDER_ID);
    // After unlinking, the onAuthStateChanged listener will automatically update the user state.
  }, []);
  
  const updateUserPassword = useCallback(async (newPassword: string, currentPassword?: string) => {
    if (!auth?.currentUser) throw new Error("You must be logged in to update your password.");

    // If a current password is provided, re-authenticate for security before updating.
    if (currentPassword) {
      if (!auth.currentUser.email) {
          throw new Error("User email is not available for re-authentication.");
      }
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
    }
    
    // After re-authentication (if required) or for users setting a password for the first time
    await firebaseUpdatePassword(auth.currentUser, newPassword);
  }, []);


  const hasPassword = useMemo(() => {
    return firebaseUser?.providerData.some(p => p.providerId === 'password');
  }, [firebaseUser]);

  const isGoogleLinked = useMemo(() => {
    return firebaseUser?.providerData.some(p => p.providerId === 'google.com');
  }, [firebaseUser]);


  const value = useMemo(() => ({
    firebaseUser,
    userProfile,
    loading,
    firebaseError,
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
  }), [firebaseUser, userProfile, loading, firebaseError, hasPassword, isGoogleLinked, login, signup, logout, loginWithGoogle, sendPasswordResetEmail, resendVerificationEmail, linkWithGoogle, unlinkFromGoogle, updateUserPassword]);
  
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
