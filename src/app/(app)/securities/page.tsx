"use client";

import { SecurityList } from "@/components/explore/security-list";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/language-context";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function SecuritiesPage() {
  const { language } = useLanguage();
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
          Explore Securities
        </h1>
        <p className="text-muted-foreground text-sm">
          Discover stocks and funds from different markets.
        </p>
      </div>
      <Separator />
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
        dir={language === "ar" ? "rtl" : "ltr"}
      >
        <TabsList className="grid w-full grid-cols-2 md:w-[300px] max-w-full">
          <TabsTrigger value="stocks" className="w-full text-xs sm:text-sm">
            Stocks
          </TabsTrigger>
          <TabsTrigger value="funds" className="w-full text-xs sm:text-sm">
            Funds
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
