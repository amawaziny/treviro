"use client";
import { useLanguage } from "@/contexts/language-context";

import { SecurityListItem } from "./security-list-item";
import { Input } from "@/components/ui/input";
import { useState, useMemo, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import { useListedSecurities } from "@/hooks/use-listed-securities";
import type { ListedSecurity } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
  cacheSecurities,
  getCachedSecurities,
} from "@/lib/offline-securities-storage";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

interface SecurityListProps {
  filterType?: "Stock" | "Fund";
  title?: string;
  currentTab: "stocks" | "funds"; // Added prop
}

export function SecurityList({
  filterType,
  title,
  currentTab,
}: SecurityListProps) {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const { listedSecurities, isLoading, error } = useListedSecurities();
  const isOffline = useOnlineStatus();
  const [cachedSecurities, setCachedSecurities] = useState<ListedSecurity[]>(
    [],
  );
  const [usingCache, setUsingCache] = useState(false);

  useEffect(() => {
    if (!isOffline && listedSecurities.length > 0) {
      cacheSecurities(
        listedSecurities.map((sec) => ({
          id: sec.id,
          name: sec.name,
          name_ar: sec.name_ar,
          symbol: sec.symbol,
          type: sec.securityType === "Fund" ? "fund" : "stock",
          logoUrl: sec.logoUrl,
          price: sec.price,
          currency: sec.currency,
          changePercent: sec.changePercent,
          market: sec.market,
          securityType: sec.securityType,
          fundType: sec.fundType,
        })),
      );
    }
  }, [isOffline, listedSecurities]);

  // Load from cache when offline
  useEffect(() => {
    if (isOffline) {
      getCachedSecurities(
        filterType ? (filterType === "Fund" ? "fund" : "stock") : undefined,
      ).then((secs) => {
        setCachedSecurities(
          secs.map((sec) => ({
            id: sec.id,
            name: sec.name,
            name_ar: sec.name_ar || '',
            symbol: sec.symbol,
            logoUrl: sec.logoUrl || '',
            price: sec.price || 0,
            currency: sec.currency || 'EGP',
            changePercent: sec.changePercent || 0,
            market: sec.market || '',
            securityType: sec.securityType || 'Stock',
            fundType: sec.fundType,
            isin: sec.isin || '',
            sector: sec.sector || '',
            sectorAr: sec.sectorAr || '',
            lastUpdated: new Date().toISOString(),
            listingDate: new Date().toISOString(),
            securityTypeAr: sec.securityTypeAr || '',
            listedShares: sec.listedShares || 0,
            tradedVolume: sec.tradedVolume || 0,
            tradedValue: sec.tradedValue || 0,
            priceEarningRatio: sec.priceEarningRatio || 0,
            dividendYield: sec.dividendYield || 0,
            cashDividends: '0',
            marketCap: sec.marketCap || 0,
            parValue: sec.parValue || 0,
            currencyAr: sec.currencyAr || '',
            couponPaymentDate: new Date().toISOString(),
            couponNo: sec.couponNo || 0
          })),
        );
        setUsingCache(true);
      });
    } else {
      setCachedSecurities([]);
      setUsingCache(false);
    }
  }, [isOffline, filterType]);

  // Use cached or live data
  const securitiesToShow = isOffline ? cachedSecurities : listedSecurities;

  const filteredAndTypedSecurities = useMemo(() => {
    let securitiesToFilter = securitiesToShow;
    if (filterType) {
      securitiesToFilter = securitiesToShow.filter((sec) =>
        filterType === "Stock"
          ? sec.securityType === "Stock" || sec.securityType === undefined
          : sec.securityType === filterType,
      );
    }
    if (!searchTerm) {
      return securitiesToFilter;
    }
    return securitiesToFilter.filter(
      (sec) =>
        sec.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sec.name_ar && sec.name_ar.includes(searchTerm.toLowerCase())) ||
        sec.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sec.market.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sec.fundType &&
          sec.fundType.toLowerCase().includes(searchTerm.toLowerCase())),
    );
  }, [searchTerm, securitiesToShow, filterType]);

  if (isLoading && !isOffline) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">{t("loading_securities")}</p>
      </div>
    );
  }

  if (error && !isOffline) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("error_loading_securities")}</AlertTitle>
        <AlertDescription>
          {t(
            "there_was_a_problem_fetching_the_security_data_please_try_again_later",
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (!isLoading && securitiesToShow.length === 0 && !error) {
    return (
      <div className="space-y-6">
        {title && (
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        )}
        <div className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ltr:left-3 rtl:right-3" />
          <Input
            type="text"
            placeholder={t(
              `Search Securities by name, symbol, market, or type...`,
            )}
            className="w-full ltr:pl-10 rtl:pr-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={isOffline && usingCache}
          />
        </div>
        <p className="text-center text-muted-foreground py-10">
          {isOffline
            ? t("no_cached_securities_available_for_offline_viewing")
            : t(
                "no_securities_found_the_listedSecurities_collection_in_firestore_might_be_empty_or_not_yet_populated",
              )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {title && (
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      )}
      {isOffline && usingCache && (
        <div className="text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 rounded px-2 py-1 mb-2">
          {t(
            "offline_mode_showing_last_cached_securities_some_features_may_be_unavailable",
          )}
        </div>
      )}
      <div className="relative">
        <Search className="absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ltr:left-3 rtl:right-3" />
        <Input
          type="text"
          placeholder={t(
            `Search Securities by name, symbol, market, or type...`,
          )}
          className="w-full ltr:pl-10 rtl:pr-10 text-xs sm:text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={isOffline && usingCache && securitiesToShow.length === 0}
        />
      </div>
      {filteredAndTypedSecurities.length > 0 ? (
        <div className="space-y-3">
          {filteredAndTypedSecurities.map((security) => (
            <div key={security.id} className="mb-3 last:mb-0">
              <SecurityListItem security={security} currentTab={currentTab} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-10">
          {searchTerm
            ? t(`No Securities found matching your search.`)
            : t(`No Securities available to display.`)}
        </p>
      )}
    </div>
  );
}
