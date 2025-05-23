
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

  const [activeTab, setActiveTab] = useState(urlTab || 'stocks');

  useEffect(() => {
    // Update activeTab if URL changes (e.g., browser back/forward)
    const newUrlTab = searchParams.get('tab');
    if (newUrlTab && newUrlTab !== activeTab) {
      setActiveTab(newUrlTab);
    }
  }, [searchParams, activeTab]);


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Explore Securities</h1>
        <p className="text-muted-foreground">Discover stocks and funds from different markets.</p>
      </div>
      <Separator />
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} 
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
