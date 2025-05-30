import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useIsMobile } from "@/hooks/use-mobile";
import { LayoutDashboard, Briefcase, Gem, ScrollText } from 'lucide-react';

const TABS = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: "Stocks", href: "/investments/stocks", icon: <Briefcase className="h-5 w-5" /> },
  { label: "Debts", href: "/investments/debt-instruments", icon: <ScrollText className="h-5 w-5" /> },
  { label: "Golds", href: "/investments/gold", icon: <Gem className="h-5 w-5" /> },
];

export function BottomTabBar() {
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
          borderTop: resolvedTheme === "dark" ? "1px solid #23255a" : "1px solid #e5e7eb",
          height: TAB_BAR_HEIGHT,
        }}
      >
        {TABS.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            className={`flex flex-col items-center justify-center flex-1 h-full text-xs font-semibold transition-colors ${
              pathname.startsWith(tab.href.split("?")[0])
                ? resolvedTheme === "dark"
                  ? "text-green-400"
                  : "text-[#b6d037]"
                : resolvedTheme === "dark"
                ? "text-white"
                : "text-[#23255a]"
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            {tab.label}
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setMenuOpen(false)}>
          <div
            className="w-full max-w-sm bg-white dark:bg-[#181c2a] rounded-t-2xl p-6 pb-10 shadow-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bottom-tab-bar-more-title"
          >
            <h2 id="bottom-tab-bar-more-title" className="text-lg font-bold mb-4 dark:text-white text-[#23255a]">More Menu</h2>
            {/* Add your extra menu items here */}
            <ul className="space-y-4">
              <li><Link href="/expenses" className="block">Expenses</Link></li>
              <li><Link href="/income" className="block">Income</Link></li>
              <li><Link href="/settings" className="block">Settings</Link></li>
              {/* Add more as needed */}
            </ul>
            <button className="mt-6 w-full py-2 rounded bg-gray-200 dark:bg-[#23255a] text-[#23255a] dark:text-white font-semibold" onClick={() => setMenuOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}
