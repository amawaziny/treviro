import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { AuthProvider } from '@/contexts/auth-context';
import { Toaster } from '@/components/ui/toaster';
import { InvestmentProvider } from '@/contexts/investment-context';
import { SidebarProvider } from "@/components/ui/sidebar";

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Treviro',
  description: 'Modern Investment Portfolio Tracker',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <InvestmentProvider>
              <SidebarProvider defaultOpen={true}>
                {children}
              </SidebarProvider>
              <Toaster />
            </InvestmentProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
