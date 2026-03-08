"use client";

import { SecurityList } from "@/components/explore/security-list";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/language-context";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useAdmin } from "@/hooks/use-admin";

export default function SecuritiesPage() {
  const { t, dir, language } = useLanguage();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab");
  const { isAdmin, isLoading } = useAdmin();

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
    <div className="space-y-8 relative min-h-[calc(100vh-10rem)]">
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
          <TabsTrigger
            value="stocks"
            className="w-full text-xs sm:text-sm"
            data-testid="stocks-tab"
          >
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

      <div style={{ marginBottom: "96px" }}></div>
      {isAdmin && !isLoading && (
        <Link href="/securities/add" passHref>
          <Button
            data-testid="add-security-button"
            variant="default"
            size="icon"
            className={`fixed z-50 h-14 w-14 rounded-full shadow-lg ${language === "ar" ? "left-8" : "right-8"} bottom-[88px] md:bottom-8`}
            aria-label="Add new security"
          >
            <Plus className="h-7 w-7" />
          </Button>
        </Link>
      )}
    </div>
  );
}
