
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, Briefcase, Home, Gem, ScrollText, DollarSign, Search, PiggyBank } from 'lucide-react'; // Added PiggyBank for Income
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
    icon: PiggyBank, // Using PiggyBank for Income
  },
  {
    title: 'Explore',
    href: '/stocks',
    icon: Search,
  },
  {
    title: 'Stocks',
    href: '/investments/stocks',
    icon: Briefcase,
  },
  {
    title: 'Real Estate',
    href: '/investments/real-estate',
    icon: Home,
  },
  {
    title: 'Gold',
    href: '/investments/gold',
    icon: Gem,
  },
  {
    title: 'Debt Instruments',
    href: '/investments/debt-instruments',
    icon: ScrollText,
  },
  {
    title: 'Currencies',
    href: '/investments/currencies',
    icon: DollarSign,
  },
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
          // General case: starts with href
          isActive = pathname.startsWith(item.href);

          // Specific exclusion for 'Explore' (/stocks) not to be active for '/investments/stocks'
          if (item.href === '/stocks' && pathname.startsWith('/investments/stocks')) {
            isActive = false;
          }
          // Specific exclusion for 'Income' (/income) not to be active for other '/income/...' routes if any are added later
          if (item.href === '/income' && pathname !== '/income' && !pathname.startsWith('/income/')) {
             // Only active for /income itself, not its sub-routes, unless specified otherwise by a more specific item.
             // For instance, if we add /income/reports, it should not make /income active.
             // This logic can be tricky. If /income is meant to be a parent for /income/add,
             // then startsWith might be okay, but exactMatch for /income might be better for the parent.
             // Given current setup, startsWith for /income makes /income/add keep /income active, which is usually desired.
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
