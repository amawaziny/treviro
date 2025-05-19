
import { MyStockList } from "@/components/stocks/my-stock-list";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function MyStocksPage() {
  return (
    <div className="space-y-8 relative min-h-[calc(100vh-10rem)]"> {/* Ensure relative positioning and min height */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">My Stocks</h1>
        <p className="text-muted-foreground">Overview of your stock investments.</p>
      </div>
      <Separator />
      <MyStockList />

      <Link href="/stocks" passHref>
        <Button
          variant="default"
          size="icon"
          className="fixed bottom-8 right-8 h-14 w-14 rounded-full shadow-lg z-50"
          aria-label="Add new stock investment"
        >
          <Plus className="h-7 w-7" />
        </Button>
      </Link>
    </div>
  );
}
