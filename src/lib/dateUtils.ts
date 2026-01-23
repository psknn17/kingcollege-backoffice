import { format as dateFnsFormat } from "date-fns";
import { th, enUS } from "date-fns/locale";

type Language = "en" | "th";

let currentLanguage: Language = "en";

export const setDateLocale = (lang: Language) => {
  currentLanguage = lang;
};

export const getDateLocale = () => {
  return currentLanguage === "th" ? th : enUS;
};

export const formatDate = (
  date: Date | number | string,
  formatStr: string,
  options?: { locale?: typeof th | typeof enUS }
): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const locale = options?.locale || getDateLocale();
  return dateFnsFormat(dateObj, formatStr, { locale });
};

// Hook-friendly version for components
export const createDateFormatter = (language: Language) => {
  const locale = language === "th" ? th : enUS;
  return (date: Date | number | string, formatStr: string): string => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateFnsFormat(dateObj, formatStr, { locale });
  };
};

// Export locales for direct use
export { th, enUS };
