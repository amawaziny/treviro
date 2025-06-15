"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useInvestments } from "@/hooks/use-investments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { AddInvestmentForm } from "@/components/investments/add/add-investment-form";
import type { RealEstateInvestment } from "@/lib/types";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";

export default function EditRealEstateInvestmentPage() {
  const { t } = useLanguage();
  const params = useParams();
  const { investments, isLoading } = useInvestments();
  const [investment, setInvestment] = useState<RealEstateInvestment | null>(
    null,
  );
  const { language } = useLanguage();

  const BackArrowIcon = language === "ar" ? ArrowRight : ArrowLeft;

  useEffect(() => {
    if (!params?.id) return;
    const found = investments.find(
      (inv) => inv.type === "Real Estate" && inv.id === params.id,
    ) as RealEstateInvestment | undefined;
    if (found) {
      setInvestment(found);
    }
  }, [params?.id, investments]);

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
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Link href="/investments/real-estate" passHref>
          <Button variant="outline" size="sm">
            <BackArrowIcon
              className={language === "ar" ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"}
            />
            {t("back_to_real_estate")}
          </Button>
        </Link>
      </div>
      <AddInvestmentForm mode="edit" initialValues={investment} />
    </div>
  );
}
