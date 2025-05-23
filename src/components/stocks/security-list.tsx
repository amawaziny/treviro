
"use client";

import { SecurityListItem } from './security-list-item'; 
import { Input } from '@/components/ui/input';
import { useState, useMemo, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useListedSecurities } from '@/hooks/use-listed-securities'; 
import type { ListedSecurity } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';

interface SecurityListProps {
  filterType?: 'Stock' | 'Fund';
  title?: string; 
  currentTab: 'stocks' | 'funds'; // Added prop
}

export function SecurityList({ filterType, title, currentTab }: SecurityListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { listedSecurities, isLoading, error } = useListedSecurities(); 

  const filteredAndTypedSecurities = useMemo(() => {
    let securitiesToFilter = listedSecurities;

    if (filterType) {
      securitiesToFilter = listedSecurities.filter(sec => 
        filterType === 'Stock' ? (sec.securityType === 'Stock' || sec.securityType === undefined) : sec.securityType === filterType
      );
    }

    if (!searchTerm) {
      return securitiesToFilter;
    }
    return securitiesToFilter.filter(sec =>
      sec.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sec.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sec.market.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sec.fundType && sec.fundType.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchTerm, listedSecurities, filterType]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading securities...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Securities</AlertTitle>
        <AlertDescription>
          There was a problem fetching the security data. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }
  
  if (!isLoading && listedSecurities.length === 0 && !error) {
     return (
      <div className="space-y-6">
         {title && <h2 className="text-xl font-semibold tracking-tight">{title}</h2>}
        <div className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground ltr:left-3 rtl:right-3" />
          <Input
            type="text"
            placeholder={`Search ${filterType ? filterType.toLowerCase() : 'securit'}ies by name, symbol, market, or type...`}
            className="w-full ltr:pl-10 rtl:pr-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled 
          />
        </div>
        <p className="text-center text-muted-foreground py-10">
          No securities found. The 'listedStocks' collection in Firestore might be empty or not yet populated.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {title && <h2 className="text-xl font-semibold tracking-tight">{title}</h2>}
      <div className="relative">
        <Search className="absolute top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground ltr:left-3 rtl:right-3" />
        <Input
          type="text"
          placeholder={`Search ${filterType ? filterType.toLowerCase() : 'securit'}ies by name, symbol, market, or type...`}
          className="w-full ltr:pl-10 rtl:pr-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {filteredAndTypedSecurities.length > 0 ? (
        <div className="space-y-3">
          {filteredAndTypedSecurities.map(security => (
            <SecurityListItem key={security.id} security={security} currentTab={currentTab} />
          ))}
        </div>
      ) : (
         <p className="text-center text-muted-foreground py-10">
            {searchTerm ? `No ${filterType ? filterType.toLowerCase() : ''} securities found matching your search.` : `No ${filterType ? filterType.toLowerCase() : ''} securities available to display.`}
         </p>
      )}
    </div>
  );
}
