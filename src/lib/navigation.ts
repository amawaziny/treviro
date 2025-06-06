import { LayoutDashboard, Briefcase, Home, Gem, ScrollText, DollarSign, Search, PiggyBank, TrendingDown, LineChart as CashFlowIcon, Settings } from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: any;
  disabled?: boolean;
  exactMatch?: boolean;
  mobileTitle?: string;
}

export const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, exactMatch: true },
  { title: 'Debt Instruments', mobileTitle: 'Debts', href: '/investments/debt-instruments', icon: ScrollText },
  { title: 'Stocks', href: '/investments/stocks', icon: Search },
  { title: 'Gold', href: '/investments/gold', icon: Gem },
  { title: 'Real Estate', href: '/investments/real-estate', icon: Home },
  { title: 'Explore', href: '/securities', icon: Search },

  { title: 'Currencies', href: '/investments/currencies', icon: DollarSign },

  { title: 'Cash Flow', href: '/cashflow', icon: CashFlowIcon },
  { title: 'Expenses', href: '/expenses', icon: TrendingDown },
  { title: 'Income', href: '/income', icon: DollarSign },
  { title: 'Settings', href: '/settings', icon: Settings },
];
