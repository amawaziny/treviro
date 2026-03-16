"use client";

import { AddPriceHistoryForm } from "@/components/securities/add-price-history-form";
import { useAuth } from "@/hooks/use-auth";
import { useAdmin } from "@/hooks/use-admin";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AddPriceHistoryPage() {
  const { isAuthenticated } = useAuth();
  const { isAdmin, isLoading } = useAdmin();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && !isAdmin && !isLoading) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, isAdmin, router]);

  // render nothing until auth status resolves
  if (!isAuthenticated || !isAdmin || isLoading) return null;

  return <AddPriceHistoryForm />;
}
