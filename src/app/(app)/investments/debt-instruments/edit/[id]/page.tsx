"use client";

import { useLanguage } from "@/contexts/language-context";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useForm } from "@/contexts/form-context";
import { useInvestments } from "@/contexts/investment-context";
import { InvestmentForm } from "@/components/investments/investment-forms/investment-form";
import { DebtInstrumentInvestment } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EditDebtInstrumentPage() {
  const { t } = useLanguage();
  const params = useParams();
  const { debtInvestments, isLoading } = useInvestments();
  const { setHeaderProps, openForm, closeForm } = useForm();
  const [investment, setInvestment] = useState<DebtInstrumentInvestment | null>(
    null,
  );

  useEffect(() => {
    if (!params?.id) return;
    const found = debtInvestments.find((inv) => inv.id === params.id);
    if (found) {
      setInvestment(found);
    }
  }, [params?.id, debtInvestments]);

  useEffect(() => {
    openForm();

    if (investment) {
      const title = `${t("edit_debt_instrument")}: ${investment.name}`;
      setHeaderProps({
        showBackButton: true,
        backHref: "/investments/debt-instruments",
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
            {t("the_requested_debt_instrument_could_not_be_found")}
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
