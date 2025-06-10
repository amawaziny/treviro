"use client";

import type { ReactNode } from "react";
import React, { createContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { auth as firebaseAuthService } from "@/lib/firebase"; // Renamed import
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";

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
  isProcessingLogin: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingLogin, setIsProcessingLogin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!firebaseAuthService) {
      console.warn(
        "AuthContext: Firebase Auth service not available. Skipping onAuthStateChanged listener.",
      );
      setIsLoading(false);
      return;
    }
    console.log("AuthContext: Setting up onAuthStateChanged listener.");
    const unsubscribe = onAuthStateChanged(
      firebaseAuthService,
      (firebaseUser: FirebaseUser | null) => {
        console.log(
          "AuthContext: onAuthStateChanged triggered. Firebase user present:",
          !!firebaseUser,
        );
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
        console.log("AuthContext: isLoading set to false.");
      },
    );

    return () => {
      console.log("AuthContext: Cleaning up onAuthStateChanged listener.");
      unsubscribe();
    };
  }, []);

  const login = useCallback(async () => {
    if (!firebaseAuthService) {
      console.error(
        "AuthContext: Firebase Auth service not available for login.",
      );
      setIsProcessingLogin(false);
      return;
    }
    console.log("AuthContext: login function called.");
    setIsProcessingLogin(true);
    const provider = new GoogleAuthProvider();
    try {
      console.log("AuthContext: Attempting signInWithPopup...");
      const result = await signInWithPopup(firebaseAuthService, provider);
      // User object is set by onAuthStateChanged
      console.log(
        "AuthContext: signInWithPopup successful. User UID:",
        result.user?.uid,
      );
      // Removed router.push('/dashboard'); to let useEffect in LoginPage handle it
    } catch (error: any) {
      if (error.code === "auth/popup-closed-by-user") {
        console.warn(
          "AuthContext: Google sign-in popup was closed by user or due to an interruption.",
        );
      } else if (error.code === "auth/cancelled-popup-request") {
        console.warn(
          "AuthContext: Google sign-in popup request cancelled (e.g., multiple popups).",
        );
      } else if (error.code === "auth/popup-blocked") {
        console.warn(
          "AuthContext: Google sign-in popup blocked by the browser. Consider notifying the user to enable popups.",
        );
        // You might want to show a toast or message to the user here.
      } else {
        console.error(
          "AuthContext: An unexpected error occurred during Google sign-in. Code:",
          error.code,
          "Message:",
          error.message,
        );
      }
    } finally {
      setIsProcessingLogin(false);
      console.log("AuthContext: isProcessingLogin set to false.");
    }
  }, [router]); // Added router to dependency array as it's used in logout

  const logout = useCallback(async () => {
    if (!firebaseAuthService) {
      console.error(
        "AuthContext: Firebase Auth service not available for logout.",
      );
      return;
    }
    console.log("AuthContext: logout function called.");
    try {
      await firebaseSignOut(firebaseAuthService);
      // setUser(null) will be handled by onAuthStateChanged
      router.push("/");
      console.log("AuthContext: Logout successful, navigated to /");
    } catch (error) {
      console.error("AuthContext: Error during sign-out:", error);
    }
  }, [router]);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        login,
        logout,
        isLoading,
        isProcessingLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
