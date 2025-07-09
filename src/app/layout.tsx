import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { Toaster } from "@/components/ui/toaster";
import { InvestmentProvider } from "@/contexts/investment-context";
import { SidebarProvider } from "@/components/ui/sidebar";
import { FirebaseIntegrations } from "@/components/layout/firebase-integrations";
import { LanguageProvider } from "@/contexts/language-context";
import { LanguageInitializer } from "@/components/layout/language-initializer";
import PageViewTrackerWrapper from "@/components/analytics/PageViewTrackerWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// Tajawal font is loaded via CSS @import

export const metadata: Metadata = {
  title: "Treviro",
  description: "Modern Investment Portfolio Tracker",
  manifest: "/manifest.json", // Link to the manifest file
};

export default function RootLayout({
  children,
  params: { lang = "en" },
}: Readonly<{
  children: React.ReactNode;
  params: { lang?: string };
}>) {
  const isRTL = lang === "ar";

  return (
    <html
      lang={lang}
      dir={isRTL ? "rtl" : "ltr"}
      className="font-sans"
      suppressHydrationWarning
    >
      <head>
        {/* PWA Meta Tags */}
        <meta name="application-name" content="Treviro" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Treviro" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/icons/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#3498DB" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#3498DB" />

        {/* 
          Placeholder links for Apple touch icons. 
          You will need to create these icon files and place them in your /public/icons/ directory.
          Example sizes: 180x180, 152x152, 120x120, etc.
        */}
        <link
          rel="apple-touch-icon"
          href="/icons/apple-touch-icon-180x180.png"
          sizes="180x180"
        />
        {/* Add other Apple touch icon sizes as needed */}

        {/* Generic icon links (can point to the same files as in manifest) */}
        <link
          rel="icon"
          type="image/png"
          sizes="192x192"
          href="/icons/icon-192x192.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="512x512"
          href="/icons/icon-512x512.png"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <InvestmentProvider>
              <LanguageProvider>
                <LanguageInitializer />
                <PageViewTrackerWrapper />
                <SidebarProvider defaultOpen={true}>
                  <FirebaseIntegrations>{children}</FirebaseIntegrations>
                </SidebarProvider>
              </LanguageProvider>
              <Toaster />
            </InvestmentProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
