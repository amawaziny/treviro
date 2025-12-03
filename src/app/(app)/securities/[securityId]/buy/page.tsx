"use client";
import { useLanguage } from "@/contexts/language-context";

import { BuySellSecurityForm } from "@/components/investments/securities/buy-sell-security-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useListedSecurities } from "@/hooks/use-listed-securities";
import { useParams } from "next/navigation";
import { useForm } from "@/contexts/form-context";
import type { ListedSecurity } from "@/lib/types";

export default function BuySecurityPage() {
  const { t, language } = useLanguage();
  const params = useParams();
  const securityId = params.securityId as string;
  const { listedSecurities, isLoading } = useListedSecurities();
  const [security, setSecurity] = useState<ListedSecurity | null>(null);
  const { setHeaderProps, openForm, closeForm } = useForm();

  // Set up header props when component mounts and when security is loaded
  useEffect(() => {
    openForm();

    if (security) {
      const pageTitle = `${t("Buy")}: ${security[language === "ar" ? "name_ar" : "name"]} ${security.securityType === "Fund" ? `(${t(security.fundType!)})` : ""}`;

      setHeaderProps({
        showBackButton: true,
        backHref: `/securities/${securityId}`,
        backLabel: t("back_to_security_details"),
        title: pageTitle,
        showNavControls: false,
      });
    }

    // Clean up when component unmounts
    return () => {
      closeForm();
    };
  }, [security, securityId, setHeaderProps, openForm, closeForm]);

  // Fetch security data
  useEffect(() => {
    if (listedSecurities.length > 0) {
      const foundSecurity = listedSecurities.find((s) => s.id === securityId);
      setSecurity(foundSecurity || null);
    }
  }, [listedSecurities, securityId]);

  if (isLoading || !security) {
    return (
      <div className="container mx-auto py-8 px-4 flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <Card>
        <CardHeader>
          {security?.description && (
            <CardDescription> {security.description} </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <BuySellSecurityForm securityId={security.id} mode="buy" />
        </CardContent>
      </Card>
    </div>
  );
}
