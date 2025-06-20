"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLanguage } from "@/contexts/language-context";

interface ForgotPasswordFormProps {
  onBack: () => void;
}

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { sendPasswordResetEmail } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await sendPasswordResetEmail(email);
      toast({
        title: t("password_reset_email_sent"),
        description: t("check_email_for_instructions"),
        testId: "success-toast",
        variant: "default",
      });
      onBack();
    } catch (error: any) {
      toast({
        title: t("error"),
        description: error.message || t("failed_to_send_reset_email"),
        variant: "destructive",
        testId: "error-toast",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
              <h1 className="text-xl font-semibold tracking-tight">
                {t("reset_your_password")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("forgot_password_instruction")}
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("email")}</Label>
                <Input
                  id="email"
                  data-testid="forgot-password-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                data-testid="send-reset-link-button"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading && (
                  <Loader2
                    className="mr-2 h-4 w-4 animate-spin"
                    data-testid="loading-spinner"
                  />
                )}
                {t("send_reset_link")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                data-testid="back-to-signin-button"
                className="w-full"
                onClick={onBack}
                disabled={isLoading}
              >
                {t("back_to_sign_in")}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
