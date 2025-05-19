
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, List, Briefcase, Home, Gem, ScrollText, DollarSign } from 'lucide-react'; // Removed PlusCircle
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
  // { // "Add Investment" removed from here
  //   title: 'Add Investment',
  //   href: '/investments/add',
  //   icon: PlusCircle,
  // },
  {
    title: 'Browse Securities', 
    href: '/stocks', 
    icon: List, 
  },
  {
    title: 'My Stocks',
    href: '/investments/stocks',
    icon: Briefcase,
  },
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
         if (item.href === '/stocks' && pathname.startsWith('/stocks/')) {
           isActive = true;
         }
          if (item.href === '/investments/stocks' && pathname.startsWith('/investments/stocks')) {
             isActive = true;
         }
         if (item.href === '/investments/add' && pathname.startsWith('/investments/add')) {
             // This condition will likely not be hit if Add Investment is not in navItems
             // but useful if it were to be re-added contextually
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
