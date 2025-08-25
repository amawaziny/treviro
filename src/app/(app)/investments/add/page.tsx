"use client"; // This page needs to be a client component to use next/dynamic with ssr:false
import { useLanguage } from "@/contexts/language-context";
import { Suspense, useEffect } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react"; // Import icons
import { useSearchParams } from "next/navigation"; // Import hook

import { useForm } from "@/contexts/form-context";

// Define a simple loading fallback for the Suspense boundary
function PageLoadingFallback() {
  const { t } = useLanguage();
  return (
    <div className="flex items-center justify-center py-10">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {t("loading")}
    </div>
  );
}

// Dynamically import AddInvestmentForm with ssr: false
// The component itself (AddInvestmentForm) must also be marked with "use client";
// We can remove the suspense: true here if the parent handles suspense
const AddInvestmentForm = dynamic(
  () =>
    import("@/components/investments/investment-forms/investment-form").then(
      (mod) => mod.InvestmentForm,
    ),
  {
    ssr: false, // Ensure this component is only rendered on the client
    // suspense: true,  // Removed, parent Suspense handles this
    loading: () => <PageLoadingFallback />, // Use a loading component if needed within dynamic import
  },
);

export default function AddInvestmentPage() {
  return (
    <div className="flex flex-col">
      <Suspense fallback={<PageLoadingFallback />}>
        <AddInvestmentPageContent />
      </Suspense>
    </div>
  );
}

// Extract the component logic that uses hooks into a new component
function AddInvestmentPageContent() {
  const { t } = useLanguage();
  // All hooks must be called at the top level, before any conditional returns
  const searchParams = useSearchParams();
  const { setHeaderProps, openForm, closeForm } = useForm();

  // Set up header props effect based on investment type
  useEffect(() => {
    // Open form when component mounts
    openForm();

    const securityId = searchParams.get("securityId");
    // Get the investment type from URL parameters
    const investmentType =
      searchParams.get("type") || (securityId ? "Buy Security" : "investment");

    // Map investment types to their display configurations
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
        backHref: `/securities/details/${securityId}`,
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
    <div className="container mx-auto flex-1">
      <AddInvestmentForm
        initialType={searchParams.get("type") || "Stocks"}
        securityId={securityId || undefined}
      />
    </div>
  );
}
