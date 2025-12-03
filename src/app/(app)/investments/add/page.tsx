"use client"; // This page needs to be a client component to use next/dynamic with ssr:false
import { useLanguage } from "@/contexts/language-context";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation"; // Import hook
import { useForm } from "@/contexts/form-context";
import { InvestmentForm } from "@/components/investments/investment-forms/investment-form";

export default function AddInvestmentPage() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const { setHeaderProps, openForm, closeForm } = useForm();

  useEffect(() => {
    openForm();

    const securityId = searchParams.get("securityId");
    const investmentType =
      searchParams.get("type") || (securityId ? "Buy Security" : "investment");

    const typeConfigs = {
      funds: {
        title: t("buy_fund"),
        backHref: "/investments/funds",
        backLabel: t("back_to_funds"),
      },
      gold: {
        title: t("buy_gold"),
        backHref: "/investments/gold",
        backLabel: t("back_to_gold"),
      },
      ["debt-instruments"]: {
        title: t("buy_debt_instrument"),
        backHref: "/investments/debt-instruments",
        backLabel: t("back_to_debt_instruments"),
      },
      ["real-estate"]: {
        title: t("add_real_estate"),
        backHref: "/investments/real-estate",
        backLabel: t("back_to_real_estate"),
      },
      ["currencies"]: {
        title: t("add_currency"),
        backHref: "/investments/currencies",
        backLabel: t("back_to_currencies"),
      },
      ["buy-security"]: {
        title: `${t("buy")} ${securityId}`,
        backHref: `/securities/${securityId}`,
        backLabel: t("back_to_buy_security"),
      },
    };

    // Get the config for the current type or use a default
    const normalizedType = investmentType.toLowerCase().replace(/\s+/g, "-");
    const config = typeConfigs[normalizedType as keyof typeof typeConfigs] || {
      title: `Add ${investmentType}`,
      backHref: "/investments",
      backLabel: t("back_to_investments"),
    };

    // Update header with the current config
    setHeaderProps({
      showBackButton: true,
      showNavControls: false,
      title: config.title,
      backHref: config.backHref,
      backLabel: config.backLabel,
    });

    // Clean up when component unmounts
    return () => {
      closeForm();
    };
  }, [searchParams.toString(), setHeaderProps, openForm, closeForm]);

  const securityId = searchParams.get("securityId");

  return (
    <div className="flex flex-col">
      <div className="container mx-auto flex-1">
        <InvestmentForm
          initialType={searchParams.get("type") || "Stocks"}
          securityId={securityId || undefined}
        />
      </div>
    </div>
  );
}
