
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, Briefcase, Home, Gem, ScrollText, DollarSign, Search } from 'lucide-react'; // Changed List to Search for "Explore"
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
          isActive = pathname.startsWith(item.href);
          // Special handling for dashboard to not stay active for child routes
          if (item.href === '/dashboard' && pathname !== '/dashboard') {
            isActive = false;
          }
          // Ensure /stocks (explore) isn't active for /investments/stocks
          if (item.href === '/stocks' && pathname.startsWith('/investments/stocks')) {
            isActive = false;
          }
        }
         // Specific active state for /stocks to cover its child /stocks/[stockId]
         if (item.href === '/stocks' && pathname.startsWith('/stocks/')) {
           isActive = true;
         }
         // Specific active state for /investments/stocks to cover its child /investments/stocks
         if (item.href === '/investments/stocks' && pathname.startsWith('/investments/stocks')) {
             isActive = true;
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

