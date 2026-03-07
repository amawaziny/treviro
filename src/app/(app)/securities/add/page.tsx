"use client";

import { ListedSecurityForm } from "@/components/securities/listed-security-form";
import { useAuth } from "@/hooks/use-auth";
import { useAdmin } from "@/hooks/use-admin";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useInvestments } from "@/contexts/investment-context";
import { useListedSecurities } from "@/hooks/use-listed-securities";
import { ListedSecurity } from "@/lib/types";
import { ListedSecurityFormValues } from "@/lib/schemas";

export default function AddSecurityPage() {
  const { isAuthenticated } = useAuth();
  const { isAdmin, isLoading } = useAdmin();
  const { createSecurity } = useListedSecurities();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && !isAdmin && !isLoading) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, isAdmin, router]);

  // render nothing until auth status resolves
  if (!isAuthenticated || !isAdmin || isLoading) return null;

  const handleCreateSecurity = async (securityData: any) => {
    await createSecurity(securityData);
    router.push("/securities");
  };

  return <ListedSecurityForm onSubmit={handleCreateSecurity} />;
}
