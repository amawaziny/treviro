"use client";

import { useEffect } from "react";
import { useLanguage } from "@/contexts/language-context";

export function LanguageInitializer() {
  const { language } = useLanguage();

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  return null; // This component doesn't render anything visible
}
