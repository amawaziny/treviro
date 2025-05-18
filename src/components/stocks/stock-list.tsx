
"use client";

import { StockListItem } from './stock-list-item';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useListedStocks } from '@/hooks/use-listed-stocks'; // New hook
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';

export function StockList() {
  const [searchTerm, setSearchTerm] = useState('');
  const { listedStocks, isLoading, error } = useListedStocks(); // Use the hook

  const filteredStocks = useMemo(() => {
    if (!searchTerm) {
      return listedStocks;
    }
    return listedStocks.filter(stock =>
      stock.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.market.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, listedStocks]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading stocks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Stocks</AlertTitle>
        <AlertDescription>
          There was a problem fetching the stock data. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }
  
  if (!isLoading && listedStocks.length === 0 && !error) {
     return (
      <div className="space-y-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search stocks by name, symbol, or market..."
            className="pl-10 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled // Disable search if no stocks
          />
        </div>
        <p className="text-center text-muted-foreground py-10">
          No stocks found. The 'listedStocks' collection in Firestore might be empty or not yet populated.
        </p>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search stocks by name, symbol, or market (e.g., EGX, SAR)..."
          className="pl-10 w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {filteredStocks.length > 0 ? (
        <div className="space-y-3">
          {filteredStocks.map(stock => (
            <StockListItem key={stock.id} stock={stock} />
          ))}
        </div>
      ) : (
         <p className="text-center text-muted-foreground py-10">
            {searchTerm ? "No stocks found matching your search." : "No stocks available to display."}
         </p>
      )}
    </div>
  );
}
