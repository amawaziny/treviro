
import { SellStockForm } from '@/components/investments/sell-stock-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function SellStockPage({ params }: { params: { stockId: string } }) {
  const stockId = params.stockId;

  return (
    <div className="container mx-auto py-8 space-y-6">
       <Button variant="outline" size="sm" asChild className="mb-4">
        <Link href={`/stocks/${stockId}`}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Stock Details
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Sell Stock</CardTitle>
          <CardDescription>Record the sale of your stock holdings.</CardDescription>
        </CardHeader>
        <CardContent>
          <SellStockForm stockId={stockId} />
        </CardContent>
      </Card>
    </div>
  );
}
