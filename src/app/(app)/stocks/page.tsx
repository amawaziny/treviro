
"use client"; 

import { SecurityList } from "@/components/stocks/security-list"; 
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/language-context"; 
import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function SecuritiesPage() {
  const { language } = useLanguage(); 
  const searchParams = useSearchParams();
  const urlTab = searchParams.get('tab');

  // Initialize activeTab from URL or default to 'stocks'
  const [activeTab, setActiveTab] = useState(urlTab || 'stocks');

  // Effect to update activeTab if URL changes (e.g., browser back/forward)
  useEffect(() => {
    const newUrlTab = searchParams.get('tab');
    const targetTab = newUrlTab || 'stocks'; // Default to 'stocks' if no tab in URL
    if (targetTab !== activeTab) { // Only update if there's an actual change needed from URL
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
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Explore Securities</h1>
        <p className="text-muted-foreground">Discover stocks and funds from different markets.</p>
      </div>
      <Separator />
      <Tabs 
        value={activeTab} // Make it a controlled component
        onValueChange={handleTabChange} // Update state on user interaction
        className="w-full" 
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        <TabsList className="grid w-full grid-cols-2 md:w-[300px]">
          <TabsTrigger value="stocks">Stocks</TabsTrigger>
          <TabsTrigger value="funds">Funds</TabsTrigger>
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
