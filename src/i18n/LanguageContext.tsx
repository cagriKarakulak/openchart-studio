import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { SupportedLanguage, TranslationDictionary, LanguageOption, SUPPORTED_LANGUAGES } from './types';
import { tr } from './translations/tr';
import { en } from './translations/en';
import { es } from './translations/es';
import { de } from './translations/de';
import { fr } from './translations/fr';
import { ru } from './translations/ru';
import { zh } from './translations/zh';

const TRANSLATIONS: Record<SupportedLanguage, TranslationDictionary> = {
  tr,
  en,
  es,
  de,
  fr,
  ru,
  zh,
};

const STORAGE_KEY = 'openchart_language';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: TranslationDictionary;
  languages: LanguageOption[];
  currentLanguageOption: LanguageOption;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as SupportedLanguage;
      if (saved && TRANSLATIONS[saved]) {
        return saved;
      }
      // Check browser language
      const navLang = navigator.language.slice(0, 2).toLowerCase();
      if (navLang in TRANSLATIONS) {
        return navLang as SupportedLanguage;
      }
    } catch {
      // ignore
    }
    return 'tr';
  });

  const setLanguage = (newLang: SupportedLanguage) => {
    if (TRANSLATIONS[newLang]) {
      setLanguageState(newLang);
      try {
        localStorage.setItem(STORAGE_KEY, newLang);
        document.documentElement.lang = newLang;
      } catch {
        // ignore
      }
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useMemo(() => {
    return TRANSLATIONS[language] || TRANSLATIONS.en;
  }, [language]);

  const currentLanguageOption = useMemo(() => {
    return SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];
  }, [language]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        languages: SUPPORTED_LANGUAGES,
        currentLanguageOption,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
