
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, Briefcase, Home, Gem, ScrollText, DollarSign, Search, PiggyBank, TrendingDown, LineChart as CashFlowIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";


export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
  exactMatch?: boolean;
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    exactMatch: true,
  },
  {
    title: 'Income',
    href: '/income',
    icon: PiggyBank,
  },
  {
    title: 'Expenses',
    href: '/expenses',
    icon: TrendingDown,
  },
  {
    title: 'Cash Flow',
    href: '/cash-flow',
    icon: CashFlowIcon,
  },
  {
    title: 'Explore', // Was "Browse Securities"
    href: '/stocks',
    icon: Search,
  },
  {
    title: 'Stocks', // Was "My Stocks"
    href: '/investments/stocks',
    icon: Briefcase,
  },
  {
    title: 'Real Estate', // Was "My Real Estate"
    href: '/investments/real-estate',
    icon: Home,
  },
  {
    title: 'Gold', // Was "My Gold"
    href: '/investments/gold',
    icon: Gem,
  },
  {
    title: 'Debt Instruments', // Was "My Debt"
    href: '/investments/debt-instruments',
    icon: ScrollText,
  },
  {
    title: 'Currencies', // Was "My Currencies"
    href: '/investments/currencies',
    icon: DollarSign,
  },
  // "Add Investment" and "Settings" links were removed previously
];

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
          // Prevent "Explore" from being active when on "/investments/stocks"
          if (item.href === '/stocks' && pathname.startsWith('/investments/stocks')) {
            isActive = false;
          }
          // Ensure exact match for income and expenses unless on sub-pages like /income/add
          if (item.href === '/income' && pathname !== '/income' && !pathname.startsWith('/income/')) {
            isActive = false;
          }
           if (item.href === '/expenses' && pathname !== '/expenses' && !pathname.startsWith('/expenses/')) {
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
                    tooltip={{ children: item.title, side: 'right' }}
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
