"use client";
import { useLanguage } from "@/contexts/language-context";

import { SecurityListItem } from "./security-list-item";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { Search, Loader2 } from "lucide-react";
import { useListedSecurities } from "@/hooks/use-listed-securities";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

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

  const filteredAndTypedSecurities = useMemo(() => {
    let securitiesToFilter = listedSecurities;
    if (filterType) {
      securitiesToFilter = listedSecurities.filter((sec) =>
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
  }, [searchTerm, listedSecurities, filterType]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">{t("loading_securities")}</p>
      </div>
    );
  }

  if (error) {
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

  if (!isLoading && listedSecurities.length === 0 && !error) {
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
          />
        </div>
        <p className="text-center text-muted-foreground py-10">
          {t(
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
