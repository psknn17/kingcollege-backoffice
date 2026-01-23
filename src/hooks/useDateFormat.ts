import { useMemo } from "react";
import { format as dateFnsFormat } from "date-fns";
import { th, enUS } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";

export const useDateFormat = () => {
  const { language } = useLanguage();

  const locale = useMemo(() => {
    return language === "th" ? th : enUS;
  }, [language]);

  const formatDate = useMemo(() => {
    return (date: Date | number | string, formatStr: string): string => {
      if (!date) return "";
      const dateObj = typeof date === "string" ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return "";
      return dateFnsFormat(dateObj, formatStr, { locale });
    };
  }, [locale]);

  return { formatDate, locale };
};

export default useDateFormat;
