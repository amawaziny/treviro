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
import { getInvestmentType } from "@/lib/utils";

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

  const handleCreateSecurity = async (formValues: ListedSecurityFormValues) => {
    const securityData: Omit<ListedSecurity, "id"> = {
      name: formValues.name,
      name_ar: formValues.name_ar,
      symbol: formValues.symbol,
      logoUrl: formValues.logoUrl,
      price: formValues.price,
      currency: formValues.currency,
      changePercent: 0,
      high: formValues.high ?? 0,
      low: formValues.low ?? 0,
      volume: formValues.volume ?? 0,
      market: formValues.market,
      securityType: formValues.securityType,
      fundType: getInvestmentType(formValues.fundType),
      description: formValues.description,
      isin: formValues.isin || "",
      sector: formValues.sector || "",
      sectorAr: "",
      currencyAr: formValues.currency === "USD" ? "دولار أمريكي" : formValues.currency === "EGP" ? "ج.م" : formValues.currency,
      lastUpdated: new Date().toISOString(),
      securityTypeAr: formValues.securityType === "Stock" ? "اوراق مالية مصرية - اسهم" : "صندوق",
    };

    await createSecurity(securityData);
    router.push("/securities");
  };

  return <ListedSecurityForm onSubmit={handleCreateSecurity} />;
}
