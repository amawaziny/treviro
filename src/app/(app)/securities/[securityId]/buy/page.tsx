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
import { useEffect } from "react";
import { useListedSecurities } from "@/hooks/use-listed-securities";
import { useParams } from "next/navigation";
import { useForm } from "@/contexts/form-context";
import type { SecurityInvestment } from "@/lib/types";
import { useInvestments } from "@/contexts/investment-context";

export default function BuySecurityPage() {
  const { t, language } = useLanguage();
  const params = useParams();
  const securityId = params.securityId as string;
  const { getSecurityById, isLoading: isLoadingSecurities } =
    useListedSecurities();
  const {
    buy,
    getInvestmentBySecurityId,
    isLoading: isLoadingInvestments,
  } = useInvestments();
  const { setHeaderProps, openForm, closeForm } = useForm();

  const security = getSecurityById(securityId);
  const securityInvestment = getInvestmentBySecurityId(
    securityId,
  ) as SecurityInvestment;

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

  const isLoading = isLoadingSecurities || isLoadingInvestments;

  if (isLoading || !security || !securityInvestment) {
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
          <BuySellSecurityForm
            security={security}
            securityInvestment={securityInvestment}
            submitTrx={buy}
            mode="buy"
          />
        </CardContent>
      </Card>
    </div>
  );
}
