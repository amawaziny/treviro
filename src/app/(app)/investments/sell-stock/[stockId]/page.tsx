
"use client";

import { SellStockForm } from '@/components/investments/sell-stock-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useParams, useRouter } from 'next/navigation';
import { useListedStocks } from '@/hooks/use-listed-stocks';
import React, { useEffect, useState } from 'react';
import type { ListedStock } from '@/lib/types';

export default function SellStockPage({ params }: { params: { stockId: string } }) {
  const stockId = params.stockId;
  const router = useRouter();
  const { getListedStockById, isLoading: isLoadingListedStocks } = useListedStocks();
  const [stockBeingSold, setStockBeingSold] = useState<ListedStock | null>(null);
  const [loadingTitle, setLoadingTitle] = useState(true);

  useEffect(() => {
    if (stockId) {
      setLoadingTitle(true);
      getListedStockById(stockId).then(data => {
        setStockBeingSold(data || null);
        setLoadingTitle(false);
      });
    } else {
      setLoadingTitle(false);
    }
  }, [stockId, getListedStockById]);

  const pageTitle = stockBeingSold ? `Sell: ${stockBeingSold.name}` : "Sell Stock";


  return (
    <div className="container mx-auto py-8 space-y-6">
       <Button variant="outline" size="sm" asChild className="mb-4">
        <Link href={`/stocks/${stockId}`}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Stock Details
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>
            {loadingTitle ? <Loader2 className="h-6 w-6 animate-spin inline-block mr-2" /> : pageTitle}
          </CardTitle>
          <CardDescription>Record the sale of your stock holdings.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingListedStocks && !stockBeingSold ? (
             <div className="flex items-center justify-center py-10">
                <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading stock details...
             </div>
          ) : (
            <SellStockForm stockId={stockId} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
