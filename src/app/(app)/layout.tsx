"use client";

import { Header } from '@/components/layout/header';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Coins } from 'lucide-react';
import Link from 'next/link';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Coins className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Treviro...</p>
        </div>
      </div>
    );
  }

  return (
    <Sidebar variant="sidebar" collapsible="icon" side="left">
      <SidebarRail />
      <SidebarHeader className="p-4 justify-center items-center group-data-[collapsible=icon]:justify-start">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Coins className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold text-primary group-data-[collapsible=icon]:hidden">Treviro</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarNav />
      </SidebarContent>
      <SidebarInset>
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-background">
            {children}
          </main>
        </div>
      </SidebarInset>
    </Sidebar>
  );
}
