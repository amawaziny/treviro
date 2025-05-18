
"use client";

import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn } from 'lucide-react'; 

export function AuthForm() {
  const { login, isLoading } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Treviro</CardTitle>
          <CardDescription>Securely manage your investments.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={login} className="w-full" size="lg" disabled={isLoading}>
            <LogIn className="mr-2 h-5 w-5" />
            {isLoading ? "Logging in..." : "Login with Google"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
