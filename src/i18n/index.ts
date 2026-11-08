import { SupportedLanguage, TranslationDictionary, SUPPORTED_LANGUAGES, LanguageOption } from './types';
import { tr } from './translations/tr';
import { en } from './translations/en';
import { es } from './translations/es';
import { de } from './translations/de';
import { fr } from './translations/fr';
import { ru } from './translations/ru';
import { zh } from './translations/zh';

export const TRANSLATIONS: Record<SupportedLanguage, TranslationDictionary> = {
  tr,
  en,
  es,
  de,
  fr,
  ru,
  zh,
};

export * from './types';
export * from './LanguageContext';
