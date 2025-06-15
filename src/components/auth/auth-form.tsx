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
import { ForgotPasswordForm } from "./forgot-password-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/language-context";

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 6) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  console.log("Password:", password, "Score:", score);
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
      return "#ef4444"; // Tailwind red-500
    case 2:
      return "#f59e0b"; // Tailwind yellow-500
    case 3:
      return "#3b82f6"; // Tailwind blue-500
    case 4:
      return "#22c55e"; // Tailwind green-500
    default:
      return "#e5e7eb"; // Tailwind gray-200
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

  const [mode, setMode] = useState<"sign-in" | "sign-up" | "forgot-password">(
    "sign-in",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showSpinner, setShowSpinner] = useState(false);
  const { t } = useLanguage();

  const handleEmailAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setShowSpinner(true);
    setError(null);
    try {
      if (mode === "sign-in") {
        await signInWithEmailAndPassword(email, password);
      } else {
        await signUpWithEmailAndPassword(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setShowSpinner(false);
    }
  };

  if (mode === "forgot-password") {
    return <ForgotPasswordForm onBack={() => setMode("sign-in")} />;
  }

  const calculatedWidth = `${getPasswordStrengthPercent(getPasswordStrength(password))}%`;
  const calculatedBackgroundColor = getPasswordStrengthColor(
    getPasswordStrength(password),
  );

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <Card className="w-full max-w-md shadow-xl mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">
            {t("app_name")}
          </CardTitle>
          <CardDescription>{t("securely_manage_investments")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                {mode === "sign-in"
                  ? t("welcome_back")
                  : t("create_an_account")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {mode === "sign-in"
                  ? t("enter_email_to_sign_in")
                  : t("enter_email_to_create_account")}
              </p>
            </div>
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEmail(e.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t("password")}</Label>
                  {mode === "sign-in" && (
                    <Button
                      type="button"
                      variant="link"
                      className="px-0 font-normal"
                      onClick={() => setMode("forgot-password")}
                    >
                      {t("forgot_password")}
                    </Button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPassword(e.target.value)
                  }
                  required
                />
              </div>
              {mode === "sign-up" && (
                <>
                  <div className="w-full h-2 bg-gray-200 rounded mt-1 mb-1 overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: calculatedWidth,
                        backgroundColor: calculatedBackgroundColor,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("password_must_be_at_least_6_chars")}
                  </p>
                </>
              )}
              {error && <div className="text-red-500 text-sm">{error}</div>}
              <Button type="submit" className="w-full" disabled={showSpinner}>
                {showSpinner && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {mode === "sign-in" ? t("sign_in") : t("sign_up")}
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    {t("or_continue_with")}
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={login}
                disabled={showSpinner}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                {t("google")}
              </Button>
            </form>
            <div className="text-center text-sm">
              {mode === "sign-in" ? (
                <p>
                  {t("dont_have_account")}{" "}
                  <Button
                    type="button"
                    variant="link"
                    className="px-0 font-normal"
                    onClick={() => setMode("sign-up")}
                  >
                    {t("sign_up")}
                  </Button>
                </p>
              ) : (
                <p>
                  {t("already_have_account")}{" "}
                  <Button
                    type="button"
                    variant="link"
                    className="px-0 font-normal"
                    onClick={() => setMode("sign-in")}
                  >
                    {t("sign_in")}
                  </Button>
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
