
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, PlusCircle, List, Briefcase, Home, Gem, ScrollText, DollarSign, Building } from 'lucide-react'; // Added Building for Funds
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
    title: 'Add Investment',
    href: '/investments/add',
    icon: PlusCircle,
  },
  {
    title: 'Browse Securities', // Renamed
    href: '/stocks', // Kept href for now, page at /stocks will be updated
    icon: List, 
  },
  {
    title: 'My Stocks',
    href: '/investments/stocks',
    icon: Briefcase,
  },
  // { // Placeholder for "My Funds" - can be added in a subsequent step
  //   title: 'My Funds',
  //   href: '/investments/funds', // This route would need to be created
  //   icon: Building,
  // },
  {
    title: 'My Real Estate',
    href: '/investments/real-estate',
    icon: Home,
  },
  {
    title: 'My Gold',
    href: '/investments/gold',
    icon: Gem,
  },
  {
    title: 'My Debt', 
    href: '/investments/debt-instruments',
    icon: ScrollText,
  },
  {
    title: 'My Currencies',
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
          if (item.href === '/dashboard' && pathname !== '/dashboard') {
            isActive = false;
          }
        }
         // For "Browse Securities" (href: /stocks), keep it active if viewing a detail page /stocks/[id]
         if (item.href === '/stocks' && pathname.startsWith('/stocks/')) {
           isActive = true;
         }
          if (item.href === '/investments/stocks' && pathname.startsWith('/investments/stocks')) {
             isActive = true;
         }
         // Example for My Funds if added:
         // if (item.href === '/investments/funds' && pathname.startsWith('/investments/funds')) {
         //   isActive = true;
         // }


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

