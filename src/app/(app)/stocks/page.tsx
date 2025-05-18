import { StockList } from "@/components/stocks/stock-list";
import { Separator } from "@/components/ui/separator";

export default function StocksPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Browse Stocks</h1>
        <p className="text-muted-foreground">Discover stocks from different markets.</p>
      </div>
      <Separator />
      <StockList />
    </div>
  );
}
