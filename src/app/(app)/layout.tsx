"use client";

import { Header } from "@/components/layout/header";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
// Skeleton import might be used by the loading state, ensure it's available if that part of the code is active.
// import { Skeleton } from '@/components/ui/skeleton';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset, // This is the main content area container
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Coins } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/contexts/language-context"; // Added import
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { useIsMobile } from "@/hooks/use-mobile";
import { FormProvider, useForm } from "@/contexts/form-context";
import { useIsDetailsPage } from "@/hooks/use-route-check";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { language } = useLanguage(); // Added to get current language
  const isMobile = useIsMobile();
  const { t } = useLanguage();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Coins className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">{t("loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <FormProvider>
      <FormAwareLayout isMobile={isMobile} language={language}>
        {children}
      </FormAwareLayout>
    </FormProvider>
  );
}

function FormAwareLayout({
  isMobile,
  language,
  children,
}: {
  isMobile: boolean;
  language: string;
  children: React.ReactNode;
}) {
  const { isFormOpen } = useForm();
  const { setOpenMobile } = useSidebar(); // This comes from @/components/ui/sidebar
  const isDetailsPage = useIsDetailsPage();
  const { t } = useLanguage();

  // Close sidebar and bottom tabs when form is open or on details page
  React.useEffect(() => {
    if (isFormOpen) {
      setOpenMobile(false);
    }
  }, [isFormOpen, setOpenMobile]);

  return (
    <>
      {/* Only render Sidebar on desktop/tablet and when form is not open */}
      {!isMobile && !isFormOpen && (
        <Sidebar
          variant="sidebar"
          collapsible="icon"
          side={language === "ar" ? "right" : "left"}
        >
          <SidebarRail />
          <SidebarHeader className="p-4 justify-center items-center group-data-[collapsible=icon]:justify-start">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Coins className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-primary group-data-[collapsible=icon]:hidden">
                {t("Treviro")}
              </span>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarNav />
          </SidebarContent>
        </Sidebar>
      )}
      <SidebarInset>
        {" "}
        {/* This component renders a <main> tag that is flex flex-col */}
        <Header /> {/* This is the app's main top bar for the content area */}
        {/* This div will wrap the page content, provide padding, and grow to fill remaining vertical space */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-background">
          {children}{" "}
          {/* This is the page-specific content, e.g., DashboardPage */}
        </div>
        {!isFormOpen && !isDetailsPage && <BottomTabBar />}
      </SidebarInset>
    </>
  );
}
