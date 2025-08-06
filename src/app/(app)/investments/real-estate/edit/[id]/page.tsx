"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useInvestments } from "@/hooks/use-investments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { InvestmentForm } from "@/components/investments/investment-forms/investment-form";
import type { RealEstateInvestment } from "@/lib/types";
import { useLanguage } from "@/contexts/language-context";
import { useForm } from "@/contexts/form-context";

export default function EditRealEstateInvestmentPage() {
  const { t } = useLanguage();
  const params = useParams();
  const { investments, isLoading } = useInvestments();
  const { setHeaderProps, openForm, closeForm } = useForm();
  const [investment, setInvestment] = useState<RealEstateInvestment | null>(
    null,
  );

  useEffect(() => {
    if (!params?.id) return;
    const found = investments.find(
      (inv) => inv.type === "Real Estate" && inv.id === params.id,
    ) as RealEstateInvestment | undefined;
    if (found) {
      setInvestment(found);
    }
  }, [params?.id, investments]);

  useEffect(() => {
    openForm();

    if (investment) {
      const title = `${t("edit_real_estate")}: ${investment.name}`;
      setHeaderProps({
        showBackButton: true,
        backHref: "/investments/real-estate",
        title: title,
        showNavControls: false,
      });
    }

    return () => closeForm();
  }, [investment, setHeaderProps]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        {t("loading_investment")}
      </div>
    );
  }

  if (!investment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("investment_not_found")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">
            {t("the_requested_real_estate_investment_could_not_be_found")}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container mx-auto">
      <InvestmentForm mode="edit" initialValues={investment} />
    </div>
  );
}
