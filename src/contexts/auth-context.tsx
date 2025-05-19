
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
    console.log("AuthContext: Setting up onAuthStateChanged listener.");
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      console.log("AuthContext: onAuthStateChanged triggered. Firebase user:", firebaseUser);
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
      console.log("AuthContext: isLoading set to false.");
    });

    return () => {
      console.log("AuthContext: Cleaning up onAuthStateChanged listener.");
      unsubscribe();
    };
  }, []);

  const login = useCallback(async () => {
    console.log("AuthContext: login function called.");
    setIsProcessingLogin(true);
    const provider = new GoogleAuthProvider();
    try {
      console.log("AuthContext: Attempting signInWithPopup...");
      const result = await signInWithPopup(auth, provider);
      console.log("AuthContext: signInWithPopup successful. Result:", result);
      // onAuthStateChanged will handle setting the user and further state updates.
    } catch (error: any) {
      console.error("AuthContext: signInWithPopup error:", error);
      if (error.code === 'auth/popup-closed-by-user') {
        console.log("AuthContext: Google sign-in popup closed by user.");
      } else if (error.code === 'auth/cancelled-popup-request') {
        console.log("AuthContext: Google sign-in popup request cancelled.");
      } else if (error.code === 'auth/popup-blocked') {
        console.warn("AuthContext: Google sign-in popup blocked by the browser.");
      } else {
        console.error("AuthContext: An unexpected error occurred during Google sign-in:", error);
      }
    } finally {
      setIsProcessingLogin(false);
      console.log("AuthContext: isProcessingLogin set to false.");
    }
  }, []);

  const logout = useCallback(async () => {
    console.log("AuthContext: logout function called.");
    try {
      await firebaseSignOut(auth);
      // setUser(null) will be handled by onAuthStateChanged
      router.push('/'); // Navigate to login page after logout
      console.log("AuthContext: Logout successful, navigated to /");
    } catch (error) {
      console.error("AuthContext: Error during sign-out:", error);
    }
  }, [router]);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, isLoading, isProcessingLogin }}>
      {children}
    </AuthContext.Provider>
  );
};
