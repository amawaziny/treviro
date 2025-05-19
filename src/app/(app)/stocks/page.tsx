
import { SecurityList } from "@/components/stocks/security-list"; // Updated import
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SecuritiesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Browse Securities</h1>
        <p className="text-muted-foreground">Discover stocks and funds from different markets.</p>
      </div>
      <Separator />
      <Tabs defaultValue="stocks" className="w-full">
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
