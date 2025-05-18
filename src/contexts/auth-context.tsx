
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase'; // Import Firebase auth instance
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
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
      setIsLoading(false);
    });

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);

  const login = useCallback(async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // User will be set by onAuthStateChanged, and redirection will be handled
      // by useEffect hooks in LoginPage or AppLayout based on isAuthenticated state.
      // const firebaseUser = result.user;
      // if (firebaseUser) {
      //   setUser({
      //     uid: firebaseUser.uid,
      //     displayName: firebaseUser.displayName,
      //     email: firebaseUser.email,
      //     photoURL: firebaseUser.photoURL,
      //   });
      //   // router.push('/dashboard'); // Removed this line
      // }
    } catch (error: any) { // Type error as any to access 'code' property
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
      setIsLoading(false);
    }
  }, []); // router was removed from dependencies as it's not directly used here anymore

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await firebaseSignOut(auth);
      setUser(null);
      router.push('/');
    } catch (error) {
      console.error("Error during sign-out:", error);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
