"use client";

import React, { useState } from "react";
import { Plus, Settings, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useLanguage } from "@/contexts/language-context";
import { cn } from "@/lib/utils";

interface SecurityFabMenuProps {
  hasFunds: boolean;
}

export function SecurityFabMenu({ hasFunds }: SecurityFabMenuProps) {
  const { t, language } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const isRTL = language === "ar";
  const positionClass = isRTL ? "left-8" : "right-8";

  const toggleMenu = () => {
    setIsExpanded(!isExpanded);
  };

  const closeMenu = () => {
    setIsExpanded(false);
  };

  return (
    <div className={cn("fixed z-50", positionClass, "bottom-8")}>
      {/* Overlay to close menu when clicking outside */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-40"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      {/* Sub-buttons container */}
      <div
        className={cn(
          "absolute bottom-20 transition-all duration-300 ease-out",
          isRTL ? "right-0" : "left-0",
          isExpanded
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-75 pointer-events-none",
        )}
      >
        <div className="flex flex-col gap-3">
          {/* Add Price History Button */}
          <div
            className={cn(
              "transition-all duration-300",
              isExpanded
                ? "translate-y-0 opacity-100"
                : "translate-y-2 opacity-0 pointer-events-none",
            )}
          >
            <Link href="/securities/add-price-history" passHref>
              <Button
                variant="default"
                size="icon"
                className="h-12 w-12 rounded-full shadow-lg"
                onClick={closeMenu}
                disabled={!hasFunds}
                title={
                  hasFunds ? t("add_price_history") : t("no_funds_available")
                }
                aria-label={t("add_price_history")}
              >
                <TrendingUp className="h-5 w-5" />
              </Button>
            </Link>
          </div>

          {/* Add New Security Button */}
          <div
            className={cn(
              "transition-all duration-300",
              isExpanded
                ? "translate-y-0 opacity-100"
                : "-translate-y-2 opacity-0 pointer-events-none",
            )}
          >
            <Link href="/securities/add" passHref>
              <Button
                variant="default"
                size="icon"
                className="h-12 w-12 rounded-full shadow-lg"
                onClick={closeMenu}
                title={t("add_new_security")}
                aria-label={t("add_new_security")}
              >
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main FAB Button */}
      <Button
        onClick={toggleMenu}
        variant="default"
        size="icon"
        className="h-14 w-14 rounded-full shadow-lg relative z-50 transition-all duration-300"
        aria-label={isExpanded ? t("close_menu") : t("open_menu")}
        aria-expanded={isExpanded}
      >
        {isExpanded ? (
          <X className="h-7 w-7 transition-transform duration-300 rotate-0" />
        ) : (
          <Plus className="h-7 w-7 transition-transform duration-300" />
        )}
      </Button>
    </div>
  );
}
