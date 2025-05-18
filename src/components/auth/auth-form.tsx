"use client";

import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn } from 'lucide-react'; // Using LogIn as a generic login icon

export function AuthForm() {
  const { login } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Treviro</CardTitle>
          <CardDescription>Securely manage your investments.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={login} className="w-full" size="lg">
            <LogIn className="mr-2 h-5 w-5" />
            Login with Google (Mock)
          </Button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            This is a simulated Google login for demonstration purposes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
