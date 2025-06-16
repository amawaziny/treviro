import { useLanguage } from "@/contexts/language-context";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useIsMobile } from "@/hooks/use-mobile";
import { navItems } from "@/lib/navigation";

export function BottomTabBar() {
  const { t: t } = useLanguage();
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!isMobile) return null;

  // Height of the tab bar
  const TAB_BAR_HEIGHT = 56; // px, matches h-14

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center h-14 border-t bg-white dark:bg-[#181c2a] shadow-md max-w-full overflow-x-auto"
        style={{
          borderTop:
            resolvedTheme === "dark"
              ? "1px solid #23255a"
              : "1px solid #e5e7eb",
          height: TAB_BAR_HEIGHT,
        }}
      >
        {navItems.slice(0, 4).map((item, idx) => (
          <Link
            key={item.href + idx}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-1 h-full text-xs font-semibold transition-colors ${
              pathname.startsWith(item.href.split("?")[0])
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            {item.icon ? <item.icon className="h-4 w-4 mb-1" /> : null}
            <span>{t(item.mobileTitle || item.title)}</span>
          </Link>
        ))}
        <button
          className={`flex flex-col items-center justify-center flex-1 h-full text-xs font-semibold transition-colors ${
            resolvedTheme === "dark" ? "text-white" : "text-[#23255a]"
          }`}
          onClick={() => setMenuOpen(true)}
        >
          <span className="text-lg">☰</span>
          Menu
        </button>
      </nav>
      {/* Spacer to prevent content from being hidden behind the tab bar */}
      <div style={{ height: TAB_BAR_HEIGHT }} aria-hidden="true" />
      {/* Modal for the rest of the menu */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-[#181c2a] rounded-t-2xl p-6 pb-10 shadow-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bottom-tab-bar-more-title"
          >
            <h2
              id="bottom-tab-bar-more-title"
              className="text-lg font-bold mb-4 dark:text-white text-[#23255a]"
            >
              {t("more_menu")}
            </h2>
            <ul className="space-y-4">
              {navItems.slice(4).map((item, idx) => (
                <li key={item.href + idx}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 text-base font-medium"
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.icon ? <item.icon className="h-4 w-4" /> : null}
                    <span>{item.mobileTitle || item.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <button
              className="mt-6 w-full py-2 rounded bg-gray-200 dark:bg-[#23255a] text-[#23255a] dark:text-white font-semibold"
              onClick={() => setMenuOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
