import { defineRouting } from "next-intl/routing";

export const SUPPORTED_LOCALES = ["en", "el"] as const;

export const routing = defineRouting({
  locales: SUPPORTED_LOCALES, 
  defaultLocale: "el",
  localeDetection: true,
});