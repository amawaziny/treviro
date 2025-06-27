import Link from "next/link";
import { Coins } from "lucide-react"; // Using Coins as a generic logo
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserNav } from "@/components/auth/user-nav";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { LanguageToggle } from "./language-toggle"; // Added import
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowLeft, ArrowRight } from "lucide-react"; // Added import
import { Button } from "@/components/ui/button"; // Added import
import { useLanguage } from "@/contexts/language-context";
import { useForm } from "@/contexts/form-context";

export function Header() {
  const isMobile = useIsMobile();
  const { language, t } = useLanguage();
  const { headerProps } = useForm();

  const {
    showBackButton = false,
    backHref = "/dashboard",
    backLabel = t("back"),
    title = "",
    showNavControls = true,
  } = headerProps;
  const BackArrowIcon = language === "ar" ? ArrowRight : ArrowLeft;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <div className="flex items-center gap-4">
          {!isMobile && !showBackButton && (
            <SidebarTrigger className="md:hidden" />
          )}

          {showBackButton && !showNavControls ? (
            <div className="flex items-center gap-4">
              <Link
                href={typeof backHref === "string" ? backHref : "#"}
                onClick={typeof backHref === "function" ? backHref : undefined}
                className="flex items-center hover:opacity-80 transition-opacity"
              >
                <Button variant="ghost" size="icon" className="h-9 w-9 p-0">
                  <BackArrowIcon className="h-4 w-4" />
                  <span className="sr-only">{backLabel}</span>
                </Button>
              </Link>
              {title && (
                <h1 className="text-md font-semibold text-foreground">
                  {isMobile && title.length > 20
                    ? `${title.substring(0, 20)}...`
                    : title}
                </h1>
              )}
            </div>
          ) : (
            <Link
              href="/dashboard"
              className="flex items-center justify-start gap-2"
            >
              <Coins className="h-7 w-7 text-primary" />
              <span className="text-2xl font-bold text-primary">
                {t("app_name")}
              </span>
            </Link>
          )}
        </div>
        {showNavControls && (
          <div className="flex flex-1 items-center justify-end">
            <nav className="flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
              <UserNav />
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
