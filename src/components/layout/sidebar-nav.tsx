"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Briefcase,
  Home,
  Gem,
  DollarSign,
  Search,
  PiggyBank,
  TrendingDown,
  LineChart as CashFlowIcon,
  Settings,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { navItems } from "@/lib/navigation";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";

export function SidebarNav() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  if (!navItems?.length) {
    return null;
  }

  return (
    <SidebarMenu>
      {navItems.map((item, index) => {
        let isActive = false;
        if (item.exactMatch) {
          isActive = pathname === item.href;
        } else {
          isActive = pathname.startsWith(item.href);
          // Prevent "Explore" from being active when on "/investments/securities"
          if (
            item.href === "/securities" &&
            pathname.startsWith("/investments/securities")
          ) {
            isActive = false;
          }
          // Ensure exact match for income and expenses unless on sub-pages like /income/add
          if (
            item.href === "/income" &&
            pathname !== "/income" &&
            !pathname.startsWith("/income/")
          ) {
            isActive = false;
          }
          if (
            item.href === "/expenses" &&
            pathname !== "/expenses" &&
            !pathname.startsWith("/expenses/")
          ) {
            isActive = false;
          }
          if (
            item.href === "/fixed-estimates" &&
            pathname !== "/fixed-estimates" &&
            !pathname.startsWith("/fixed-estimates/")
          ) {
            isActive = false;
          }
        }

        return (
          <SidebarMenuItem key={index}>
            <Link href={item.href} passHref legacyBehavior>
              <SidebarMenuButton
                isActive={isActive}
                disabled={item.disabled}
                onClick={() => setOpenMobile(false)}
                tooltip={{ children: item.title, side: "right" }}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
