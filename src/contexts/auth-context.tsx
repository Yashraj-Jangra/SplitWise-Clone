
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

import type { UserProfile } from '@/types';
import { app, db } from '@/lib/firebase'; // Use your firebase instance

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// In a real app, you might want more robust user management
const fetchUserProfile = async (uid: string): Promise<UserProfile | null> => {
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

// This function will create the initial admin user if they don't exist in Firestore
const createInitialAdmin = async () => {
    const adminEmail = "jangrayash1505@gmail.com";
    // In a real app, you'd have a secure way to get the admin UID
    // For now, we assume if an admin logs in, we might need to create their Firestore doc
    // This is not a secure way to assign roles, but it's for bootstrapping the demo.
    // A secure method would involve a backend function or manual setup in Firestore.
    // We can't query by email easily without special indexes. This part is tricky.
    // Let's assume signup creates the user record, and for the first user, we can manually set the role to admin in Firestore console.
};
// Call it once on startup
createInitialAdmin();


export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setFirebaseUser(user);
        const profile = await fetchUserProfile(user.uid);
        setUserProfile(profile);
      } else {
        setFirebaseUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  const login = useCallback(async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  }, [auth]);

  const signup = useCallback(async (name: string, email: string, pass: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;
    
    // Create user profile in Firestore
    const newUserProfile: Omit<UserProfile, 'uid'> & {uid: string} = {
        uid: user.uid,
        name,
        email,
        role: 'user', // Default role
        createdAt: Timestamp.now(),
        avatarUrl: `https://placehold.co/100x100.png?text=${name.substring(0, 2).toUpperCase()}`,
    };
    
    // Special case for the admin user on first signup
    if (email === 'jangrayash1505@gmail.com') {
      newUserProfile.role = 'admin';
    }

    await setDoc(doc(db, "users", user.uid), newUserProfile);
    setUserProfile(newUserProfile as UserProfile);

  }, [auth]);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, [auth]);

  const value = {
    firebaseUser,
    userProfile,
    // For compatibility with old components, let's create a 'currentUser'
    currentUser: userProfile,
    loading,
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
