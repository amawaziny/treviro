"use client";

import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useLanguage } from "@/contexts/language-context";
import { cn } from "@/lib/utils";

export interface SpeedDialAction {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  testId?: string;
}

export interface SpeedDialFloatingButtonProps {
  actions: SpeedDialAction[];
  mainIcon?: React.ReactNode;
  disabled?: boolean;
  testId?: string;
  ariaLabel?: string;
}

export function SpeedDialFloatingButton({
  actions,
  mainIcon,
  disabled = false,
  testId = "speed-dial-button",
  ariaLabel,
}: SpeedDialFloatingButtonProps) {
  const { t, language } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const isRTL = language === "ar";
  const positionClass = isRTL ? "left-8" : "right-8";

  const toggleMenu = () => {
    if (!disabled) {
      setIsExpanded(!isExpanded);
    }
  };

  const closeMenu = () => {
    setIsExpanded(false);
  };

  // Default Plus icon
  const DefaultMainIcon = () => {
    return <Plus className="h-7 w-7 transition-transform duration-300" />;
  };

  return (
    <div className={cn("fixed z-50", positionClass, "bottom-8")}>
      {/* Overlay to close menu when clicking outside */}
      {/* {isExpanded && (
        <div
          className="fixed inset-0 z-40"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )} */}

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
          {actions.map((action, index) => (
            <div
              key={`${action.label}-${index}`}
              className={cn(
                "transition-all duration-300",
                isExpanded
                  ? "translate-y-0 opacity-100"
                  : index === 0
                    ? "translate-y-2 opacity-0 pointer-events-none"
                    : "-translate-y-2 opacity-0 pointer-events-none",
              )}
              style={{
                transitionDelay: isExpanded ? `${index * 50}ms` : "0ms",
              }}
            >
              {action.href ? (
                <Link href={action.href} passHref>
                  <Button
                    variant="default"
                    size="icon"
                    className="h-12 w-12 rounded-full shadow-lg"
                    onClick={closeMenu}
                    disabled={action.disabled || disabled}
                    title={action.title || action.label}
                    aria-label={action.label}
                    data-testid={action.testId}
                  >
                    {action.icon}
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="default"
                  size="icon"
                  className="h-12 w-12 rounded-full shadow-lg"
                  onClick={() => {
                    action.onClick?.();
                    closeMenu();
                  }}
                  disabled={action.disabled || disabled}
                  title={action.title || action.label}
                  aria-label={action.label}
                  data-testid={action.testId}
                >
                  {action.icon}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main FAB Button */}
      <Button
        onClick={toggleMenu}
        variant="default"
        size="icon"
        className="h-14 w-14 rounded-full shadow-lg relative z-50 transition-all duration-300"
        aria-label={ariaLabel || (isExpanded ? t("close_menu") : t("open_menu"))}
        aria-expanded={isExpanded}
        disabled={disabled}
        data-testid={testId}
      >
        {isExpanded ? (
          <X className="h-7 w-7 transition-transform duration-300 rotate-0" />
        ) : mainIcon ? (
          mainIcon
        ) : (
          <DefaultMainIcon />
        )}
      </Button>
    </div>
  );
}
