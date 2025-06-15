"use client";

import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
} from "react";

// Define the shape of our translation data
interface Translations {
  [key: string]: string;
}

// Define the shape of our language context
interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<string>("en"); // Default language
  const [translations, setTranslations] = useState<Translations>({});

  const fetchTranslations = useCallback(async (lang: string) => {
    try {
      const response = await fetch(`/locales/${lang}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load translations for ${lang}`);
      }
      const data = await response.json();
      setTranslations(data);
    } catch (error) {
      console.error("Error fetching translations:", error);
      // Fallback to English or show an error message
      if (lang !== "en") {
        // If fetching for a non-default language fails, try English
        fetchTranslations("en");
      }
    }
  }, []);

  useEffect(() => {
    // Attempt to load language from localStorage
    const storedLang = localStorage.getItem("language");
    if (storedLang) {
      setLanguageState(storedLang);
      fetchTranslations(storedLang);
    } else {
      // If no language stored, fetch default English
      fetchTranslations("en");
    }
  }, [fetchTranslations]);

  const setLanguage = useCallback(
    (lang: string) => {
      setLanguageState(lang);
      localStorage.setItem("language", lang); // Store preferred language
      fetchTranslations(lang);
    },
    [fetchTranslations],
  );

  const t = useCallback(
    (key: string): string => {
      return translations[key] || key; // Return key if translation not found
    },
    [translations],
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
