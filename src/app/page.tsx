
"use client";

import { AuthForm } from '@/components/auth/auth-form';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';


export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log(`LoginPage Effect: isLoading=${isLoading}, isAuthenticated=${isAuthenticated}`);
    if (!isLoading && isAuthenticated) {
      console.log("LoginPage: Redirecting to /dashboard");
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || (!isLoading && isAuthenticated)) {
    // Show a loading skeleton or spinner while checking auth or redirecting
    // console.log(`LoginPage Render: Showing Skeleton. isLoading=${isLoading}, isAuthenticated=${isAuthenticated}`);
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }
  
  // console.log(`LoginPage Render: Showing AuthForm. isLoading=${isLoading}, isAuthenticated=${isAuthenticated}`);
  return <AuthForm />;
}
