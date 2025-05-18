"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, PlusCircle, Landmark, Coins, LineChart, FileText, CircleDollarSign } from 'lucide-react';
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
  // Example for future expansion if specific views per asset type are needed
  // {
  //   title: 'Real Estate',
  //   href: '/investments/real-estate',
  //   icon: Landmark,
  // },
  // {
  //   title: 'Gold',
  //   href: '/investments/gold',
  //   icon: Coins,
  // },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();


  if (!navItems?.length) {
    return null;
  }

  return (
    <SidebarMenu>
      {navItems.map((item, index) => (
          <SidebarMenuItem key={index}>
             <Link href={item.href} passHref legacyBehavior>
                <SidebarMenuButton
                    isActive={pathname === item.href}
                    disabled={item.disabled}
                    onClick={() => setOpenMobile(false)}
                    tooltip={{ children: item.title, side: 'right' }}
                >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                </SidebarMenuButton>
             </Link>
          </SidebarMenuItem>
        ))}
    </SidebarMenu>
  );
}
