"use client";

import type { ReactNode } from "react";
import React, { createContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { auth as firebaseAuthService } from "@/lib/firebase";
import { trackEvent } from "@/lib/analytics";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
  createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
} from "firebase/auth";

interface AuthContextType {
  isAuthenticated: boolean;
  user: FirebaseUser | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  signInWithEmailAndPassword: (
    email: string,
    password: string,
  ) => Promise<void>;
  signUpWithEmailAndPassword: (
    email: string,
    password: string,
  ) => Promise<void>;
  isLoading: boolean;
  isProcessingLogin: boolean;
  sendPasswordResetEmail: (email: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
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
          setUser(firebaseUser);
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
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(firebaseAuthService!, provider);

      // Track successful login
      trackEvent("login", {
        method: "google",
        user_id: result.user.uid,
        email: result.user.email,
      });

      router.push("/dashboard");
    } catch (error) {
      // Track login error
      trackEvent("login_error", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      console.error("Error during login:", error);
      throw error;
    }
  }, [router]);

  const logout = useCallback(async () => {
    try {
      // Track logout event before actually signing out
      if (user) {
        trackEvent("logout", {
          user_id: user.uid,
          email: user.email,
        });
      }

      await firebaseSignOut(firebaseAuthService!);
      setUser(null);
      router.push("/");
    } catch (error) {
      trackEvent("logout_error", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      console.error("Error during logout:", error);
      throw error;
    }
  }, [router, user]);

  const signInWithEmailAndPassword = useCallback(
    async (email: string, password: string) => {
      try {
        const userCredential = await firebaseSignInWithEmailAndPassword(
          firebaseAuthService!,
          email,
          password,
        );

        // Track successful email/password login
        trackEvent("login", {
          method: "email",
          user_id: userCredential.user.uid,
          email: userCredential.user.email,
        });

        router.push("/dashboard");
      } catch (error) {
        // Track login error
        const errorMessage = error instanceof Error ? 
          (error.message.includes('auth/invalid-credential') ? 
            'Invalid email or password. Please try again.' : 
            error.message) : 
          'An error occurred during sign in';
          
        trackEvent("login_error", {
          method: "email",
          email: email,
          error: errorMessage,
        });
        console.error("Error signing in with email/password:", error);
        throw new Error(errorMessage);
      }
    },
    [router],
  );

  const signUpWithEmailAndPassword = useCallback(
    async (email: string, password: string) => {
      try {
        const userCredential = await firebaseCreateUserWithEmailAndPassword(
          firebaseAuthService!,
          email,
          password,
        );

        // Track successful signup
        trackEvent("signup", {
          method: "email",
          user_id: userCredential.user.uid,
          email: email,
        });

        router.push("/dashboard");
      } catch (error) {
        // Track signup error
        trackEvent("signup_error", {
          method: "email",
          email: email,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        console.error("Error signing up with email/password:", error);
        throw error;
      }
    },
    [router],
  );

  const sendPasswordResetEmail = async (email: string) => {
    if (!firebaseAuthService) {
      console.error(
        "AuthContext: Firebase Auth service not available for password reset.",
      );
      return;
    }
    try {
      await firebaseSendPasswordResetEmail(firebaseAuthService!, email);

      // Track password reset email sent
      trackEvent("password_reset_email_sent", {
        email: email,
      });

      console.log("AuthContext: Password reset email sent successfully.");
    } catch (error: any) {
      // Track password reset error
      trackEvent("password_reset_error", {
        email: email,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      console.error("AuthContext: Error sending password reset email:", error);
      throw error;
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        login,
        logout,
        signInWithEmailAndPassword,
        signUpWithEmailAndPassword,
        isLoading,
        isProcessingLogin,
        sendPasswordResetEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
