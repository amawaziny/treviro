"use client"; // This page needs to be a client component to use next/dynamic with ssr:false

import { Suspense, useEffect } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react"; // Import icons
import { useSearchParams } from "next/navigation"; // Import hook

import { useForm } from "@/contexts/form-context";

// Define a simple loading fallback for the Suspense boundary
function PageLoadingFallback() {
  return (
    <div className="flex items-center justify-center py-10">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Loading...
    </div>
  );
}

// Dynamically import AddInvestmentForm with ssr: false
// The component itself (AddInvestmentForm) must also be marked with "use client";
// We can remove the suspense: true here if the parent handles suspense
const AddInvestmentForm = dynamic(
  () =>
    import("@/components/investments/add/add-investment-form").then(
      (mod) => mod.AddInvestmentForm,
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
        title: "Buy Fund",
        backHref: "/investments/funds",
        backLabel: "Back to Funds",
      },
      gold: {
        title: "Buy Gold",
        backHref: "/investments/gold",
        backLabel: "Back to Gold",
      },
      "debt-instruments": {
        title: "Buy Debt Instrument",
        backHref: "/investments/debt-instruments",
        backLabel: "Back to Debt Instruments",
      },
      "real-estate": {
        title: "Add Real Estate",
        backHref: "/investments/real-estate",
        backLabel: "Back to Real Estate",
      },
      currencies: {
        title: "Add Currency",
        backHref: "/investments/currencies",
        backLabel: "Back to Currencies",
      },
      "buy-security": {
        title: `Buy ${securityId}`,
        backHref: `/securities/details/${securityId}`,
        backLabel: "Back to Buy Security",
      },
    };

    // Get the config for the current type or use a default
    const normalizedType = investmentType.toLowerCase().replace(/\s+/g, "-");
    const config = typeConfigs[normalizedType as keyof typeof typeConfigs] || {
      title: `Add ${investmentType}`,
      backHref: "/investments",
      backLabel: "Back to Investments",
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

  return (
    <div className="container mx-auto flex-1">
      <AddInvestmentForm />
    </div>
  );
}
