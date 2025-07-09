"use client";
import { useLanguage } from "@/contexts/language-context";

import React, { useEffect } from "react";
import { useInvestments } from "@/hooks/use-investments";
import { EditStockInvestmentForm } from "@/components/investments/stocks/edit-stock-investment-form";
import { notFound } from "next/navigation";
import { useForm } from "@/contexts/form-context";
import { useRouter } from "next/navigation";

export default function EditStockInvestmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = useLanguage();
  const { id } = React.use(params);
  const { investments, isLoading } = useInvestments();
  const router = useRouter();

  if (isLoading) {
    return <div>{t("loading")}</div>;
  }

  // Find the investment by id
  const security = investments.find(
    (inv) => inv.id === id && inv.type === "Stocks",
  ) as import("@/lib/types").SecurityInvestment | undefined;

  if (!security) {
    return notFound();
  }

  const { setHeaderProps, openForm, closeForm } = useForm();

  // Set up header props when component mounts and when security is loaded
  useEffect(() => {
    openForm();

    if (security) {
      setHeaderProps({
        showBackButton: true,
        backHref: () => router.back(),
        backLabel: t("back_to_security_details"),
        title: `${t("Edit Purchase")}: ${security.tickerSymbol}`,
        showNavControls: false,
      });
    }

    // Clean up when component unmounts
    return () => {
      closeForm();
    };
  }, [security, id, setHeaderProps, openForm, closeForm, router]);

  return <EditStockInvestmentForm investment={security} />;
}
