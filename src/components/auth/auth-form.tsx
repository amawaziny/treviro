"use client";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LogIn, Loader2 } from "lucide-react";
import { useState } from "react";

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 6) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

function getPasswordStrengthLabel(score: number) {
  switch (score) {
    case 0:
    case 1:
      return "Weak";
    case 2:
      return "Fair";
    case 3:
      return "Good";
    case 4:
      return "Strong";
    default:
      return "";
  }
}

function getPasswordStrengthPercent(score: number) {
  return Math.min(100, Math.round((score / 4) * 100));
}

function getPasswordStrengthColor(score: number) {
  switch (score) {
    case 0:
    case 1:
      return "bg-red-500";
    case 2:
      return "bg-yellow-500";
    case 3:
      return "bg-blue-500";
    case 4:
      return "bg-green-500";
    default:
      return "bg-gray-200";
  }
}

export function AuthForm() {
  const {
    login,
    signInWithEmailAndPassword,
    signUpWithEmailAndPassword,
    isLoading,
    isProcessingLogin,
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const showSpinner = isLoading || isProcessingLogin;
  const passwordStrength = getPasswordStrength(password);
  const passwordStrengthLabel = getPasswordStrengthLabel(passwordStrength);
  const passwordStrengthPercent = getPasswordStrengthPercent(passwordStrength);
  const passwordStrengthColor = getPasswordStrengthColor(passwordStrength);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (mode === 'signin') {
        await signInWithEmailAndPassword(email, password);
      } else {
        await signUpWithEmailAndPassword(email, password);
      }
    } catch (err: any) {
      // Firebase error codes
      let msg = err?.message || 'Authentication failed';
      if (err?.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      } else if (err?.code === 'auth/email-already-in-use') {
        msg = 'This email is already in use.';
      } else if (err?.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      } else if (err?.code === 'auth/wrong-password') {
        msg = 'Incorrect password.';
      } else if (err?.code === 'auth/user-not-found') {
        msg = 'No account found with this email.';
      }
      setError(msg);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">
            Treviro
          </CardTitle>
          <CardDescription>Securely manage your investments.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleEmailAuth}>
            <input
              type="email"
              placeholder="Email"
              className="w-full rounded border px-3 py-2"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={showSpinner}
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full rounded border px-3 py-2"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              disabled={showSpinner}
            />
            {mode === 'signup' && (
              <>
                <div className="w-full h-2 bg-gray-200 rounded mt-1 mb-1 overflow-hidden">
                  <div
                    className={`h-2 rounded transition-all duration-300 ${passwordStrengthColor}`}
                    style={{ width: `${passwordStrengthPercent}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Password strength: {passwordStrengthLabel}</span>
                  <span className="text-muted-foreground">min 6 chars</span>
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  Use at least 6 characters. Stronger passwords include uppercase, numbers, and symbols.
                </div>
              </>
            )}
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={showSpinner}
            >
              {showSpinner ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              {showSpinner
                ? 'Processing...'
                : mode === 'signin'
                ? 'Sign In with Email'
                : 'Sign Up with Email'}
            </Button>
          </form>
          <div className="my-4 flex items-center justify-center">
            <span className="text-sm text-muted-foreground">
              {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
            </span>
            <button
              type="button"
              className="ml-2 text-primary underline text-sm"
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              disabled={showSpinner}
            >
              {mode === 'signin' ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
          <div className="my-4 flex items-center justify-center">
            <span className="text-xs text-muted-foreground">or</span>
          </div>
          <Button
            onClick={login}
            className="w-full"
            size="lg"
            disabled={showSpinner}
            variant="outline"
          >
            {showSpinner ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="mr-2 h-4 w-4" />
            )}
            {showSpinner ? 'Processing...' : 'Login with Google'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
