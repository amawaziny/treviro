"use client";

import { SecurityList } from "@/components/explore/security-list";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/language-context";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function SecuritiesPage() {
  const { t , dir} = useLanguage();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab");

  // Initialize activeTab from URL or default to 'stocks'
  const [activeTab, setActiveTab] = useState(urlTab || "stocks");

  // Effect to update activeTab if URL changes (e.g., browser back/forward)
  useEffect(() => {
    const newUrlTab = searchParams.get("tab");
    const targetTab = newUrlTab || "stocks"; // Default to 'stocks' if no tab in URL
    if (targetTab !== activeTab) {
      // Only update if there's an actual change needed from URL
      setActiveTab(targetTab);
    }
  }, [searchParams]); // Only run when searchParams change (e.g. browser back/forward)

  // Handler to update state when user clicks a tab
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          {t("explore_securities")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("discover_stocks_and_funds_from_different_markets")}
        </p>
      </div>
      <Separator />
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
        dir={dir}
      >
        <TabsList className="grid w-full grid-cols-2 md:w-[300px] max-w-full">
          <TabsTrigger value="stocks" className="w-full text-xs sm:text-sm">
            {t("stocks")}
          </TabsTrigger>
          <TabsTrigger value="funds" className="w-full text-xs sm:text-sm">
            {t("funds")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="stocks">
          <SecurityList filterType="Stock" currentTab="stocks" />
        </TabsContent>
        <TabsContent value="funds">
          <SecurityList filterType="Fund" currentTab="funds" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
