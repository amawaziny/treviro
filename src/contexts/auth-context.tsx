
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth';

interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AppUser | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean; // Represents if initial auth check is complete
  isProcessingLogin: boolean; // Represents if login popup action is in progress
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true); // True until initial auth state is known
  const [isProcessingLogin, setIsProcessingLogin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
        });
      } else {
        setUser(null);
      }
      setIsLoading(false); // Initial auth state determined
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async () => {
    setIsProcessingLogin(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle setting the user.
      // Redirection will be handled by useEffects in LoginPage or AppLayout.
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        console.log("Google sign-in popup closed by user.");
      } else if (error.code === 'auth/cancelled-popup-request') {
        console.log("Google sign-in popup request cancelled (e.g., another popup was opened).");
      } else if (error.code === 'auth/popup-blocked') {
        console.warn("Google sign-in popup blocked by the browser. Please enable popups for this site.");
      }
      else {
        console.error("An unexpected error occurred during Google sign-in:", error);
      }
    } finally {
      setIsProcessingLogin(false);
    }
  }, []);

  const logout = useCallback(async () => {
    // For simplicity, not adding a separate isProcessingLogout state here.
    // If logout took significant time or involved multiple steps, it might be useful.
    try {
      await firebaseSignOut(auth);
      setUser(null); // Explicitly set user to null, onAuthStateChanged will also update
      router.push('/'); // Navigate to login page after logout
    } catch (error) {
      console.error("Error during sign-out:", error);
    }
  }, [router]);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, isLoading, isProcessingLogin }}>
      {children}
    </AuthContext.Provider>
  );
};
