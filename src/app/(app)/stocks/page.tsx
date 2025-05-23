
"use client"; 

import { SecurityList } from "@/components/stocks/security-list"; 
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/language-context"; 

export default function SecuritiesPage() {
  const { language } = useLanguage(); 

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Browse Securities</h1>
        <p className="text-muted-foreground">Discover stocks and funds from different markets.</p>
      </div>
      <Separator />
      <Tabs defaultValue="stocks" className="w-full" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <TabsList className="grid w-full grid-cols-2 md:w-[300px]">
          <TabsTrigger value="stocks">Stocks</TabsTrigger>
          <TabsTrigger value="funds">Funds</TabsTrigger>
        </TabsList>
        <TabsContent value="stocks">
          <SecurityList filterType="Stock" />
        </TabsContent>
        <TabsContent value="funds">
          <SecurityList filterType="Fund" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
