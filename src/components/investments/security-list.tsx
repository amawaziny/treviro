"use client";

import { SecurityListItem } from '../stocks/security-list-item'; 
import { Input } from '@/components/ui/input';
import { useState, useMemo, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useListedSecurities } from '@/hooks/use-listed-securities'; 
import type { ListedSecurity } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';
import { cacheSecurities, getCachedSecurities } from '@/lib/offline-securities-storage';

interface SecurityListProps {
  filterType?: 'Stock' | 'Fund';
  title?: string; 
  currentTab: 'stocks' | 'funds'; // Added prop
}

export function SecurityList({ filterType, title, currentTab }: SecurityListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { listedSecurities, isLoading, error } = useListedSecurities(); 
  const [offlineMode, setOfflineMode] = useState(!navigator.onLine);
  const [cachedSecurities, setCachedSecurities] = useState<ListedSecurity[]>([]);
  const [usingCache, setUsingCache] = useState(false);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setOfflineMode(false);
    const handleOffline = () => setOfflineMode(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cache securities when online and loaded
  useEffect(() => {
    if (!offlineMode && listedSecurities.length > 0) {
      // Map ListedSecurity to OfflineSecurity (type: 'stock' | 'fund')
      cacheSecurities(listedSecurities.map(sec => ({
        id: sec.id,
        name: sec.name,
        symbol: sec.symbol,
        type: (sec.securityType === 'Fund' ? 'fund' : 'stock'),
        logoUrl: sec.logoUrl,
        price: sec.price,
        currency: sec.currency,
        changePercent: sec.changePercent,
        market: sec.market,
        securityType: sec.securityType,
        fundType: sec.fundType,
      })));
    }
  }, [offlineMode, listedSecurities]);

  // Load from cache when offline
  useEffect(() => {
    if (offlineMode) {
      getCachedSecurities(
        filterType ? (filterType === 'Fund' ? 'fund' : 'stock') : undefined
      ).then(secs => {
        // Convert OfflineSecurity[] to ListedSecurity[]
        setCachedSecurities(secs.map(sec => ({
          id: sec.id,
          name: sec.name,
          symbol: sec.symbol,
          logoUrl: sec.logoUrl,
          price: sec.price,
          currency: sec.currency,
          changePercent: sec.changePercent,
          market: sec.market,
          securityType: sec.securityType,
          fundType: sec.fundType,
        })));
        setUsingCache(true);
      });
    } else {
      setCachedSecurities([]);
      setUsingCache(false);
    }
  }, [offlineMode, filterType]);

  // Use cached or live data
  const securitiesToShow = offlineMode ? cachedSecurities : listedSecurities;

  const filteredAndTypedSecurities = useMemo(() => {
    let securitiesToFilter = securitiesToShow;
    if (filterType) {
      securitiesToFilter = securitiesToShow.filter(sec =>
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
  }, [searchTerm, securitiesToShow, filterType]);

  if (isLoading && !offlineMode) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading securities...</p>
      </div>
    );
  }

  if (error && !offlineMode) {
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
  
  if (!isLoading && securitiesToShow.length === 0 && !error) {
     return (
      <div className="space-y-6">
         {title && <h2 className="text-xl font-semibold tracking-tight">{title}</h2>}
        <div className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground ltr:left-3 rtl:right-3" />
          <Input
            type="text"
            placeholder={`Search Securities by name, symbol, market, or type...`}
            className="w-full ltr:pl-10 rtl:pr-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={offlineMode && usingCache}
          />
        </div>
        <p className="text-center text-muted-foreground py-10">
          {offlineMode ? 'No cached securities available for offline viewing.' : "No securities found. The 'listedStocks' collection in Firestore might be empty or not yet populated."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {title && <h2 className="text-xl font-semibold tracking-tight">{title}</h2>}
      {offlineMode && usingCache && (
        <div className="text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 rounded px-2 py-1 mb-2">
          Offline mode: showing last cached securities. Some features may be unavailable.
        </div>
      )}
      <div className="relative">
        <Search className="absolute top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground ltr:left-3 rtl:right-3" />
        <Input
          type="text"
          placeholder={`Search Securities by name, symbol, market, or type...`}
          className="w-full ltr:pl-10 rtl:pr-10 text-xs sm:text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={offlineMode && usingCache && securitiesToShow.length === 0}
        />
      </div>
      {filteredAndTypedSecurities.length > 0 ? (
        <div className="space-y-3">
          {filteredAndTypedSecurities.map(security => (
            <div key={security.id} className="mb-3 last:mb-0">
              <SecurityListItem security={security} currentTab={currentTab} />
            </div>
          ))}
        </div>
      ) : (
         <p className="text-center text-muted-foreground py-10">
            {searchTerm ? `No Securities found matching your search.` : `No Securities available to display.`}
         </p>
      )}
    </div>
  );
}
