
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '@/types';
import { mockUsers } from '@/lib/mock-data'; // We'll still use this for lookup

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (email: string) => Promise<User | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// In a real app, you would fetch user data from an API
const fetchUserById = async (id: string): Promise<User | null> => {
  const user = mockUsers.find(u => u.id === id);
  return user || null;
};

const findUserByEmail = async (email: string): Promise<User | null> => {
  const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
  return user || null;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      try {
        const storedUserId = localStorage.getItem('currentUserId');
        if (storedUserId) {
          const user = await fetchUserById(storedUserId);
          setCurrentUser(user);
        }
      } catch (error) {
        console.error("Failed to initialize auth:", error);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };
    initializeAuth();
  }, []);

  const login = useCallback(async (email: string) => {
    setLoading(true);
    const user = await findUserByEmail(email);
    if (user) {
      localStorage.setItem('currentUserId', user.id);
      setCurrentUser(user);
    } else {
      // In a real app, you'd throw an error here
      console.error("User not found");
    }
    setLoading(false);
    return user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('currentUserId');
    setCurrentUser(null);
  }, []);

  const value = {
    currentUser,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
