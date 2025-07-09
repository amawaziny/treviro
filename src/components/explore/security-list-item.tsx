"use client";

import Image from "next/image";
import type { ListedSecurity } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn, formatCurrencyWithCommas } from "@/lib/utils";
import React from "react";
import Link from "next/link";
import { FundTypeIcon } from "@/components/ui/fund-type-icon";
import { useLanguage } from "@/contexts/language-context";
import { useIsMobile } from "@/hooks/use-mobile";

interface SecurityListItemProps {
  security: ListedSecurity;
  currentTab: "stocks" | "funds"; // Added prop
}

export const SecurityListItem = React.memo(function SecurityListItem({
  security,
  currentTab,
}: SecurityListItemProps) {
  const formattedPrice = formatCurrencyWithCommas(
    security.price,
    security.currency,
    3,
  );

  const isPositiveChange = security.changePercent >= 0;

  const { language } = useLanguage();
  const isMobile = useIsMobile();
  const securityName = security[language === "ar" ? "name_ar" : "name"];

  const detailPageLink = `/securities/details/${security.id}?previousTab=${currentTab}`;

  return (
    <Link href={detailPageLink} passHref>
      <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer rounded-lg shadow-sm">
        <div className="flex items-start gap-4">
          {/* Logo */}
          <Image
            src={security.logoUrl || "https://placehold.co/40x40.png"}
            alt={`${securityName} logo`}
            width={32}
            height={32}
            className="rounded-full object-cover flex-shrink-0 mt-1"
            data-ai-hint={
              security.securityType === "Fund" ? "fund logo" : "company logo"
            }
          />

          {/* Left Column: Symbol and Name */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground flex items-baseline gap-2">
              {security.symbol}
              {security.securityType === "Fund" && (
                <>
                  <span>•</span>
                  <FundTypeIcon fundType={security.fundType} size={12} />
                </>
              )}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {isMobile && securityName.length > 15
                ? `${securityName.substring(0, 15)}...`
                : securityName}
              <span className="mx-1">•</span>
              {security.market.toUpperCase()}
            </p>
          </div>

          {/* Right Column: Price and Change */}
          <div className="flex flex-col items-end">
            <p className="text-sm sm:text-base font-semibold text-foreground whitespace-nowrap">
              {formattedPrice}
            </p>
            <Badge
              variant={isPositiveChange ? "default" : "destructive"}
              className={cn(
                isPositiveChange
                  ? "bg-accent text-accent-foreground"
                  : "bg-destructive text-destructive-foreground",
                "text-xs px-2 py-0.5 mt-1 whitespace-nowrap",
              )}
            >
              {security.changePercent.toFixed(3)}%
            </Badge>
          </div>
        </div>
      </Card>
    </Link>
  );
});
SecurityListItem.displayName = "SecurityListItem";
