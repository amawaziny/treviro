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

interface ForgotPasswordFormProps {
  onBack: () => void;
}

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { sendPasswordResetEmail } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await sendPasswordResetEmail(email);
      toast({
        title: "Password Reset Email Sent",
        description:
          "Please check your email for instructions to reset your password.",
      });
      onBack();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send password reset email.",
        variant: "destructive",
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
            Treviro
          </CardTitle>
          <CardDescription>Securely manage your investments.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                Reset your password
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter your email address and we'll send you a link to reset your
                password.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Reset Link
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={onBack}
                disabled={isLoading}
              >
                Back to Sign In
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
