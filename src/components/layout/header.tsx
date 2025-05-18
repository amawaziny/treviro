import Link from 'next/link';
import { Coins } from 'lucide-react'; // Using Coins as a generic logo
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { UserNav } from '@/components/auth/user-nav';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="md:hidden" />
          <Link href="/dashboard" className="flex items-center space-x-2">
            <Coins className="h-7 w-7 text-primary" />
            <span className="text-2xl font-bold text-primary">Treviro</span>
          </Link>
        </div>
        
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-1">
            <ThemeToggle />
            <UserNav />
          </nav>
        </div>
      </div>
    </header>
  );
}
