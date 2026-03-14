import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { setRequestLocale, getMessages } from "next-intl/server";
import { headers } from "next/headers";
import { Roboto } from "next/font/google";
import { routing } from "@/lib/i18n/routing";
import { Providers } from "@/components/providers";
import { BaseLayoutProps } from "@/types/page-props";
import { getTenantByDomain, getFirstActiveTenant } from "@/lib/tenant/resolve";
import { setCurrentTenant } from "@/lib/tenant/context";
import { generateBrandStyles } from "@/lib/tenant/brand-styles";
import { TenantProvider } from "@/components/tenant-provider";
import { SwRegister } from "@/components/sw-register";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "App",
  description: "",
};

export const generateStaticParams = () => {
  return routing.locales.map((locale) => ({ locale }));
};

const LocaleLayout = async ({ children, params }: BaseLayoutProps) => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();

  // Resolve tenant from domain header
  const headerList = await headers();
  const host = headerList.get("x-tenant-host") || "localhost:3000";

  let tenant = await getTenantByDomain(host);

  // Fallback for dev: use first active tenant
  if (!tenant && process.env.NODE_ENV === "development") {
    tenant = await getFirstActiveTenant();
  }

  // Set tenant in server context if found
  if (tenant) {
    setCurrentTenant(tenant);
  }

  const brandStyles = tenant ? generateBrandStyles(tenant.config) : "";

  const tenantContextValue = tenant
    ? {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        logo: tenant.config?.logo ?? null,
        logoSmall: tenant.config?.logoSmall ?? null,
        primaryColor: tenant.config?.primaryColor ?? "#000000",
        secondaryColor: tenant.config?.secondaryColor ?? "#ffffff",
        accentColor: tenant.config?.accentColor ?? "#3b82f6",
        currency: tenant.currency,
        timezone: tenant.timezone,
        prepTimeMinutes: tenant.prepTimeMinutes,
        isPaused: tenant.isPaused,
      }
    : null;

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {brandStyles && <style>{brandStyles}</style>}
      </head>
      <body className={`${roboto.variable} font-sans antialiased`}>
        <SwRegister />
        <Providers messages={messages} locale={locale}>
          {tenantContextValue ? (
            <TenantProvider value={tenantContextValue}>
              {children}
            </TenantProvider>
          ) : (
            children
          )}
        </Providers>
      </body>
    </html>
  );
};

export default LocaleLayout;
