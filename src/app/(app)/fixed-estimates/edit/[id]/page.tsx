"use client";

import { useEffect } from "react";
import { AddEditFixedEstimateForm } from "@/components/fixed-estimates/add-edit-fixed-estimate-form";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/language-context";
import { useForm } from "@/contexts/form-context";
import { useInvestments } from "@/hooks/use-investments";
import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditFixedEstimatePage() {
  const { t } = useLanguage();
  const { setHeaderProps, openForm, closeForm } = useForm();
  const { fixedEstimates, isLoading } = useInvestments();
  const params = useParams();
  const estimateId = params.id as string;

  const estimate = fixedEstimates.find((e) => e.id === estimateId);

  useEffect(() => {
    openForm();

    setHeaderProps({
      title: t("edit_fixed_estimate"),
      description: t("update_your_recurring_income_or_expenses"),
      showBackButton: true,
      showNavControls: false,
      backHref: "/fixed-estimates",
      backLabel: t("back_to_fixed_estimates"),
    });

    return () => {
      closeForm();
    };
  }, [t, setHeaderProps, openForm, closeForm]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-4">
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!estimate) {
    return (
      <div className="container mx-auto py-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              {t("fixed_estimate_not_found")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4">
      <Card>
        <CardContent className="pt-6">
          <AddEditFixedEstimateForm mode="edit" estimate={estimate} />
        </CardContent>
      </Card>
    </div>
  );
}
